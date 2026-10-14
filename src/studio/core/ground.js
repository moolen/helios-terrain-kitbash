import * as THREE from "three";
import { MASKS } from "./field.js";

// Axis coordinates: uniform spacing inside the focus span, geometric growth
// outside it up to the horizon extent. A tensor grid keeps rows aligned so
// fine near-field relief and cheap far-field relief share one mesh.
export function axis(lo, hi, spacing, extent, growth = 1.045) {
  const inner = [];
  const n = Math.max(2, Math.round((hi - lo) / spacing));
  for (let i = 0; i <= n; i++) inner.push(lo + ((hi - lo) * i) / n);
  const before = [], after = [];
  for (let s = spacing, x = lo; x > -extent; ) { s *= growth; x -= s; before.unshift(Math.max(x, -extent)); }
  for (let s = spacing, x = hi; x < extent; ) { s *= growth; x += s; after.push(Math.min(x, extent)); }
  return [...before, ...inner, ...after];
}

// Axis from spacing knots [[coord, spacing], ...]: spacing is interpolated
// between knots, then grows geometrically out to ±extent. Lets a brief keep a
// distant landmark (a far cliff wall) sharper than plain geometric growth would.
export function axisFromKnots(knots, extent, growth = 1.045) {
  const k = [...knots].sort((a, b) => a[0] - b[0]);
  const at = (c) => {
    if (c <= k[0][0]) return k[0][1];
    for (let i = 1; i < k.length; i++) if (c <= k[i][0]) { const t = (c - k[i - 1][0]) / (k[i][0] - k[i - 1][0]); return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * t; }
    return k[k.length - 1][1];
  };
  const lo = k[0][0], hi = k[k.length - 1][0], inner = [];
  for (let c = lo; c < hi - at(c) * 0.5; c += at(c)) inner.push(c);
  inner.push(hi);
  const before = [], after = [];
  for (let s = k[0][1], x = lo; x > -extent; ) { s *= growth; x -= s; before.unshift(Math.max(x, -extent)); }
  for (let s = k[k.length - 1][1], x = hi; x < extent; ) { s *= growth; x += s; after.push(Math.min(x, extent)); }
  return [...before, ...inner, ...after];
}

// Build the ground mesh. Triangles crossing a hole outline are clipped to the
// zero contour of the field's hole distance, so wall meshes can meet a crisp lip.
export function buildGround(field, ground) {
  const [fx0, fz0, fx1, fz1] = ground.focus;
  const xs = ground.xKnots ? axisFromKnots(ground.xKnots, ground.extent, ground.growth) : axis(fx0, fx1, ground.spacing, ground.extent, ground.growth);
  const zs = ground.zKnots ? axisFromKnots(ground.zKnots, ground.extent, ground.growth) : axis(fz0, fz1, ground.spacing, ground.extent, ground.growth);
  const nx = xs.length, nz = zs.length;
  const pos = [], masks = MASKS.map(() => []), sdf = [];
  const hasHoles = field.holes.length > 0;
  const push = (x, z) => {
    const s = field.sample(x, z);
    pos.push(x, s.h, z);
    MASKS.forEach((k, i) => masks[i].push(s[k]));
    return pos.length / 3 - 1;
  };
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      push(xs[i], zs[j]);
      if (hasHoles) sdf.push(field.hole(xs[i], zs[j]));
    }
  const index = [];
  const edgeCache = new Map();
  // Bisect the hole contour along an edge so the cut follows the true outline, not a lerp.
  const cut = (a, b) => {
    const key = a < b ? a * 4194304 + b : b * 4194304 + a;
    if (edgeCache.has(key)) return edgeCache.get(key);
    let ax = pos[a * 3], az = pos[a * 3 + 2], bx = pos[b * 3], bz = pos[b * 3 + 2];
    let da = sdf[a];
    for (let k = 0; k < 14; k++) {
      const mx = (ax + bx) / 2, mz = (az + bz) / 2, dm = field.hole(mx, mz);
      if ((dm > 0) === (da > 0)) { ax = mx; az = mz; da = dm; } else { bx = mx; bz = mz; }
    }
    const v = push((ax + bx) / 2, (az + bz) / 2);
    sdf.push(0);
    edgeCache.set(key, v);
    return v;
  };
  const tri = (a, b, c) => {
    if (!hasHoles) { index.push(a, b, c); return; }
    const ins = [sdf[a] <= 0, sdf[b] <= 0, sdf[c] <= 0], n = ins[0] + ins[1] + ins[2];
    if (n === 0) { index.push(a, b, c); return; }
    if (n === 3) return;
    const v = [a, b, c];
    // Rotate so v[0] is the odd one out.
    let r = 0;
    for (; r < 3; r++) if (ins[r] !== ins[(r + 1) % 3] && ins[r] !== ins[(r + 2) % 3]) break;
    const p = v[r], q = v[(r + 1) % 3], s = v[(r + 2) % 3];
    const pq = cut(p, q), ps = cut(p, s);
    if (n === 2) index.push(p, pq, ps); // p outside, keep its corner
    else index.push(pq, q, s, pq, s, ps); // p inside, keep the quad
  };
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const k = j * nx + i, l = k + 1, m = k + nx, o = m + 1;
      // Alternate diagonals to avoid a directional sawtooth on slopes.
      if ((i + j) & 1) { tri(k, m, l); tri(l, m, o); } else { tri(k, m, o); tri(k, o, l); }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const count = pos.length / 3, m0 = new Float32Array(count * 4), m1 = new Float32Array(count * 4);
  for (let v = 0; v < count; v++)
    for (let c = 0; c < 4; c++) {
      m0[v * 4 + c] = masks[c][v];
      m1[v * 4 + c] = masks[c + 4][v];
    }
  g.setAttribute("m0", new THREE.BufferAttribute(m0, 4));
  g.setAttribute("m1", new THREE.BufferAttribute(m1, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return { geometry: g, stats: { vertices: count, triangles: index.length / 3, nx, nz } };
}
