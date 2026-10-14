import * as THREE from "three";
import { random, smoothstep } from "../../studio/core/noise.js";
import { gradSdf } from "./terrain.js";

// Placement of scan-derived pieces on the layout:
//   walls  - San Gabriel / Poly Haven wall modules stood along every plate edge, scaled to the local scarp height;
//   blocks - Poly Haven cliff chunks and boulders toppled onto the talus and matrix;
//   rocks  - Poly Haven rock scans scattered as ice debris (instanced).

export const PLACE_DEFAULTS = {
  wallOverlap: 0.45, wallDepth: 0.55, lean: 5, sink: 0.12, minWidth: 50, maxWidth: 120, wallOut: 1,
  blocks: 80, blockSize: [14, 52], blockReach: 55, slabs: 18,
  talusRocks: 12000, plainRocks: 6000, lipRocks: 900, rockSize: [1.2, 17],
};

const v3 = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(), M = new THREE.Matrix4();

export function placeWalls(L, lines, walls, { seed = 3, ...o } = {}) {
  o = { ...PLACE_DEFAULTS, ...o };
  const rng = random(seed), out = [];
  for (const line of lines) {
    // cumulative arc length
    const acc = [0];
    for (let k = 1; k < line.length; k++) acc.push(acc[k - 1] + Math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]));
    const total = acc[acc.length - 1];
    let a = rng() * 20;
    while (a < total) {
      let k = 1; while (k < acc.length - 1 && acc[k] < a) k++;
      const t = (a - acc[k - 1]) / Math.max(1e-6, acc[k] - acc[k - 1]);
      const x = line[k - 1][0] + (line[k][0] - line[k - 1][0]) * t, z = line[k - 1][1] + (line[k][1] - line[k - 1][1]) * t;
      const [gx, gz] = gradSdf(L, x, z, 10), nx = -gx, nz = -gz; // outward
      const top = L.parts(x - nx * 14, z - nz * 14).top, foot = L.height(x + nx * 22, z + nz * 22);
      const drop = top - foot;
      const w = walls[Math.floor(rng() * walls.length)];
      if (drop < 25) { a += 12; continue; }
      const sy = (drop * (1.04 + rng() * 0.08)) / w.size[1] / (1 - o.sink);
      let sx = sy * (0.85 + rng() * 0.5);
      sx = Math.min(o.maxWidth / w.size[0], Math.max(o.minWidth / w.size[0], sx));
      const sz = sy * o.wallDepth * (0.8 + rng() * 0.4);
      const flip = rng() < 0.5 ? -1 : 1;
      const base = foot - drop * o.sink * (1 - o.sink);
      out.push({ name: w.name, x: x + nx * o.wallOut, y: base, z: z + nz * o.wallOut, yaw: Math.atan2(nx, nz) + (rng() - 0.5) * 0.12, lean: -THREE.MathUtils.degToRad(o.lean * (0.6 + rng() * 0.8)), sx: sx * flip, sy, sz, drop });
      a += w.size[0] * Math.abs(sx) * o.wallOverlap;
    }
  }
  return out;
}

export function wallMatrix(p, m = new THREE.Matrix4()) {
  e.set(p.lean, p.yaw, 0, "YXZ");
  q.setFromEuler(e);
  return m.compose(v3.set(p.x, p.y, p.z), q, s3.set(p.sx, p.sy, p.sz));
}

// Points just outside the edges, with outward normal and local scarp height.
function edgeSamples(L, lines) {
  const pts = [];
  for (const line of lines) for (const [x, z] of line) {
    const [gx, gz] = gradSdf(L, x, z, 10), q = L.parts(x + gx * 10, z + gz * 10);
    pts.push({ x, z, nx: -gx, nz: -gz, drop: Math.max(0, q.top - L.height(x - gx * 14, z - gz * 14)) });
  }
  return pts.filter((p) => p.drop > 25);
}

export function placeBlocks(L, lines, blocks, { seed = 5, ...o } = {}) {
  o = { ...PLACE_DEFAULTS, ...o };
  const rng = random(seed), pts = edgeSamples(L, lines), out = [];
  if (!pts.length) return out;
  const n = o.blocks + o.slabs;
  for (let i = 0; i < n; i++) {
    const p = pts[Math.floor(rng() * pts.length)], slab = i >= o.blocks;
    const d = slab ? 12 + rng() * 22 : 14 + -Math.log(1 - rng() * 0.98) * o.blockReach * (p.drop / 140);
    const lat = (rng() - 0.5) * 30;
    const x = p.x + p.nx * d - p.nz * lat, z = p.z + p.nz * d + p.nx * lat;
    if (L.sdfAt(x, z) > -6) continue;
    const b = slab ? blocks.find((k) => k.name === "namaqualand_cliff_02") || blocks[0] : blocks[Math.floor(rng() * blocks.length)];
    const size = slab ? p.drop * (0.28 + rng() * 0.22) : o.blockSize[0] + Math.pow(rng(), 1.6) * (o.blockSize[1] - o.blockSize[0]) * Math.min(1.3, p.drop / 120);
    const k = size / Math.max(...b.size);
    // toppled: big random tilt; slabs lean back against the scarp
    const yaw = slab ? Math.atan2(p.nx, p.nz) + Math.PI / 2 + (rng() - 0.5) * 0.6 : rng() * Math.PI * 2;
    const tiltX = slab ? -(0.5 + rng() * 0.5) : (rng() - 0.5) * 1.6, tiltZ = slab ? (rng() - 0.5) * 0.3 : (rng() - 0.5) * 1.6;
    const y = L.height(x, z) - size * (slab ? 0.12 : 0.22);
    out.push({ name: b.name, x, y, z, yaw, tiltX, tiltZ, k: k * (rng() < 0.5 ? 1 : 1), slab });
  }
  return out;
}

export function blockMatrix(p, m = new THREE.Matrix4()) {
  e.set(p.tiltX, p.yaw, p.tiltZ, "YXZ");
  q.setFromEuler(e);
  return m.compose(v3.set(p.x, p.y, p.z), q, s3.set(p.k, p.k * 0.85, p.k));
}

// Rock scatter as {name -> [Matrix4]}.
export function placeRocks(L, lines, rocks, { seed = 9, ...o } = {}) {
  o = { ...PLACE_DEFAULTS, ...o };
  const rng = random(seed), pts = edgeSamples(L, lines), out = Object.fromEntries(rocks.map((r) => [r.name, []]));
  const add = (x, z, size, sinkK = 0.25) => {
    const r = rocks[Math.floor(rng() * rocks.length)];
    const k = size / Math.max(...r.size);
    e.set((rng() - 0.5) * 0.8, rng() * Math.PI * 2, (rng() - 0.5) * 0.8, "YXZ");
    q.setFromEuler(e);
    const y = L.height(x, z) - size * sinkK;
    out[r.name].push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q.clone(), new THREE.Vector3(k, k * (0.7 + rng() * 0.5), k)));
  };
  const sz = (lo, hi, pw) => lo + Math.pow(rng(), pw) * (hi - lo);
  if (pts.length) {
    for (let i = 0; i < o.talusRocks; i++) {
      const p = pts[Math.floor(rng() * pts.length)];
      const reach = 120 * Math.min(1.4, p.drop / 130);
      const d = 4 + Math.pow(rng(), 1.7) * reach, lat = (rng() - 0.5) * 12;
      const x = p.x + p.nx * d - p.nz * lat, z = p.z + p.nz * d + p.nx * lat;
      if (L.sdfAt(x, z) > -3) continue;
      // bigger debris rolls further (sorting on the apron)
      const f = d / reach;
      add(x, z, sz(o.rockSize[0], o.rockSize[1] * (0.45 + 0.9 * f), 3));
    }
    for (let i = 0; i < o.lipRocks; i++) {
      const p = pts[Math.floor(rng() * pts.length)], d = 3 + rng() * 45;
      const x = p.x - p.nx * d, z = p.z - p.nz * d;
      if (L.sdfAt(x, z) < 3) continue;
      add(x, z, sz(0.6, 5, 3.5), 0.35);
    }
  }
  const half = L.size / 2;
  for (let i = 0; i < o.plainRocks; i++) {
    const x = (rng() * 2 - 1) * half, z = L.z0 + rng() * L.size;
    if (L.sdfAt(x, z) > -3) continue;
    add(x, z, sz(0.8, 6, 3.2), 0.3);
  }
  return out;
}
export { smoothstep };
