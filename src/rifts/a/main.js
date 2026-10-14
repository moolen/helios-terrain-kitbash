// Scene A: ice rift canyon (Charon-style chasma with calving-front walls).
// Walls: Hornsund TLS 2023 (Hansbreen calving front) cut into faceted slab modules.
// Blocks: chunks cut from the Qeqertarsuaq iceberg UAV model. Layout: Charon DEM rhythm.
import * as THREE from "three";
import { Stage } from "../../studio/core/stage.js";
import { axis } from "../../studio/core/ground.js";
import { random, noise, clamp, smoothstep } from "../../studio/core/noise.js";
import { sample, wallSlots, BRANCHES, section, DEPTH } from "./layout.js";
import { iceMaterial } from "./materials.js";
import { buildSky } from "./sky.js";

const params = new URLSearchParams(location.search);
const capture = params.has("capture");
const W = Number(params.get("w") || 1672), H = Number(params.get("h") || 941);
const view = document.getElementById("view");
const stage = capture ? new Stage(view, { width: W, height: H, pixelRatio: 1 }) : new Stage(view);
window.__rift = { ready: false, frames: 0 };

export const VIEWS = {
  game: { position: [0, 150, 200], target: [0, 0, -14.2], fov: 78, shadowBox: [-420, -620, 420, 220] },
  close: { position: [-70, -60, -92], target: [-10, -48, -142], fov: 60, shadowBox: [-160, -280, 160, -40] },
  hero: { position: [-430, 120, 160], target: [150, -50, -200], fov: 55, shadowBox: [-900, -1100, 900, 500] },
};

const LIGHT = {
  azimuth: 62, elevation: 16, intensity: 5.0, colour: "#fff3e4",
  fill: 0.3, fillColour: "#e6b98c", fillAzimuth: -120, fillElevation: 30, // faint Jupiter shine
  hemi: 0.6, hemiSky: "#8aa6c8", hemiGround: "#62758c",
  exposure: 1.0, toneMapping: "aces", ao: 0.55, aoRadius: 4, shadowSoftness: 0.4, shadowIntensity: 0.86,
};

async function loadBin(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  const [nv, ni] = new Uint32Array(buf, 0, 2);
  const pos = new Float32Array(buf, 8, nv * 3);
  const idx = new Uint32Array(buf, 8 + nv * 12, ni * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos.slice(), 3));
  g.setIndex(new THREE.BufferAttribute(idx.slice(), 1));
  return g;
}
function facet(g, tint = [1, 1, 1]) {
  const n = g.index ? g.toNonIndexed() : g;
  n.computeVertexNormals();
  if (n.attributes.color) return n;
  const c = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < c.length; i += 3) c.set(tint, i);
  n.setAttribute("color", new THREE.BufferAttribute(c, 3));
  return n;
}

// ---------- ground ----------
function buildGround() {
  const xs = axis(-720, 720, 3.2, 6000, 1.045), zs = axis(-950, 640, 3.2, 6000, 1.045);
  const nx = xs.length, nz = zs.length;
  const pos = new Float32Array(nx * nz * 3);
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      // jitter the lattice so flat shading reads as irregular facets, not a grid
      const dx = (noise(i * 0.71, j * 0.53, 4) - 0.5) * 0.9 * (xs[Math.min(i + 1, nx - 1)] - xs[i]);
      const dz = (noise(i * 0.47, j * 0.83, 8) - 0.5) * 0.9 * (zs[Math.min(j + 1, nz - 1)] - zs[j]);
      const x = xs[i] + dx, z = zs[j] + dz;
      const s = sample(x, z);
      pos.set([x, s.h, z], (j * nx + i) * 3);
    }
  const idx = new Uint32Array((nx - 1) * (nz - 1) * 6);
  let k = 0;
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1;
      if ((i + j) & 1) idx.set([a, c, b, b, c, d], k);
      else idx.set([a, c, d, a, d, b], k);
      k += 6;
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, iceMaterial("ground"));
  mesh.receiveShadow = mesh.castShadow = true;
  return { mesh, tris: idx.length / 3 };
}

// ---------- scan wall modules ----------
function mirrorX(g) {
  const m = g.clone();
  const p = m.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, -p.getX(i));
  const idx = m.index.array;
  for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  return m;
}
const WALL_RADIUS = 2300; // modules beyond this read as heightfield wall only
async function buildWalls(rand) {
  const meta = await (await fetch("rifts/a/walls/walls.json")).json();
  const mods = meta.modules.filter((m) => m.coverage > 0.8);
  const raw = await Promise.all(mods.map(async (m) => {
    const g = await loadBin(`rifts/a/walls/${m.name}.bin`);
    // scan-derived cavity -> hydrated-salt staining in joints and undercuts
    const cav = new Float32Array(await (await fetch(`rifts/a/walls/${m.name}_cav.bin`)).arrayBuffer());
    const col = new Float32Array(cav.length * 3);
    for (let i = 0; i < cav.length; i++) {
      const k = Math.min(1, cav[i] * 1.2);
      col.set([1 - k * 0.2, 1 - k * 0.36, 1 - k * 0.5], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }));
  // 8 scan modules + their mirror images = 16 instanced wall meshes
  const geos = [...raw.map((g) => facet(g)), ...raw.map((g) => facet(mirrorX(g)))];
  const heights = [...mods, ...mods].map((m) => m.height);
  const lists = geos.map(() => []);
  let skipped = 0;
  const o = new THREE.Object3D();
  for (const slot of wallSlots()) {
    const wallH = slot.top - slot.base;
    if (wallH < 6 || Math.hypot(slot.x, slot.z + 200) > WALL_RADIUS) continue;
    // keep slots whose rift side is open and whose back is solid along the whole module width
    let bad = false;
    for (const t of [-28, 0, 28]) {
      const px = slot.x + slot.tx * t, pz = slot.z + slot.tz * t;
      if (sample(px + slot.nx * 14, pz + slot.nz * 14).h > slot.base + 0.45 * wallH) bad = true;
      if (sample(px - slot.nx * 16, pz - slot.nz * 16).h < slot.top - 6) bad = true;
    }
    if (bad) { skipped++; continue; }
    const gi = Math.floor(rand() * geos.length);
    const sy = (wallH * 1.08) / heights[gi];
    const sx = Math.min(sy, 1.6) * (0.85 + rand() * 0.3), sz = sy * 0.55;
    o.position.set(slot.x, slot.base - 0.06 * wallH, slot.z);
    o.rotation.set(0, Math.atan2(slot.nx, slot.nz) + (rand() - 0.5) * 0.1, 0);
    o.scale.set(sx, sy, sz);
    o.updateMatrix();
    lists[gi].push(o.matrix.clone());
  }
  const group = new THREE.Group();
  const mat = iceMaterial("wall");
  let tris = 0, placed = 0;
  geos.forEach((g, gi) => {
    if (!lists[gi].length) return;
    const im = new THREE.InstancedMesh(g, mat, lists[gi].length);
    lists[gi].forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
    tris += (g.attributes.position.count / 3) * lists[gi].length;
    placed += lists[gi].length;
  });
  return { group, tris, placed, skipped, modules: mods.length };
}

// ---------- blocks and slabs ----------
function slabGeometry(rand) {
  // broken plate: an irregular polygon prism with a tilted, faceted top
  const n = 5 + Math.floor(rand() * 4), pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const r = 0.65 + rand() * 0.35;
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r * (0.55 + rand() * 0.4)));
  }
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.16 + rand() * 0.1, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 1, steps: 1 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    p.setY(i, p.getY(i) + (noise(x * 2.1 + 5, z * 2.1, 7) - 0.5) * 0.08);
  }
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0);
  return facet(g.index ? g : g, [1, 1, 1]);
}

async function buildScatter(rand) {
  const meta = await (await fetch("rifts/a/ice/chunks.json")).json();
  const chunkGeos = await Promise.all(meta.chunks.map((c) => loadBin(`rifts/a/ice/${c.name}.bin`).then((g) => facet(g))));
  const slabGeos = Array.from({ length: 5 }, () => slabGeometry(rand));
  const blockMat = iceMaterial("block"), slabMat = iceMaterial("slab");
  const items = { chunk: chunkGeos.map(() => []), slab: slabGeos.map(() => []) };
  const tint = (r) => { const t = 0.95 + r * 0.12; return new THREE.Color(t * (0.96 + r * 0.04), t, t * (1.04 - r * 0.04)); };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const put = (kind, gi, x, z, size, { tilt = 0.3, sink = 0.2, flat = 1 } = {}) => {
    const s = sample(x, z);
    e.set((rand() - 0.5) * tilt, rand() * Math.PI * 2, (rand() - 0.5) * tilt);
    q.setFromEuler(e);
    sc.set(size * (0.8 + rand() * 0.4), size * flat * (0.7 + rand() * 0.5), size * (0.8 + rand() * 0.4));
    v.set(x, s.h - sink * sc.y, z);
    items[kind][gi].push({ m: m4.compose(v, q, sc).clone(), c: tint(rand()) });
  };
  for (const [bi, b] of BRANCHES.entries()) {
    const step = 6;
    for (let s0 = 0; s0 < b.length; s0 += step) {
      const g = b.seg.find((q2) => s0 >= q2.s0 && s0 < q2.s0 + q2.l) || b.seg[b.seg.length - 1];
      const t = (s0 - g.s0) / g.l, cx = g.ax + g.vx * t, cz = g.az + g.vz * t, tx = g.vx / g.l, tz = g.vz / g.l;
      const r0 = Math.hypot(cx, cz + 200);
      if (r0 > 2000 || (r0 > 1100 && rand() < 0.6)) continue;
      for (const side of [1, -1]) {
        const c = section(b, s0, side);
        const nx = -tz * side, nz = tx * side;
        // talus apron at the wall foot: dense scan chunks, biggest nearest the wall
        for (let k = 0; k < 3; k++) {
          const u = rand();
          const d = c.lowerAt - 2 - u * u * 26;
          const x = cx + nx * d + tx * (rand() - 0.5) * step, z = cz + nz * d + tz * (rand() - 0.5) * step;
          put("chunk", Math.floor(rand() * chunkGeos.length), x, z, (2 + (1 - u) * 6.5 * rand() + (rand() < 0.08 ? 6 : 0)) * Math.sqrt(b.D), { tilt: 0.9, sink: 0.25 });
        }
        // bench debris
        if (c.hasBench && rand() < 0.7) {
          const d = c.benchAt + 2 + rand() * (c.upperAt - c.benchAt - 4);
          put("chunk", Math.floor(rand() * chunkGeos.length), cx + nx * d, cz + nz * d, 1.5 + rand() * 4, { tilt: 0.7, sink: 0.3 });
        }
        // rim blocks: calved lip pieces just behind the rim
        if (rand() < 0.35) {
          const d = c.rim + 3 + rand() * 30;
          put("chunk", Math.floor(rand() * chunkGeos.length), cx + nx * d, cz + nz * d, 1.2 + rand() * 3.5, { tilt: 0.5, sink: 0.35 });
        }
      }
      // floor: broken slabs, some tilted up against each other
      const c0 = section(b, s0, 1), c1 = section(b, s0, -1);
      const nSlab = Math.round(2 + 2 * b.D);
      for (let k = 0; k < nSlab; k++) {
        const d = (rand() * 2 - 1);
        const off = d > 0 ? d * (c0.lowerAt - 6) : d * (c1.lowerAt - 6);
        const x = cx + -tz * off + tx * (rand() - 0.5) * step, z = cz + tx * off + tz * (rand() - 0.5) * step;
        const big = rand();
        put("slab", Math.floor(rand() * slabGeos.length), x, z, (5 + big * big * 16) * Math.sqrt(b.D), { tilt: big > 0.7 ? 0.9 : 0.35, sink: 0.35, flat: 1 });
      }
      if (rand() < 0.5) {
        const off = (rand() * 2 - 1) * c0.F * 0.8;
        put("chunk", Math.floor(rand() * chunkGeos.length), cx - tz * off, cz + tx * off, 2 + rand() * 5, { tilt: 0.8, sink: 0.3 });
      }
    }
  }
  // sparse plateau blocks (fresh ejecta of calving) near the gameplay area
  for (let k = 0; k < 260; k++) {
    const x = (rand() - 0.5) * 1400, z = -900 + rand() * 1150;
    const s = sample(x, z);
    if (s.h < -3 || rand() > 0.35 + s.nearRim) continue;
    put("chunk", Math.floor(rand() * chunkGeos.length), x, z, 0.8 + rand() * rand() * 4, { tilt: 0.6, sink: 0.4 });
  }
  // a few clustered block fields on the plateau (old collapsed blocks, half buried): cluster-first scatter
  for (let k = 0; k < 14; k++) {
    const cx = (rand() - 0.5) * 1300, cz = -850 + rand() * 1050, r = 25 + rand() * 45;
    if (sample(cx, cz).h < -2) continue;
    const n = 12 + Math.floor(rand() * 26);
    for (let j = 0; j < n; j++) {
      const a = rand() * Math.PI * 2, d = r * Math.sqrt(rand()) * (0.4 + 0.6 * rand());
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * 0.7;
      if (sample(x, z).h < -2) continue;
      const big = rand() < 0.12;
      put(big ? "chunk" : rand() < 0.5 ? "chunk" : "slab", Math.floor(rand() * (big ? chunkGeos.length : 5)), x, z, big ? 4 + rand() * 4 : 0.8 + rand() * 2.2, { tilt: 0.5, sink: big ? 0.45 : 0.35 });
    }
  }
  const group = new THREE.Group();
  let tris = 0, count = 0;
  for (const [kind, geos, mat] of [["chunk", chunkGeos, blockMat], ["slab", slabGeos, slabMat]]) {
    geos.forEach((g, gi) => {
      const list = items[kind][gi];
      if (!list.length) return;
      const im = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((it, i) => { im.setMatrixAt(i, it.m); im.setColorAt(i, it.c); });
      im.castShadow = im.receiveShadow = true;
      im.computeBoundingSphere();
      group.add(im);
      tris += (g.attributes.position.count / 3) * list.length;
      count += list.length;
    });
  }
  return { group, tris, count };
}

async function main() {
  const t0 = performance.now();
  const rand = random(20261011);
  const ground = buildGround();
  stage.scene.add(ground.mesh);
  const walls = await buildWalls(rand);
  stage.scene.add(walls.group);
  const scatter = await buildScatter(rand);
  stage.scene.add(scatter.group);
  const sky = buildSky(LIGHT);
  stage.scene.add(sky);
  const hide = (params.get("hide") || "").split(",");
  ground.mesh.visible = !hide.includes("ground");
  walls.group.visible = !hide.includes("walls");
  scatter.group.visible = !hide.includes("scatter");
  const name = params.get("view") || "game";
  const v = VIEWS[name] || VIEWS.game;
  stage.applyLight({ ...LIGHT, shadowBox: v.shadowBox }, v.shadowBox, ["#000000"]);
  stage.sun.shadow.camera.far = 6000;
  stage.sun.shadow.camera.updateProjectionMatrix();
  stage.setView({ ...v, far: 20000 });
  stage.renderer.shadowMap.needsUpdate = true;
  const stats = { groundTris: ground.tris, wallTris: walls.tris, wallModules: walls.placed, wallSkipped: walls.skipped, scanModules: walls.modules, scatterTris: scatter.tris, scatterCount: scatter.count, buildMs: Math.round(performance.now() - t0) };
  window.__rift.stats = stats;
  document.getElementById("status").textContent = `view ${name} · ${JSON.stringify(stats)}`;
  stage.onFrame = (s) => {
    window.__rift.frames = s.frames;
    window.__rift.render = { calls: s.renderer.info.render.calls, triangles: s.renderer.info.render.triangles };
    window.__rift.ready = true;
  };
  stage.invalidate(10);
  window.rift = { stage, VIEWS, setView: (n) => { const w = VIEWS[n]; stage.applyLight({ ...LIGHT, shadowBox: w.shadowBox }, w.shadowBox, ["#000000"]); stage.setView({ ...w, far: 20000 }); stage.renderer.shadowMap.needsUpdate = true; } };
  for (const b of document.querySelectorAll("[data-view]")) b.onclick = () => window.rift.setView(b.dataset.view);
}
main().catch((e) => { console.error(e); document.getElementById("status").textContent = "error: " + e.message; });
