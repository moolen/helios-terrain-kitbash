import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { loadBinary } from "./binary.js";

// Instanced scan meshes from the Mars asset kit ([path removed]; scripts/mm/mm-cerberus/bake_rocks.py +
// bake_scatter.py). Instances are stored sorted by size; whenever the camera moves, each instance is kept
// if its projected size is above ~1.8 px. Close instances (> 90 px) use the kit GLB _LOD0 (~2000 tris, own
// regraded scan albedo + normal); the rest use the kit's _LOD1 (~500) / _LOD2 (~100) shapes with a shader
// tinted to the scan's mean colour. All get a Mars dust coat on upward faces, stronger on dusty ground.
const COAT_GLSL = /* glsl */ `
uniform sampler2D tMA;
uniform float uSize, uCoat;
uniform vec3 cDustTop;
varying vec3 vWPos; varying vec3 vWN; varying float vTone;
`;
const VERT = (s) => s
  .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying vec3 vWN; varying float vTone;")
  .replace("#include <begin_vertex>", `#include <begin_vertex>
    vec4 wp_ = modelMatrix * instanceMatrix * vec4(transformed, 1.);
    vWPos = wp_.xyz; vWN = normalize(mat3(modelMatrix * instanceMatrix) * objectNormal);
    vTone = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);`);
// Mars dust settles on the upward faces of every rock, more where the ground is dusty
const COAT = `
  vec2 muv_ = (vWPos.xz + uSize * .5) / uSize;
  vec4 MA_ = texture2D(tMA, muv_);
  float up_ = smoothstep(.45, .9, normalize(vWN).y) * uCoat;
  // round 2: graded toward the talus colour (dust-coated basalt, not black dots) and dustier tops
  float lum_ = dot(diffuseColor.rgb, vec3(.3, .55, .15));
  diffuseColor.rgb = mix(diffuseColor.rgb, cDustTop * (.55 + 1.6 * lum_) * (.85 + .3 * vTone), .42);
  diffuseColor.rgb = mix(diffuseColor.rgb, cDustTop * (.9 + .25 * vTone), up_ * (.45 + .4 * MA_.g));`;
const AO = `#include <aomap_fragment>
  float skyv_ = texture2D(tMA, (vWPos.xz + uSize * .5) / uSize).r;
  reflectedLight.indirectDiffuse *= mix(1., skyv_, .8) * (.5 + .5 * smoothstep(-.4, .6, normalize(vWN).y));
  reflectedLight.directSpecular *= .35;`;

export async function buildScatter(base, meta, csm, tex) {
  const sm = await fetch(base + "scatter/scatter.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!sm || !tex) return null;
  const rocks = sm.rocks;
  const nr = rocks.length;
  const loader = new GLTFLoader();
  const [buf, ...parts] = await Promise.all([
    loadBinary(base + "scatter/scatter.bin"),
    ...rocks.map((r) => loader.loadAsync(base + "scatter/" + r.glb)),
    ...rocks.map((r) => fetch(base + "scatter/" + r.lod1).then((x) => readAssetBinary(x))),
    ...rocks.map((r) => fetch(base + "scatter/" + r.lod2).then((x) => readAssetBinary(x))),
    ...rocks.map((r) => fetch(base + "scatter/" + (r.lod3 || r.lod2)).then((x) => readAssetBinary(x))),
  ]);
  const A = new Float32Array(buf);
  const N = sm.count, S = sm.stride;
  const shared = { tMA: { value: tex.ma }, uSize: { value: meta.size }, cDustTop: { value: new THREE.Color(0xa57a59) } };
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
    const sink = -r.min[1] - (r.sink ?? 0.12) * (r.max[1] - r.min[1]);
    let mesh = null;
    parts[i].scene.traverse((o) => { if (o.isMesh && (o.name.endsWith("LOD0") || o.parent?.name?.endsWith("LOD0")) && !mesh) mesh = o; });
    if (!mesh) parts[i].scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    parts[i].scene.updateMatrixWorld(true);
    const g0 = mesh.geometry.clone();
    g0.applyMatrix4(mesh.matrixWorld);
    g0.translate(0, sink, 0);
    const m0 = mesh.material.clone();
    m0.side = THREE.FrontSide;
    m0.roughness = 0.85;
    const coat = 1;
    m0.customProgramCacheKey = () => "mmc-rock0";
    const tone = "1.0";
    setup(m0, coat, `diffuseColor.rgb *= (.8 + .4 * vTone) * ${tone};`);
    const lodGeo = (b) => {
      const hd = new Uint32Array(b, 0, 2);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b, 8, hd[0] * 3), 3));
      g.setIndex(new THREE.BufferAttribute(new Uint16Array(b, 8 + hd[0] * 12, hd[1]), 1));
      g.computeVertexNormals();
      g.translate(0, sink, 0);
      return g;
    };
    const g1 = lodGeo(parts[nr + i]), g2 = lodGeo(parts[2 * nr + i]), g3 = lodGeo(parts[3 * nr + i]);
    const c = r.meanLinear;
    const m1 = new THREE.MeshStandardMaterial({ color: new THREE.Color(c[0], c[1], c[2]), roughness: 0.88, metalness: 0 });
    m1.customProgramCacheKey = () => "mmc-rock1";
    setup(m1, coat, `diffuseColor.rgb *= (.8 + .4 * vTone) * ${tone};`);
    geos[i] = [[g0, m0], [g1, m1], [g2, m1], [g3, m1]];
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
  const lastRotation = new THREE.Quaternion();
  const viewFrustum = new THREE.Frustum(), viewMatrix = new THREE.Matrix4(), instanceSphere = new THREE.Sphere();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sv = new THREE.Vector3();
  let lastK = 0;
  const api = {
    group,
    tau: 2.2,
    lod0Px: 90,
    update(camera, force) {
      const cp = camera.position;
      const K = (window.mmc?.renderer?.domElement.height || 941) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      if (!force && cp.distanceTo(last) < Math.max(4, 0.02 * Math.abs(cp.y)) && lastK === K && camera.quaternion.angleTo(lastRotation) < .005) return;
      last.copy(cp); lastRotation.copy(camera.quaternion); lastK = K;
      viewMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      viewFrustum.setFromProjectionMatrix(viewMatrix);
      const cnt = meshes.map((ls) => ls.map(() => 0));
      const sel = [];
      for (let i = 0; i < N; i++) {
        const o = i * S;
        const dx = A[o] - cp.x, dy = A[o + 1] - cp.y, dz = A[o + 2] - cp.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const px = (A[o + 6] * K) / Math.max(d, 1);
        if (px < this.tau) continue;
        // InstancedMesh disables object culling: select individual rocks here.
        // Keep nearby off-screen casters so shadows crossing the edge survive.
        instanceSphere.center.set(A[o], A[o + 1], A[o + 2]); instanceSphere.radius = A[o + 6] + 64;
        if (!viewFrustum.intersectsSphere(instanceSphere)) continue;
        const t = A[o + 7], l = px > this.lod0Px ? 0 : px > 16 ? 1 : px > 7.5 ? 2 : 3;
        E.set(A[o + 4], A[o + 3], A[o + 5], "YXZ");
        Q.setFromEuler(E);
        const k = A[o + 6] / rocks[t].maxExtent;
        Sv.set(k * (0.85 + 0.3 * ((i * 7) % 10) / 10), k * (0.75 + 0.35 * ((i * 3) % 10) / 10), k);
        P.set(A[o], A[o + 1], A[o + 2]);
        M.compose(P, Q, Sv);
        meshes[t][l].setMatrixAt(cnt[t][l]++, M);
        sel.push(i, t, l);
      }
      for (let t = 0; t < nr; t++) for (let l = 0; l < 4; l++) {
        meshes[t][l].count = cnt[t][l];
        meshes[t][l].instanceMatrix.needsUpdate = true;
      }
      this.sel = sel;
    },
    countTriangles() {
      let tris = 0, inst = 0;
      if (!group.visible || !this.sel) return { tris, instances: inst };
      for (let k = 0; k < this.sel.length; k += 3) {
        const t = this.sel[k + 1], l = this.sel[k + 2];
        tris += meshes[t][l].geometry.index.count / 3; inst++;
      }
      return { tris, instances: inst };
    },

  };
  return api;
}
