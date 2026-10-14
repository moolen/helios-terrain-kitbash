import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Instanced scan meshes from the Io asset kit (scripts/io/c/bake_rocks.py + bake_scatter.py).
// Instances are stored sorted by size; whenever the camera moves, each instance is kept if its
// projected size is above ~1.3 px. Close instances (> 30 px) use the kit GLB (LOD0, ~2.6k tris, own
// scan albedo and normal map); the rest use a ~180-tri decimated copy with a triplanar basalt shader
// tinted to the scan's mean colour. Both get a sulfur / frost coat on upward faces from the baked
// deposit map, except the Dallol mounds and the sulfur block, which are deposits themselves.
const COAT_GLSL = /* glsl */ `
uniform sampler2D tMB, tMA;
uniform float uSize, uDeposit, uCoat;
varying vec3 vWPos; varying vec3 vWN; varying float vTone;
vec3 dallolR(float h) {
  vec3 c = mix(vec3(.86, .85, .80), vec3(.88, .82, .45), smoothstep(.0, .25, h));
  c = mix(c, vec3(.84, .70, .12), smoothstep(.25, .5, h));
  c = mix(c, vec3(.86, .34, .05), smoothstep(.5, .75, h));
  return mix(c, vec3(.62, .13, .04), smoothstep(.75, 1., h));
}
`;
const VERT = (s) => s
  .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN; varying float vTone;")
  .replace("#include <begin_vertex>", `#include <begin_vertex>
    vec4 wp_ = modelMatrix * instanceMatrix * vec4(transformed, 1.);
    vWPos = wp_.xyz; vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
    vTone = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`);
const COAT = `
  vec2 muv_ = (vWPos.xz + uSize * .5) / uSize;
  vec4 MB_ = texture2D(tMB, muv_);
  float up_ = smoothstep(.35, .85, normalize(vWN).y) * uCoat;
  float dp_ = MB_.r * uDeposit * up_;
  diffuseColor.rgb = mix(diffuseColor.rgb, dallolR(MB_.g) * .8, smoothstep(.2, .6, dp_) * .85);
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.82, .81, .78), smoothstep(.3, .7, MB_.b * uDeposit * up_) * .8);`;
const AO = `#include <aomap_fragment>
  float skyv_ = texture2D(tMA, (vWPos.xz + uSize * .5) / uSize).r;
  reflectedLight.indirectDiffuse *= mix(1., skyv_, .8) * (.55 + .45 * smoothstep(-.4, .6, normalize(vWN).y));`;

export async function buildScatter(base, meta, csm, tex) {
  const sm = await fetch(base + "scatter/scatter.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!sm || !tex) return null;
  const rocks = sm.rocks;
  const nr = rocks.length;
  const loader = new GLTFLoader();
  const [buf, ...parts] = await Promise.all([
    fetch(base + "scatter/scatter.bin").then((r) => readAssetBinary(r)),
    ...rocks.map((r) => loader.loadAsync(base + "scatter/" + r.glb)),
    ...rocks.map((r) => fetch(base + "scatter/" + r.lod1).then((x) => readAssetBinary(x))),
    ...rocks.map((r) => fetch(base + "scatter/" + r.lod2).then((x) => readAssetBinary(x))),
  ]);
  const A = new Float32Array(buf);
  const N = sm.count, S = sm.stride;
  const shared = { tMB: { value: tex.mb }, tMA: { value: tex.ma }, uSize: { value: 7168 }, uDeposit: { value: 1 } };
  const setup = (mat, coat, extraFrag) => {
    const u = { ...shared, uCoat: { value: coat } };
    const hook = (sh) => {
      Object.assign(sh.uniforms, u);
      sh.vertexShader = VERT(sh.vertexShader);
      sh.fragmentShader = sh.fragmentShader
        .replace("#include <common>", "#include <common>\n" + COAT_GLSL)
        .replace("#include <map_fragment>", "#include <map_fragment>\n" + (extraFrag || "") + COAT)
        .replace("#include <aomap_fragment>", AO);
    };
    csm.setupMaterial(mat);
    const h0 = mat.onBeforeCompile;
    mat.onBeforeCompile = (s, r) => { h0(s, r); hook(s); };
    return mat;
  };
  const geos = [];
  for (let i = 0; i < nr; i++) {
    const r = rocks[i];
    const sink = -r.min[1] - 0.12 * (r.max[1] - r.min[1]);
    let mesh = null;
    parts[i].scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    const g0 = mesh.geometry.clone();
    g0.applyMatrix4(mesh.matrixWorld);
    g0.translate(0, sink, 0);
    const m0 = mesh.material.clone();
    m0.side = THREE.FrontSide;
    m0.roughness = 0.85;
    const coat = r.group === "mound" || r.group === "sulfur" ? 0 : 1;
    m0.customProgramCacheKey = () => "io-c-rock0-" + coat;
    setup(m0, coat, "diffuseColor.rgb *= .8 + .4 * vTone;");
    const lodGeo = (b) => {
      const hd = new Uint32Array(b, 0, 2);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b, 8, hd[0] * 3), 3));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(b, 8 + hd[0] * 12, hd[1]), 1));
      g.computeVertexNormals();
      g.translate(0, sink, 0);
      return g;
    };
    const g1 = lodGeo(parts[nr + i]), g2 = lodGeo(parts[2 * nr + i]);
    const c = r.meanLinear;
    const m1 = new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0], c[1], c[2]), roughness: 0.88, metalness: 0 });
    m1.customProgramCacheKey = () => "io-c-rock1-" + coat;
    setup(m1, coat, "diffuseColor.rgb *= .8 + .4 * vTone;");
    geos[i] = [[g0, m0], [g1, m1], [g2, m1]];
  }
  const group = new THREE.Group();
  group.name = "scatter";
  const perType = new Array(nr).fill(0);
  for (let i = 0; i < N; i++) perType[A[i * S + 7]]++;
  const meshes = [];
  for (let t = 0; t < nr; t++) {
    meshes[t] = geos[t].map(([g, m]) => {
      const im = new THREE.InstancedMesh(g, m, Math.max(1, perType[t]));
      im.count = 0;
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(im);
      return im;
    });
  }
  const last = new THREE.Vector3(1e9, 0, 0);
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sv = new THREE.Vector3();
  let lastK = 0;
  const api = {
    group,
    tau: 1.3,
    lod0Px: 60,
    update(camera, force) {
      const cp = camera.position;
      const K = (window.ioc?.renderer?.domElement.height || 941) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      if (!force && cp.distanceTo(last) < Math.max(4, 0.02 * Math.abs(cp.y)) && lastK === K) return;
      last.copy(cp); lastK = K;
      const cnt = meshes.map((ls) => ls.map(() => 0));
      const sel = [];
      for (let i = 0; i < N; i++) {
        const o = i * S;
        const dx = A[o] - cp.x, dy = A[o + 1] - cp.y, dz = A[o + 2] - cp.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const px = (A[o + 6] * K) / Math.max(d, 1);
        if (px < this.tau) continue;
        const t = A[o + 7], l = px > this.lod0Px * (rocks[t].group === "mound" ? 2.5 : 1) ? 0 : px > 10 ? 1 : 2;
        E.set(A[o + 4], A[o + 3], A[o + 5], "YXZ");
        Q.setFromEuler(E);
        const k = A[o + 6] / rocks[t].maxExtent;
        const j = rocks[t].group === "mound" ? 1 : 1;
        Sv.set(k * (0.85 + 0.3 * ((i * 7) % 10) / 10) * j, k * (0.75 + 0.35 * ((i * 3) % 10) / 10), k);
        P.set(A[o], A[o + 1], A[o + 2]);
        M.compose(P, Q, Sv);
        meshes[t][l].setMatrixAt(cnt[t][l]++, M);
        sel.push(i, t, l);
      }
      for (let t = 0; t < nr; t++) for (let l = 0; l < 3; l++) {
        meshes[t][l].count = cnt[t][l];
        meshes[t][l].instanceMatrix.needsUpdate = true;
      }
      this.sel = sel;
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
      return { tris, instances: inst };
    },
    setDeposit(v) { shared.uDeposit.value = v; },
  };
  return api;
}
