// Deterministic scalar noise for S-studio pieces. Integer hashing keeps
// precision at kilometre coordinates (the sin() hash streaks there).
export function random(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash2(ix, iz, seed = 0) {
  let h = Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iz | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const fade = (t) => t * t * (3 - 2 * t);

export function noise(x, z, seed = 0) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = fade(x - ix), fz = fade(z - iz);
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed), c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz;
}

// Rotated octaves hide the value-noise lattice.
export function fbm(x, z, octaves = 4, seed = 0) {
  let v = 0, amp = 0.5, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * noise(x, z, seed + i * 17);
    total += amp;
    const nx = x * 0.8 - z * 0.6, nz = x * 0.6 + z * 0.8;
    x = nx * 2.03 + 3.1;
    z = nz * 2.03 + 1.7;
    amp *= 0.5;
  }
  return v / total;
}

// 1 on crests, 0 in valleys.
export function ridged(x, z, octaves = 4, seed = 0) {
  let v = 0, amp = 0.5, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += amp * (1 - Math.abs(noise(x, z, seed + i * 31) * 2 - 1));
    total += amp;
    const nx = x * 0.8 - z * 0.6, nz = x * 0.6 + z * 0.8;
    x = nx * 2.1 + 5.3;
    z = nz * 2.1 + 2.9;
    amp *= 0.5;
  }
  return v / total;
}

// Nearest-feature cellular distance: [f1, f2, cell hash].
export function cellular(x, z, seed = 0, jitter = 1) {
  const ix = Math.floor(x), iz = Math.floor(z);
  let f1 = 9, f2 = 9, id = 0;
  for (let dz = -1; dz <= 1; dz++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx, cz = iz + dz;
      const px = cx + 0.5 + (hash2(cx, cz, seed) - 0.5) * jitter, pz = cz + 0.5 + (hash2(cx, cz, seed + 7) - 0.5) * jitter;
      const d = Math.hypot(px - x, pz - z);
      if (d < f1) { f2 = f1; f1 = d; id = hash2(cx, cz, seed + 13); } else if (d < f2) f2 = d;
    }
  return [f1, f2, id];
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const deg = (d) => (d * Math.PI) / 180;

// Periodic contour radius for an irregular closed outline: broad lobes plus hashed jags.
export function lobedRadius(angle, r, { seed = 1, lobes = 0.08, jag = 0.05, notch = 0.1, sides = 96, stretch = [1, 1] } = {}) {
  const step = (Math.PI * 2) / sides;
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const i = Math.floor(a / step), t = (a - i * step) / step;
  const rad = (k) => {
    const q = ((k % sides) + sides) % sides, qa = q * step;
    const n = hash2(q, 3, seed) < 0.14 ? notch * hash2(q, 5, seed) : 0;
    return 1 + lobes * (Math.cos(qa * 2 + seed) * 0.6 + Math.sin(qa * 3 + seed * 1.7) * 0.4) + jag * (hash2(q, 7, seed) - 0.5) - n;
  };
  const ca = Math.cos(a) / stretch[0], sa = Math.sin(a) / stretch[1];
  return (r * (rad(i) * (1 - t) + rad(i + 1) * t)) / Math.sqrt(ca * ca + sa * sa);
}

// Distance from point to a polyline; returns [distance, t-along (0..1), signed side].
export function polylineDistance(points, x, z) {
  let best = Infinity, bestT = 0, side = 1, acc = 0, total = 0;
  const lengths = [];
  for (let i = 0; i < points.length - 1; i++) {
    const l = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
    lengths.push(l);
    total += l;
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const vx = bx - ax, vz = bz - az, l2 = vx * vx + vz * vz || 1;
    const t = clamp(((x - ax) * vx + (z - az) * vz) / l2);
    const px = ax + vx * t, pz = az + vz * t, d = Math.hypot(x - px, z - pz);
    if (d < best) { best = d; bestT = (acc + t * lengths[i]) / (total || 1); side = vx * (z - az) - vz * (x - ax) >= 0 ? 1 : -1; }
    acc += lengths[i];
  }
  return [best, bestT, side];
}

// Catmull-Rom resample of a control polyline into a dense smooth path.
export function smoothPath(points, perSegment = 12) {
  if (points.length < 3) return points.map((p) => [...p]);
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < perSegment; k++) {
      const t = k / perSegment, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push([...points[points.length - 1]]);
  return out;
}
