import * as THREE from "three";

// Quadtree terrain: offline-decimated, error-bounded meshes per node (scripts/io/b/bake_mesh.py).
// Each frame a node is drawn when its screen-space error is below `tau` pixels, otherwise its four
// children are visited. Skirts baked into every node hide cracks between nodes of different levels.
export class QuadTerrain {
  constructor(meta, buffers, material) {
    this.meta = meta;
    this.group = new THREE.Group();
    this.group.name = "terrain";
    this.material = material;
    this.tau = 1.6;
    this.nodes = new Map();
    this.maxLevel = meta.levels - 1;
    const { hmin, hmax } = meta;
    const h0 = meta.h0 ?? 1000;   // mesh heights are absolute elevations; the world y axis is elevation - h0
    for (const n of meta.nodes) {
      const buf = buffers[n.L];
      const q = new Uint16Array(buf, n.voff, n.vcount * 3);
      const pos = new Float32Array(n.vcount * 3);
      const s = n.side / 65535, hs = (hmax - hmin) / 65535;
      for (let k = 0; k < n.vcount; k++) {
        pos[k * 3] = n.x0 + q[k * 3] * s;
        pos[k * 3 + 1] = hmin - h0 + q[k * 3 + 2] * hs;
        pos[k * 3 + 2] = n.z0 + q[k * 3 + 1] * s;
      }
      const idx = n.i32 ? new Uint32Array(buf, n.ioff, n.icount) : new Uint16Array(buf, n.ioff, n.icount);
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setIndex(new THREE.BufferAttribute(idx, 1)); // (a, c, b) grid winding is counter-clockwise seen from +y
      g.computeVertexNormals();
      g.boundingBox = new THREE.Box3(new THREE.Vector3(n.x0, n.ymin - h0 - 10, n.z0), new THREE.Vector3(n.x0 + n.side, n.ymax - h0, n.z0 + n.side));
      g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(g, material);
      m.castShadow = true;
      m.receiveShadow = true;
      m.matrixAutoUpdate = false;
      m.visible = false;
      m.userData.node = n;
      this.group.add(m);
      this.nodes.set(`${n.L}/${n.i}/${n.j}`, m);
    }
    this.visible = [];
  }

  setMaterial(mat) {
    for (const m of this.nodes.values()) m.material = mat;
  }

  update(camera, viewportHeight) {
    const K = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    const p = camera.position;
    for (const m of this.visible) m.visible = false;
    this.visible = [];
    const visit = (L, i, j) => {
      const m = this.nodes.get(`${L}/${i}/${j}`);
      const n = m.userData.node;
      const b = m.geometry.boundingBox;
      const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x);
      const dy = Math.max(b.min.y - p.y, 0, p.y - b.max.y);
      const dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
      const d = Math.max(1, Math.hypot(dx, dy, dz));
      const sse = (n.err * K) / d;
      if (L < this.maxLevel && sse > this.tau) {
        for (let jj = 0; jj < 2; jj++) for (let ii = 0; ii < 2; ii++) visit(L + 1, i * 2 + ii, j * 2 + jj);
      } else {
        m.visible = true;
        this.visible.push(m);
      }
    };
    visit(0, 0, 0);
  }

  // triangles of the selected nodes inside a frustum (skirts excluded)
  countTriangles(frustum) {
    let t = 0, nodes = 0;
    for (const m of this.visible) {
      if (frustum.intersectsBox(m.geometry.boundingBox)) { t += m.userData.node.faces; nodes++; }
    }
    return { tris: t, nodes };
  }
}

// CPU height lookup from the coarse heightfield written by the bake (used for cameras, particles, UI).
export class HeightField {
  constructor(meta, buf) {
    this.n = meta.n; this.size = meta.size; this.data = new Float32Array(buf);
  }
  at(x, z) {
    const n = this.n, f = (n - 1) / this.size;
    const c = THREE.MathUtils.clamp((x + this.size / 2) * f, 0, n - 1.001), r = THREE.MathUtils.clamp((z + this.size / 2) * f, 0, n - 1.001);
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0, d = this.data;
    const a = d[r0 * n + c0], b = d[r0 * n + c0 + 1], e = d[(r0 + 1) * n + c0], g = d[(r0 + 1) * n + c0 + 1];
    return (a * (1 - fc) + b * fc) * (1 - fr) + (e * (1 - fc) + g * fc) * fr;
  }
}
