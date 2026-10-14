import * as THREE from "three";

// Quadtree terrain: offline-decimated, error-bounded meshes per node (scripts/io/a/bake_mesh.py).
// Each frame a node is drawn when its screen-space error is below `tau` pixels, otherwise its four
// children are visited. Skirts baked into every node hide cracks between nodes of different levels.
export class QuadTerrain {
  constructor(meta, buffers, material) {
    this.meta = meta;
    this.group = new THREE.Group();
    this.group.name = "terrain";
    this.material = material;
    this.tau = 8;
    this.cliffBackingTau = 12; // loose ground only; scan walls have independent LOD
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

  setCliffBacking(segments) {
    // Scope the proxy LOD to nodes intersecting a native band and its
    // 100 m upper-apron neighbourhood. Near-wall proxy detail stays unchanged.
    for (const m of this.nodes.values()) {
      const n = m.userData.node;
      m.userData.cliffBacking = n.L >= 3 && segments.some((s) => Math.hypot(
        Math.max(n.x0 - s.cx, 0, s.cx - n.x0 - n.side),
        Math.max(n.z0 - s.cz, 0, s.cz - n.z0 - n.side)) <= s.rad + 100);
    }
  }

  setScanWallCoverage(placements) {
    // Remove heightfield cliff-band faces where the true 3D kit covers them.
    // Spatial bins bound the search, including the widest panel's overlap.
    const bins = new Map();
    for (const p of placements.instances) {
      const [x,z] = p.lip, key = `${Math.floor(x/256)},${Math.floor(z/256)}`;
      if (!bins.has(key)) bins.set(key, []);
      bins.get(key).push(p);
    }
    for (const mesh of this.nodes.values()) {
      const geometry = mesh.geometry, positions = geometry.attributes.position.array;
      const original = geometry.index.array, kept = [];
      const n = mesh.userData.node;
      const outwardNormals = new Float32Array(positions.length);
      for (let k=0; k<positions.length; k+=3) {
        const x=positions[k], y=positions[k+1], z=positions[k+2];
        const bx=Math.floor(x/256), bz=Math.floor(z/256);
        let found=false;
        for (let dx=-1; dx<=1 && !found; dx++) for (let dz=-1; dz<=1 && !found; dz++) {
          for (const p of bins.get(`${bx+dx},${bz+dz}`) || []) {
            const contact=p.talusY ?? p.footY+25;
            const ox=x-p.lip[0], oz=z-p.lip[1], nx=p.outward[0], nz=p.outward[2];
            if (Math.abs(ox*nz-oz*nx)>p.widthM*.53 || ox*nx+oz*nz < -64 || ox*nx+oz*nz>85 || y>p.topY-1 || y<contact+1) continue;
            outwardNormals[k]=nx; outwardNormals[k+2]=nz; found=true; break;
          }
        }
      }
      geometry.setAttribute('aCliffOutward',new THREE.BufferAttribute(outwardNormals,3));
      let cut = 0;
      for (let i = 0; i < original.length; i += 3) {
        const ids = [original[i], original[i+1], original[i+2]];
        const x = ids.reduce((s,k)=>s+positions[k*3],0)/3;
        const y = ids.reduce((s,k)=>s+positions[k*3+1],0)/3;
        const z = ids.reduce((s,k)=>s+positions[k*3+2],0)/3;
        let covered = false;
        const bx = Math.floor(x/256), bz = Math.floor(z/256);
        for (let dx=-1; dx<=1 && !covered; dx++) for (let dz=-1; dz<=1 && !covered; dz++) {
          for (const p of bins.get(`${bx+dx},${bz+dz}`) || []) {
            const contact=p.talusY ?? p.footY+25;
            const ox=x-p.lip[0], oz=z-p.lip[1], nx=p.outward[0], nz=p.outward[2];
            const along=Math.abs(ox*nz-oz*nx), outward=ox*nx+oz*nz;
            if (along>p.widthM*.51 || outward<-64 || outward>75 || y>p.topY+1 || y<contact-1) continue;
            // Cut covered steep interiors by centroid and retain gentle
            // plateau/talus triangles. Scan walls are separate geometry.
            const a=ids[0]*3,b=ids[1]*3,c=ids[2]*3;
            const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
            const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
            const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
            if (Math.abs(cy)/Math.max(Math.hypot(cx,cy,cz),1e-9)<.45) {
              covered = true; break;
            }
          }
        }
        if (covered) cut++; else kept.push(...ids);
      }
      geometry.setIndex(new THREE.BufferAttribute(new original.constructor(kept), 1));
      mesh.userData.removedWallTriangles = cut + (n.removedWallTriangles || 0);
      mesh.userData.cliffBacking = n.L>=3 && placements.instances.some(p=>Math.hypot(
        Math.max(n.x0-p.lip[0],0,p.lip[0]-n.x0-n.side),
        Math.max(n.z0-p.lip[1],0,p.lip[1]-n.z0-n.side))<350);
    }
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
      const tau = m.userData.cliffBacking && d >= 900 ? this.cliffBackingTau : this.tau;
      if (L < this.maxLevel && sse > tau && this.nodes.has(`${L + 1}/${i * 2}/${j * 2}`)) {   // pruned children: draw self
        for (let jj = 0; jj < 2; jj++) for (let ii = 0; ii < 2; ii++) visit(L + 1, i * 2 + ii, j * 2 + jj);
      } else {
        m.visible = true;
        this.visible.push(m);
      }
    };
    visit(0, 0, 0);
  }

  // Match Three.js sphere culling and include seam-hiding skirts.
  countTriangles(frustum) {
    let t = 0, nodes = 0;
    for (const m of this.visible) {
      if (frustum.intersectsSphere(m.geometry.boundingSphere)) { t += m.geometry.index.count / 3; nodes++; }
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
