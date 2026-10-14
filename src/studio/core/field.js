// A brief's pieces compose into one scalar field: height plus material masks.
// Pieces apply in brief order (first = bottom). Each sample mutates a shared
// accumulator, so later pieces can carve, cover or repaint earlier ones.
export const MASKS = ["bright", "dark", "bowl", "rock", "strata", "ice", "sand", "apron"];

const BUCKET = 64;

export function emptySample() {
  return { h: 0, bright: 0, dark: 0, bowl: 0, rock: 0, strata: 0, ice: 0, sand: 0, apron: 0 };
}

export class Field {
  constructor(instances) {
    this.instances = instances;
    this.global = [];
    this.buckets = new Map();
    this.holes = instances.filter((p) => p.hole);
    this.blockers = instances.filter((p) => p.blocks);
    instances.forEach((p, order) => {
      p.order = order;
      if (!p.sample) return;
      if (!p.bounds) { this.global.push(p); return; }
      const [x0, z0, x1, z1] = p.bounds;
      for (let gz = Math.floor(z0 / BUCKET); gz <= Math.floor(z1 / BUCKET); gz++)
        for (let gx = Math.floor(x0 / BUCKET); gx <= Math.floor(x1 / BUCKET); gx++) {
          const key = gx * 100003 + gz;
          if (!this.buckets.has(key)) this.buckets.set(key, []);
          this.buckets.get(key).push(p);
        }
    });
    for (const [key, list] of this.buckets) this.buckets.set(key, [...this.global, ...list].sort((a, b) => a.order - b.order));
    this.empty = this.global;
    this.acc = emptySample();
    this.limit = Infinity;
    // Pieces that depend on what lies beneath them (pads, levels) see only lower layers.
    for (const p of instances) if (p.prepare) { this.limit = p.order; p.prepare(this); this.limit = Infinity; }
  }
  piecesAt(x, z) {
    return this.buckets.get(Math.floor(x / BUCKET) * 100003 + Math.floor(z / BUCKET)) || this.global;
  }
  // Full sample into a reusable accumulator (copy it if you keep it).
  sample(x, z, out = this.acc) {
    for (const k in out) out[k] = 0;
    for (const p of this.piecesAt(x, z)) {
      if (p.order >= this.limit) break;
      const b = p.bounds;
      if (b && (x < b[0] || x > b[2] || z < b[1] || z > b[3])) continue;
      p.sample(x, z, out, this);
    }
    return out;
  }
  height(x, z) {
    return this.sample(x, z).h;
  }
  // Signed distance to the nearest true hole (negative inside). Holes are
  // openings closed by a piece's own wall mesh, e.g. a collapse pit.
  hole(x, z) {
    let d = Infinity;
    for (const p of this.holes) {
      const b = p.holeBounds || p.bounds;
      if (b && (x < b[0] - 4 || x > b[2] + 4 || z < b[1] - 4 || z > b[3] + 4)) continue;
      d = Math.min(d, p.hole(x, z));
    }
    return d;
  }
  // Scatter guard: holes, clear pads and any piece that rejects loose rock.
  blocked(x, z, margin = 0.8) {
    if (this.hole(x, z) < margin) return true;
    for (const p of this.blockers) if (p.blocks(x, z)) return true;
    return false;
  }
  slope(x, z, e = 1.5) {
    const hx = this.height(x + e, z) - this.height(x - e, z), hz = this.height(x, z + e) - this.height(x, z - e);
    return Math.hypot(hx, hz) / (2 * e);
  }
}
