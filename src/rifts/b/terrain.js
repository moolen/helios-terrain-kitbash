import * as THREE from "three";
import { fbm, ridged, cellular, hash2, noise, smoothstep, clamp, lerp } from "../../studio/core/noise.js";

// Scene B heightfield: the DTM layout (real plate outlines, plate heights and trough relief from the
// DLR Conamara stereo DTM) composed with procedural detail.
//   - plate edges are made angular with Voronoi plan-view jogs (procedural);
//   - plate tops keep 35 % of the real DTM relief around the plate's real median height, plus
//     low Conamara-style ridge pairs (procedural);
//   - the matrix keeps the real DTM relief plus hummocky knobs (procedural);
//   - a talus apron rises against each scarp foot (procedural).

export const TERRAIN_DEFAULTS = {
  jog: 16, jogCell: 95, topRelief: 0.35, ridge: 1.4, knobs: 9, knobScale: 0.009,
  talusHeight: 0.26, talusWidth: 90, datum: 0, wallBack: 10, raftCell: 75, raftFrac: 0.36, jitter: 1.1,
};

// Voronoi with the nearest feature point (world units of the cell grid): [f1, f2, id, px, pz].
function voronoi(x, z, seed, jitter = 0.95) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let f1 = 9, f2 = 9, id = 0, px = 0, pz = 0;
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cz = iz + dz;
      const fx = cx + 0.5 + (hash2(cx, cz, seed) - 0.5) * jitter, fz = cz + 0.5 + (hash2(cx, cz, seed + 7) - 0.5) * jitter;
      const d = Math.hypot(fx - x, fz - z);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx, cz, seed + 13); px = fx; pz = fz; } else if (d < f2) f2 = d;
    }
  return [f1, f2, id, px, pz];
}

export class Layout {
  constructor(meta, buf, o = {}) {
    this.o = { ...TERRAIN_DEFAULTS, ...o };
    this.n = meta.n; this.cell = meta.cell; this.size = meta.size_m; this.meta = meta;
    const N = this.n * this.n, f = new Float32Array(buf);
    this.dtm = f.subarray(0, N); this.sdf0 = f.subarray(N, 2 * N); this.plate = f.subarray(2 * N, 3 * N); this.matrix = f.subarray(3 * N, 4 * N);
    // World placement: grid row i -> z, col j -> x; origin offset so the camera sits in the trough.
    this.x0 = -this.size / 2; this.z0 = -this.size / 2 - (o.zShift ?? 0);
    this.sdf = new Float32Array(N);
    for (let i = 0; i < this.n; i++)
      for (let j = 0; j < this.n; j++) {
        const x = this.x0 + j * this.cell, z = this.z0 + i * this.cell, k = i * this.n + j;
        this.sdf[k] = this.sdf0[k] + this.jog(x, z);
      }
  }
  // Plan-view jogs: constant offset per Voronoi cell, so the edge breaks into straight segments and steps.
  jog(x, z) {
    const o = this.o, c = cellular(x / o.jogCell, z / o.jogCell, 41, 0.9);
    const e = clamp((c[1] - c[0]) * 3); // soften right at cell borders so the contour stays connected
    return (c[2] - 0.5) * 2 * o.jog * (0.55 + 0.45 * e);
  }
  sample(arr, x, z) {
    const n = this.n, fx = clamp((x - this.x0) / this.cell, 0, n - 1.001), fz = clamp((z - this.z0) / this.cell, 0, n - 1.001);
    const j = Math.floor(fx), i = Math.floor(fz), u = fx - j, v = fz - i, k = i * n + j;
    return (arr[k] * (1 - u) + arr[k + 1] * u) * (1 - v) + (arr[k + n] * (1 - u) + arr[k + n + 1] * u) * v;
  }
  sdfAt(x, z) { return this.sample(this.sdf, x, z); }
  // Components of the height at a point.
  parts(x, z) {
    const o = this.o, d = this.sample(this.dtm, x, z), p = this.sample(this.plate, x, z), s = this.sdfAt(x, z), mx = this.sample(this.matrix, x, z);
    const knob = (fbm(x * o.knobScale, z * o.knobScale, 3, 9) - 0.5) * 2 * o.knobs + Math.pow(ridged(x * 0.014, z * 0.014, 2, 4), 3) * o.knobs * 0.9;
    // Chaos matrix rafts: small tilted ice blocks (30-110 m) standing 3-16 m out of the matrix, kept clear of the talus.
    let raft = 0;
    const base = Math.min(d, mx, p - 25), floor0 = base + knob;
    let floor = floor0;
    if (s < -60) {
      const c = voronoi(x / o.raftCell, z / o.raftCell, 77), id = c[2];
      if (id < o.raftFrac) {
        const edge = ((c[1] - c[0]) * o.raftCell) / 2, k = id / o.raftFrac;
        // flat, slightly tilted top at a fixed height over the smooth DTM floor (not over the knobs)
        // level top from the smooth floor at the raft's centre, with a small per-raft planar tilt
        const cx = c[3] * o.raftCell, cz = c[4] * o.raftCell;
        const b0 = Math.min(this.sample(this.dtm, cx, cz), this.sample(this.matrix, cx, cz), this.sample(this.plate, cx, cz) - 25);
        const ta = id * 97, tilt = (Math.cos(ta) * (x - cx) + Math.sin(ta) * (z - cz)) * 0.06 * (hash2(Math.floor(id * 1e6), 3, 1) - 0.3);
        const topR = Math.max(b0, base) + 4 + k * 12 + tilt;
        const m = smoothstep(1, 4, edge) * smoothstep(-60, -130, s);
        floor = floor0 + (Math.max(floor0, topR) - floor0) * m;
        raft = (floor - floor0);
      }
    }
    // Conamara ridged plains: two crossing sets of low double ridges.
    const r1 = Math.sin((x * 0.42 + z * 0.91) * 0.035 + fbm(x * 0.004, z * 0.004, 2, 3) * 9), r2 = Math.sin((x * 0.95 - z * 0.3) * 0.024 + fbm(x * 0.005, z * 0.005, 2, 5) * 7);
    const ridges = (Math.pow(Math.abs(r1), 12) + 0.6 * Math.pow(Math.abs(r2), 14)) * o.ridge;
    const top = p + o.topRelief * (d - p) + ridges + (fbm(x * 0.012, z * 0.012, 3, 2) - 0.5) * 3;
    return { d, p, s, floor, top, raft };
  }
  height(x, z) {
    const o = this.o, q = this.parts(x, z);
    // Talus apron: rises toward the scarp foot (a concave scree profile), irregular in plan.
    const drop = Math.max(0, q.top - q.floor);
    const w = o.talusWidth * (0.7 + 0.6 * fbm(x * 0.01, z * 0.01, 2, 8));
    const t = clamp(1 + Math.min(0, q.s) / w), apron = drop * o.talusHeight * Math.pow(t, 2.2) * (0.75 + 0.5 * fbm(x * 0.02, z * 0.02, 2, 6));
    // Within wallBack metres inside the edge the ground climbs steeply to the top: the backing behind the wall modules.
    const back = smoothstep(0, o.wallBack, q.s);
    return lerp(q.floor + apron, q.top, back) - o.datum;
  }
}

// Indexed grid mesh (flat shaded by the material); attribute `zone` = signed edge distance (m).
export function buildTerrain(L, { step = 1 } = {}) {
  const n = Math.floor((L.n - 1) / step) + 1, cs = L.cell * step;
  const pos = new Float32Array(n * n * 3), zone = new Float32Array(n * n), drop = new Float32Array(n * n), raft = new Float32Array(n * n);
  const J = L.o.jitter;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      const x = L.x0 + j * cs, z = L.z0 + i * cs, k = i * n + j;
      // small horizontal jitter breaks the regular grid faceting (S look); height is sampled at the moved point
      const jx = x + (hash2(i, j, 71) - 0.5) * 2 * J, jz = z + (hash2(i, j, 73) - 0.5) * 2 * J;
      pos[k * 3] = jx; pos[k * 3 + 1] = L.height(jx, jz); pos[k * 3 + 2] = jz;
      const q = L.parts(jx, jz);
      zone[k] = q.s; drop[k] = Math.max(0, q.top - q.floor); raft[k] = q.raft;
    }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6);
  let t = 0;
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < n - 1; j++) {
      const a = i * n + j, b = a + 1, c = a + n, d = c + 1;
      // alternate the diagonal for less directional faceting
      if ((i + j) & 1) { idx.set([a, c, b, b, c, d], t); } else { idx.set([a, c, d, a, d, b], t); }
      t += 6;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("zone", new THREE.BufferAttribute(zone, 1));
  g.setAttribute("drop", new THREE.BufferAttribute(drop, 1));
  g.setAttribute("raft", new THREE.BufferAttribute(raft, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  return g;
}

// Marching squares on the jogged sdf: polylines of the plate edges (world x/z), resampled every `step` m.
export function edgeLines(L, step = 6) {
  const n = L.n, s = L.sdf, cs = L.cell, segs = new Map(), key = (a) => `${a[0].toFixed(2)},${a[1].toFixed(2)}`;
  const P = (i, j) => [L.x0 + j * cs, L.z0 + i * cs];
  const cross = (i0, j0, i1, j1) => {
    const a = s[i0 * n + j0], b = s[i1 * n + j1], t = a / (a - b), p = P(i0, j0), q = P(i1, j1);
    return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  };
  const out = [];
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < n - 1; j++) {
      const c = [[i, j], [i, j + 1], [i + 1, j + 1], [i + 1, j]];
      const pts = [];
      for (let e = 0; e < 4; e++) {
        const [i0, j0] = c[e], [i1, j1] = c[(e + 1) % 4];
        if ((s[i0 * n + j0] >= 0) !== (s[i1 * n + j1] >= 0)) pts.push(cross(i0, j0, i1, j1));
      }
      if (pts.length === 2) out.push(pts);
      else if (pts.length === 4) out.push([pts[0], pts[1]], [pts[2], pts[3]]);
    }
  // chain segments
  const adj = new Map();
  out.forEach((sg, k) => sg.forEach((p) => { const kk = key(p); (adj.get(kk) || adj.set(kk, []).get(kk)).push(k); }));
  const used = new Uint8Array(out.length), lines = [];
  for (let k0 = 0; k0 < out.length; k0++) {
    if (used[k0]) continue;
    used[k0] = 1;
    let line = [out[k0][0], out[k0][1]];
    for (const dir of [1, 0]) {
      for (;;) {
        const end = dir ? line[line.length - 1] : line[0];
        const nb = (adj.get(key(end)) || []).find((k) => !used[k]);
        if (nb === undefined) break;
        used[nb] = 1;
        const sg = out[nb], nxt = key(sg[0]) === key(end) ? sg[1] : sg[0];
        if (dir) line.push(nxt); else line.unshift(nxt);
      }
    }
    if (line.length > 6) lines.push(line);
  }
  // resample by arc length
  return lines.map((line) => {
    const r = [line[0]];
    let acc = 0;
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1], b = line[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc += l;
      while (acc >= step) { acc -= step; const t = 1 - acc / l; r.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); }
    }
    return r;
  }).filter((l) => l.length > 4);
}

export function gradSdf(L, x, z, h = 4) {
  const gx = (L.sdfAt(x + h, z) - L.sdfAt(x - h, z)) / (2 * h), gz = (L.sdfAt(x, z + h) - L.sdfAt(x, z - h)) / (2 * h), l = Math.hypot(gx, gz) || 1;
  return [gx / l, gz / l];
}

export { hash2 };
