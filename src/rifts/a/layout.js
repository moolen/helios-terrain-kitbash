// Scene A layout: a branching Charon-style rift scaled to a ~2.2 km game map.
//
// Rhythm taken from the New Horizons Charon DEM (scripts/rifts/a/charon_profile.py ->
// public/rifts/a/charon_profile.json): a flat-to-V floor, steep walls (~39 deg at
// 300 m/px, near-vertical once resolved), a bench on ONE wall at 0.3-0.38 of the
// depth, and raised flanks just outside the rims. Here the trough is ~230 m rim to
// rim and 80 m deep (Charon: ~68 km and ~4.2 km), i.e. depth exaggerated ~5x for a
// readable game map. Branch geometry (a trunk splitting at ~35 deg plus a tapering
// side fissure) follows the fan of chasmata in the same crop. Not the DEM 1:1.
import { fbm, noise, smoothPath, clamp, smoothstep } from "../../studio/core/noise.js";

export const DEPTH = 80; // rim to floor, metres
export const BENCH = 0.36; // bench depth fraction (Charon median benches 0.29-0.38)
export const UPWARP = 9; // raised flank height (Charon flanks)

const B = (pts, o) => ({ path: smoothPath(pts, 10), ...o });
export const BRANCHES = [
  // trunk, west -> east, crosses the gameplay view
  B([[-4200, 120], [-2200, 20], [-1250, -40], [-700, -40], [-300, -62], [0, -78], [140, -96], [480, -215], [850, -310], [1250, -350], [2400, -300], [4200, -420]], { R: 138, D: 1, bench: -1, seed: 11, taper: [0, 0] }),
  // north-east branch splitting from the trunk at x~140
  B([[140, -96], [330, -300], [520, -560], [700, -830], [880, -1150], [1300, -2200], [1700, -4200]], { R: 96, D: 0.9, bench: 1, seed: 23, taper: [0.06, 0] }),
  // side fissure toward the camera-left foreground, tapering out
  B([[-250, -64], [-330, 40], [-410, 150], [-470, 260], [-520, 360]], { R: 62, D: 0.62, bench: 0, seed: 37, taper: [0.04, 0.85] }),
];

for (const b of BRANCHES) {
  b.seg = [];
  let L = 0;
  for (let i = 0; i < b.path.length - 1; i++) {
    const [ax, az] = b.path[i], [bx, bz] = b.path[i + 1];
    const l = Math.hypot(bx - ax, bz - az);
    b.seg.push({ ax, az, vx: bx - ax, vz: bz - az, l, s0: L });
    L += l;
  }
  b.length = L;
}

// Width/depth factor along a branch: join flare at the start, taper at the end.
function scaleAt(b, t) {
  const [t0, t1] = b.taper;
  let s = 1;
  if (t0 > 0) s *= 0.75 + 0.25 * smoothstep(0, t0, t);
  if (t1 > 0) s *= 1 - smoothstep(t1, 1, t) * 0.95;
  return s;
}
// Independent meander per wall (metres, positive = wall pushed outward).
export function meander(b, s, side) {
  const k = b.seed + (side > 0 ? 0 : 101);
  return 14 * (fbm(s / 170, k * 0.37, 3, k) - 0.5) * 2 + 4 * (noise(s / 38, k, k + 5) - 0.5) * 2;
}

function nearest(b, x, z) {
  let best = Infinity, bs = 0, side = 1, bi = 0;
  for (let i = 0; i < b.seg.length; i++) {
    const g = b.seg[i];
    const t = clamp(((x - g.ax) * g.vx + (z - g.az) * g.vz) / (g.l * g.l || 1));
    const px = g.ax + g.vx * t, pz = g.az + g.vz * t, d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < best) { best = d; bs = g.s0 + t * g.l; side = g.vx * (z - g.az) - g.vz * (x - g.ax) >= 0 ? 1 : -1; bi = i; }
  }
  return { d: Math.sqrt(best), s: bs, side, seg: bi };
}

// Cross-section (metres from centreline -> height). Returns geometry of the walls too.
export function section(b, s, side) {
  const t = s / b.length, k = scaleAt(b, t);
  const R = b.R * k, D = DEPTH * b.D * Math.sqrt(k);
  const F = 0.45 * R; // floor half width
  const wl = 7, wu = 6; // lower / upper wall run (near-vertical; scan modules cover them)
  const hasBench = b.bench === side || (b.bench === 0 && false);
  const bw = hasBench ? 0.2 * R : 5;
  const Bd = D * BENCH;
  const m = meander(b, s, side);
  const lowerAt = F + m, benchAt = F + wl + m, upperAt = F + wl + bw + m, rim = F + wl + bw + wu + m;
  return { R, D, F: F + m, Bd, lowerAt, benchAt, upperAt, rim, hasBench, wl, wu };
}

function profile(b, d, s, side) {
  const c = section(b, s, side);
  let h;
  if (d < c.lowerAt) h = -c.D + 1.5 * smoothstep(c.lowerAt - 25, c.lowerAt, d); // floor, talus rise to wall foot
  else if (d < c.benchAt) h = -c.D + 1.5 + (c.D - 1.5 - c.Bd) * smoothstep(c.lowerAt, c.benchAt, d);
  else if (d < c.upperAt) h = -c.Bd + 4 * (d - c.benchAt) / Math.max(1, c.upperAt - c.benchAt);
  else if (d < c.rim) h = -c.Bd + 4 + (c.Bd - 4) * smoothstep(c.upperAt, c.rim, d);
  else {
    const e = d - c.rim;
    h = UPWARP * b.D * (1 - Math.exp(-e / 14)) * Math.exp(-e / 160);
  }
  return h;
}

// Ground height and masks at (x, z).
// Lineae (Europa double ridges): analytic warped bands, mirrored exactly in the shader
// (materials.js, r_lin) so ridge relief and rust colour line up. Returns [core, halo, ridge].
export const LINEAE = [
  { a: 0.42, per: 520, w: 17, ph: 0.0, k: [0.0031, 0.0047, 0.011, 0.0063], amp: [70, 26] },
  { a: -1.05, per: 690, w: 13, ph: 0.37, k: [0.0026, -0.0038, 0.0092, -0.0071], amp: [80, 22] },
  { a: 1.9, per: 330, w: 6, ph: 0.74, k: [-0.0042, 0.0029, 0.0131, 0.0057], amp: [45, 14] },
];
export function lineae(x, z) {
  let core = 0, halo = 0, ridge = 0;
  for (const [i, L] of LINEAE.entries()) {
    const dx = Math.cos(L.a), dz = Math.sin(L.a);
    const g = x * dx + z * dz + L.amp[0] * Math.sin(x * L.k[0] + z * L.k[1] + i * 1.7) + L.amp[1] * Math.sin(x * L.k[2] + z * L.k[3] + i * 4.1);
    const f = g / L.per + L.ph, c = Math.abs(f - Math.floor(f) - 0.5) * L.per;
    const w = L.w * (0.65 + 0.55 * Math.sin(x * 0.0021 + z * 0.0017 + i * 2.3) * Math.sin(x * 0.0007 - z * 0.0013 + i));
    const on = clamp(0.5 + 0.8 * Math.sin((x * 0.6 - z * 0.8) * 0.004 + i * 3.3)); // ridges fade in and out along strike
    const cr = (1 - smoothstep(w * 0.35, w, Math.abs(c - w * 0.55))) * on * (i === 2 ? 0.6 : 1);
    core = Math.max(core, cr);
    halo = Math.max(halo, (1 - smoothstep(w, w * 4.5, c)) * (0.4 + 0.6 * on) * (i === 2 ? 0.45 : 1));
    // double crest with a median trough, ~4 m high on the main families
    ridge = Math.max(ridge, on * (i === 2 ? 0.6 : 2.2) * Math.exp(-(c * c) / (w * w * 0.9))); // single low swell
  }
  return [core, halo, ridge];
}

export function sample(x, z) {
  let h = Infinity, depthMask = 0, nearRim = 0;
  for (const b of BRANCHES) {
    const n = nearest(b, x, z);
    if (n.d > 700) { h = Math.min(h, 0); continue; }
    const p = profile(b, n.d, n.s, n.side);
    if (p < h) h = p;
    const c = section(b, n.s, n.side);
    nearRim = Math.max(nearRim, 1 - smoothstep(0, 60, Math.abs(n.d - c.rim)));
  }
  // Plateau: gentle long-wave relief + low pressure ridges; floor gets slab rubble relief.
  const plate = 5 * (fbm(x / 420, z / 420, 4, 3) - 0.5) + 1.2 * (fbm(x / 70, z / 70, 3, 9) - 0.5) + 0.8 * (noise(x / 14, z / 14, 2) - 0.5);
  const onFloor = smoothstep(-20, -60, h);
  const lin = lineae(x, z);
  const rimFade = h > -2 ? 1 : 0;
  h += plate * (1 - onFloor) + onFloor * 1.4 * (fbm(x / 22, z / 22, 2, 5) - 0.5) + lin[2] * rimFade;
  depthMask = clamp(-h / DEPTH);
  return { h, depthMask, nearRim };
}

// Wall lines for module placement: [{x, z, nx, nz (unit, toward rift centre), base, top, tier, branch}].
export function wallSlots() {
  const slots = [];
  for (const [bi, b] of BRANCHES.entries()) {
    for (const side of [1, -1]) {
      for (const tier of ["lower", "upper"]) {
        let s = 0;
        let i = 0;
        while (s < b.length) {
          const g = b.seg.find((q) => s >= q.s0 && s < q.s0 + q.l) || b.seg[b.seg.length - 1];
          const t = (s - g.s0) / g.l, cx = g.ax + g.vx * t, cz = g.az + g.vz * t;
          const tx = g.vx / g.l, tz = g.vz / g.l;
          // left normal (side +1 is where cross(v, p-a) >= 0, i.e. (-tz, tx))
          const nx = -tz * side, nz = tx * side;
          const c = section(b, s, side);
          const dist = tier === "lower" ? (c.lowerAt + c.benchAt) / 2 : (c.upperAt + c.rim) / 2;
          const base = tier === "lower" ? -c.D : -c.Bd + 3;
          const top = tier === "lower" ? -c.Bd : 0;
          slots.push({ x: cx + nx * dist, z: cz + nz * dist, nx: -nx, nz: -nz, tx: tx * side, tz: tz * side, base, top, tier, branch: bi, s, side, i: i++, R: c.R });
          s += 38 + 10 * noise(s * 0.05, bi * 7 + side, 3);
        }
      }
    }
  }
  return slots;
}
