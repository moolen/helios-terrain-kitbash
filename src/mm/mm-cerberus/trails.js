import * as THREE from "three";
import { loadBinary } from "./binary.js";

// Boulder trails (after the HiRISE DTEEC_017719 fossa walls): each fall boulder rolled down the steepest
// descent of the final DEM from the cliff-band foot (bake_scatter.py); the trail is a thin ribbon decal
// draped 0.25 m over the terrain, drawn as a chain of bounce marks (darker, dust-free gouges where the
// block hit the slope) with a faint continuous furrow between them. Fades with distance.
export async function buildTrails(base, csm) {
  const meta = await fetch(base + "scatter/trails.json").then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!meta || !meta.count) return null;
  const A = new Float32Array(await loadBinary(base + "scatter/trails.bin"));
  const S = meta.stride, n = meta.count;
  let pos = [], uv = [], idx = [];
  const buckets = new Map();
  let start = 0;
  const pushTrail = (a, b, stride) => {
    const samples = [];
    for (let k = a; k <= b; k += stride) samples.push(k);
    if (samples.at(-1) !== b) samples.push(b);
    // a..b inclusive vertex range of one trail
    const v0 = pos.length / 3;
    for (const k of samples) {
      const o = k * S;
      const kp = Math.max(a, k - 1) * S, kn = Math.min(b, k + 1) * S;
      let tx = A[kn] - A[kp], tz = A[kn + 2] - A[kp + 2];
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const w = A[o + 4] * 0.5;
      const fade = Math.min(1, (k - a) / 4);
      for (const sgn of [-1, 1]) {
        pos.push(A[o] - tz * w * sgn, A[o + 1] + 0.25, A[o + 2] + tx * w * sgn);
        uv.push(A[o + 3], sgn * 0.5 + 0.5 + fade * 0);
      }
    }
    for (let k = 0; k < samples.length - 1; k++) {
      const i0 = v0 + k * 2;
      idx.push(i0, i0 + 2, i0 + 1, i0 + 1, i0 + 2, i0 + 3);
    }
  };
  for (let k = 1; k <= n; k++) {
    if (k === n || A[k * S + 5] !== A[start * S + 5]) {
      if (k - 1 > start) {
        const mid = Math.floor((start + k - 1) / 2) * S;
        const key = `${Math.floor(A[mid] / 512)},${Math.floor(A[mid + 2] / 512)}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push([start, k - 1]);
      }
      start = k;
    }
  }
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a1d15, roughness: 0.95, metalness: 0, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const hook = (s) => {
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vT; varying float vCd;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvT = uv; vCd = length((modelMatrix * vec4(transformed, 1.)).xyz - cameraPosition);");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      varying vec2 vT; varying float vCd;
      float th(float x){ return fract(sin(x * 91.7) * 43758.5); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
      float along = vT.x, across = abs(vT.y - .5) * 2.;
      // bounce marks every 4-9 m: elongated pits
      float cell = floor(along / 6.5), f = fract(along / 6.5);
      float len = .25 + .3 * th(cell), off = .2 * th(cell + 3.);
      float mark = smoothstep(.0, .06, f - off) * smoothstep(len + off, len + off - .06, f) * (1. - smoothstep(.55, .95, across));
      float furrow = (1. - smoothstep(.1, .4, across)) * .25;
      float a = max(mark, furrow) * (1. - smoothstep(900., 2600., vCd));
      a *= smoothstep(0., 8., along);
      diffuseColor.a = a * .7;`);
  };
  csm.setupMaterial(mat);
  const h0 = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { h0(s, r); hook(s); };
  mat.customProgramCacheKey = () => "mmc-trails";
  const group = new THREE.Group(); group.name = "trails";
  for (const trails of buckets.values()) {
    for (const [lod, stride] of [1, 3, 8].entries()) {
      pos = []; uv = []; idx = [];
      for (const [a, b] of trails) pushTrail(a, b, stride);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      mesh.receiveShadow = true; mesh.renderOrder = 1;
      mesh.userData.trailLOD = lod; mesh.visible = false;
      group.add(mesh);
    }
  }
  group.userData.update = (camera) => {
    for (const mesh of group.children) {
      const d = mesh.geometry.boundingBox.distanceToPoint(camera.position);
      const lod = d < 450 ? 0 : d < 1100 ? 1 : 2;
      mesh.visible = d < 2600 && mesh.userData.trailLOD === lod;
    }
  };
  group.userData.countTriangles = (frustum) => group.children.reduce((sum, mesh) =>
    sum + (mesh.visible && frustum.intersectsSphere(mesh.geometry.boundingSphere) ? mesh.geometry.index.count / 3 : 0), 0);
  return group;
}
