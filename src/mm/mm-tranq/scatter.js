import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { shared, LUNAR_GLSL, lunarApply, TRI_GLSL, NOISE_GLSL } from "./material.js";

// Instanced lunar rocks (round 2). Boulders: the Moon kit's Apollo sample scans (NASA Astromaterials 3D, CC0) with their
// own LOD0/1/2 meshes and baked albedo + normal; rubble: Poly Haven moon rocks baked the same way. Every LOD keeps its
// texture (no flat-shaded stand-ins); the albedo is graded to regolith grey by the rock's measured mean. Rocks are
// sunk 18-30 % and get a regolith fillet (a low instanced mound shaded like the ground) so they sit in the soil.
// Instances are size-sorted; whenever the camera moves, each is kept if its projected size is above `tau` px.
const GLSL = /* glsl */ `
uniform sampler2D tMA; uniform float uSize, uGrade;
varying vec3 vWPos; varying vec3 vWN; varying float vTone;
`;
const VERT = (s) => s
  .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN; varying float vTone;")
  .replace("#include <begin_vertex>", `#include <begin_vertex>
    vec4 wp_ = modelMatrix * instanceMatrix * vec4(transformed, 1.);
    vWPos = wp_.xyz; vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
    vTone = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`);
const GRADE = `
  vec4 MA_ = texture2D(tMA, (vWPos.xz + uSize * .5) / uSize);
  float l_ = dot(diffuseColor.rgb, vec3(.3, .55, .15));
  diffuseColor.rgb = mix(vec3(l_), diffuseColor.rgb, .35) * uGrade * vec3(.97, .98, 1.) * (.8 + .4 * vTone) * (1. + .55 * MA_.g * uImmGain);
  // regolith dust on the upward faces
  float up_ = smoothstep(.55, .95, normalize(vWN).y);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .955, 1.) * .085 * (1. + .8 * MA_.g * uImmGain), up_ * .45);`;
const AO = `#include <aomap_fragment>
  reflectedLight.indirectDiffuse *= mix(1., MA_.r, .8) * (.45 + .55 * smoothstep(-.4, .6, normalize(vWN).y));
  ${lunarApply("normalize((vec4(normal, 0.) * viewMatrix).xyz)")}`;

// regolith fillet: shaded like the terrain's mare regolith (same scans, tint, halo mask)
const FILLET_FRAG = /* glsl */ `
  vec3 Ng_ = normalize(vWN);
  Tri T = triSetup(vWPos, Ng_);
  float l = mix(lum(triS(tAlb, T, 0., 1.).rgb), lum(triS(tAlb, T, 1., .25).rgb), .5);
  diffuseColor.rgb = vec3(.93, .955, 1.) * .40 * l * (1. + 1.25 * MA_.g * uImmGain);`;

export async function buildScatter(base, csm, tex) {
  const sm = await fetch(base + "scatter/scatter.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!sm || !tex) return null;
  const rocks = sm.rocks;
  const nr = rocks.length;
  const loader = new GLTFLoader();
  const [buf, ...parts] = await Promise.all([
    fetch(base + "scatter/scatter.bin").then((r) => readAssetBinary(r)),
    ...rocks.map((r) => loader.loadAsync(base + "scatter/" + r.glb)),
    ...rocks.map((r) => fetch(base + "scatter/" + r.lod3).then((x) => readAssetBinary(x))),
  ]);
  const gltfs = parts.slice(0, nr), lod3 = parts.slice(nr);
  const A = new Float32Array(buf);
  const N = sm.count, S = sm.stride;
  const withCsm = (mat, own, key) => {
    csm.setupMaterial(mat);
    const h0 = mat.onBeforeCompile;
    mat.onBeforeCompile = (s, r) => { h0(s, r); own(s); };
    mat.customProgramCacheKey = () => key;
    return mat;
  };
  const rockMat = (mat, meanLin, key) => {
    const u = { ...shared, tMA: { value: tex.ma }, uSize: { value: 12000 }, uGrade: { value: 0.105 / Math.max(meanLin, 0.02) } };
    return withCsm(mat, (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = VERT(sh.vertexShader);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + GLSL + "uniform float uImmGain;\n" + LUNAR_GLSL)
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + GRADE)
        .replace("#include <aomap_fragment>", AO);
    }, key);
  };
  const geos = [];
  for (let i = 0; i < nr; i++) {
    const r = rocks[i];
    const sink = -r.min[1];
    const scene = gltfs[i].scene;
    scene.updateMatrixWorld(true);
    geos[i] = r.lods.map((name, k) => {
      let mesh = null;
      scene.traverse((o) => { if (o.isMesh && (o.name === name || o.parent?.name === name) && !mesh) mesh = o; });
      if (!mesh) scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
      const g = mesh.geometry.clone();
      g.applyMatrix4(mesh.matrixWorld);
      g.translate(0, sink, 0);
      const m = mesh.material.clone();
      m.side = THREE.FrontSide; m.roughness = 1; m.metalness = 0; m.flatShading = false;
      rockMat(m, r.meanLinear, `mm-tranq-rock-${i}-${k}`);
      return [g, m];
    });
    // LOD3: ~24-tri silhouette with the rock's mean tone (rocks of a few pixels)
    const b = lod3[i], hd = new Uint32Array(b, 0, 2);
    const g3 = new THREE.BufferGeometry();
    g3.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b, 8, hd[0] * 3), 3));
    g3.setIndex(new THREE.BufferAttribute(new Uint16Array(b, 8 + hd[0] * 12, hd[1]), 1));
    g3.computeVertexNormals();
    g3.translate(0, sink, 0);
    const m3 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    rockMat(m3, 1.0, "mm-tranq-rock3");
    geos[i].push([g3, m3]);
  }
  // fillet geometry: unit-radius mound, h = 0.11 (1 - r)^2 * ..., 28 segments x 5 rings
  const fg = (() => {
    const seg = 28, rings = 5, pos = [0, 0.11, 0], idx = [];
    for (let k = 1; k <= rings; k++) {
      const r = k / rings, h = 0.11 * Math.pow(1 - r, 2) * (1 + 0.5 * (1 - r)) - 0.004;
      for (let s = 0; s < seg; s++) { const a = (s / seg) * Math.PI * 2; pos.push(Math.cos(a) * r, h, Math.sin(a) * r); }
    }
    for (let s = 0; s < seg; s++) idx.push(0, 1 + ((s + 1) % seg), 1 + s);
    for (let k = 1; k < rings; k++) for (let s = 0; s < seg; s++) {
      const a = 1 + (k - 1) * seg + s, b = 1 + (k - 1) * seg + ((s + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const rad = new Float32Array(pos.length / 3);
    for (let k = 0; k < rad.length; k++) rad[k] = Math.hypot(pos[k * 3], pos[k * 3 + 2]);
    g.setAttribute("rad", new THREE.BufferAttribute(rad, 1));
    return g;
  })();
  // dithered edge (alpha hash) so the fillet melts into the ground instead of reading as a disc
  const fmat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, alphaHash: true });
  {
    const u = { ...shared, tMA: { value: tex.ma }, uSize: { value: 12000 }, tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh }, uTile: { value: tex.tiles } };
    withCsm(fmat, (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = VERT(sh.vertexShader).replace("#include <common>", "#include <common>\nattribute float rad; varying float vRad;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvRad = rad;");
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + GLSL + "uniform float uImmGain; varying float vRad;\n" + NOISE_GLSL + TRI_GLSL + LUNAR_GLSL)
        .replace("#include <map_fragment>", "vec4 MA_ = texture2D(tMA, (vWPos.xz + uSize * .5) / uSize);\n" + FILLET_FRAG + "\ndiffuseColor.a = 1. - smoothstep(.35, .95, vRad);")
        .replace("#include <aomap_fragment>", `#include <aomap_fragment>
          reflectedLight.indirectDiffuse *= mix(1., MA_.r, .8);
          ${lunarApply("normalize((vec4(normal, 0.) * viewMatrix).xyz)")}`);
    }, "mm-tranq-fillet");
  }
  const group = new THREE.Group();
  group.name = "scatter";
  const perType = new Array(nr).fill(0);
  for (let i = 0; i < N; i++) perType[A[i * S + 7]]++;
  const meshes = [];
  for (let t = 0; t < nr; t++) {
    meshes[t] = geos[t].map(([g, m], l) => {
      const im = new THREE.InstancedMesh(g, m, Math.max(1, perType[t]));
      im.count = 0;
      im.castShadow = l < 2;            // LOD2/3 (small / far rocks) cast no shadow: they made a blotchy shadow carpet            // small / far rocks: no shadow casting (they made a blotchy shadow carpet)
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(im);
      return im;
    });
  }
  const fil = new THREE.InstancedMesh(fg, fmat, N);
  fil.count = 0; fil.castShadow = false; fil.receiveShadow = true; fil.frustumCulled = false;
  fil.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(fil);
  const last = new THREE.Vector3(1e9, 0, 0);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sv = new THREE.Vector3();
  let lastK = 0;
  const api = {
    group,
    tau: 0.45,
    lod0Px: 420,
    lod1Px: 130,
    lod2Px: 12,
    update(camera, force) {
      const cp = camera.position;
      const K = (window.mmt?.renderer?.domElement.height || 941) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      if (!force && cp.distanceTo(last) < Math.max(2, 0.02 * Math.abs(cp.y)) && lastK === K) return;
      last.copy(cp); lastK = K;
      const cnt = meshes.map((ls) => ls.map(() => 0));
      let nf = 0;
      const sel = [];
      for (let i = 0; i < N; i++) {
        const o = i * S;
        const dx = A[o] - cp.x, dy = A[o + 1] - cp.y, dz = A[o + 2] - cp.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const px = (A[o + 6] * K) / Math.max(d, 1);
        if (px < this.tau || (A[o + 6] < 0.75 && px < 2.2)) continue;   // rubble only where it reads
        const t = A[o + 7], l = px > this.lod0Px ? 0 : px > this.lod1Px ? 1 : px > this.lod2Px ? 2 : 3;
        E.set(A[o + 4], A[o + 3], A[o + 5], "YXZ");
        Q.setFromEuler(E);
        const k = A[o + 6] / rocks[t].maxExtent;
        const sy = 0.7 + 0.35 * ((i * 3) % 10) / 10;
        const sink = (0.18 + 0.12 * ((i * 7) % 5) / 5) * (rocks[t].max[1] - rocks[t].min[1]) * k * sy;
        Sv.set(k * (0.85 + 0.3 * ((i * 7) % 10) / 10), k * sy, k);
        P.set(A[o], A[o + 1] - sink, A[o + 2]);
        M.compose(P, Q, Sv);
        meshes[t][l].setMatrixAt(cnt[t][l]++, M);
        if (px > 6) {
          const fr = A[o + 6] * (0.5 + 0.15 * ((i * 11) % 7) / 7);
          Sv.set(fr, A[o + 6] * 0.9, fr);
          E.set(A[o + 4] * 0.6, A[o + 3], A[o + 5] * 0.6, "YXZ"); Q.setFromEuler(E);
          P.set(A[o], A[o + 1] - 0.02, A[o + 2]);
          M.compose(P, Q, Sv);
          fil.setMatrixAt(nf++, M);
        }
        sel.push(i, t, l);
      }
      for (let t = 0; t < nr; t++) for (let l = 0; l < 4; l++) {
        meshes[t][l].count = cnt[t][l];
        meshes[t][l].instanceMatrix.needsUpdate = true;
      }
      fil.count = nf; fil.instanceMatrix.needsUpdate = true;
      this.sel = sel; this.nFillets = nf;
    },
    countTriangles(frustum) {
      let tris = 0, inst = 0;
      if (!group.visible || !this.sel) return { tris, instances: inst };
      const sp = new THREE.Sphere();
      for (let k = 0; k < this.sel.length; k += 3) {
        const i = this.sel[k], t = this.sel[k + 1], l = this.sel[k + 2], o = i * S;
        sp.center.set(A[o], A[o + 1], A[o + 2]); sp.radius = A[o + 6];
        if (!frustum.intersectsSphere(sp)) continue;
        tris += meshes[t][l].geometry.index.count / 3; inst++;
      }
      tris += (this.nFillets || 0) * fg.index.count / 3 * 0.5;   // fillets (about half in view)
      return { tris, instances: inst };
    },
  };
  return api;
}
