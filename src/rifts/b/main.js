import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Stage } from "../../studio/core/stage.js";
import { Layout, buildTerrain, edgeLines } from "./terrain.js";
import { iceMaterial } from "./material.js";
import { placeWalls, wallMatrix, placeBlocks, blockMatrix, placeRocks } from "./placement.js";
import { buildJupiter } from "./jupiter.js";

// Scene B: fault scarp + chaos edge. See docs/rifts/b/ROUND-1.md.
const params = new URLSearchParams(location.search);
const capture = params.has("capture");
if (capture) document.body.classList.add("capture");
const W = Number(params.get("w") || 1672), H = Number(params.get("h") || 941);
const view = document.getElementById("view");
const stage = capture ? new Stage(view, { width: W, height: H, pixelRatio: 1 }) : new Stage(view);
window.__rift = { ready: false };
const BASE = "rifts/b/";

const LIGHT = {
  azimuth: 74, elevation: 17, intensity: 5.0, colour: "#fff6ec",
  fill: 0.45, fillColour: "#e6d6c4", fillAzimuth: -60, fillElevation: 14, // faint Jupiter shine from the Jupiter side
  hemi: 0.3, hemiSky: "#9aa6b8", hemiGround: "#5a4a42",
  exposure: 1.08, toneMapping: "aces", ao: 0.7, aoRadius: 6, shadowSoftness: 0.4, shadowIntensity: 0.95,
  shadowBox: [-900, -1100, 900, 700],
};

async function main() {
  const t0 = performance.now();
  const [meta, buf, manifest] = await Promise.all([
    fetch(BASE + "layout.json").then((r) => r.json()),
    fetch(BASE + "layout.bin").then((r) => readAssetBinary(r)),
    fetch(BASE + "manifest.json").then((r) => r.json()),
  ]);
  const L = new Layout(meta, buf, { zShift: Number(params.get("zs") ?? -70) });
  L.o.datum = L.height(0, -14.2);
  const loader = new GLTFLoader();
  const geo = {};
  await Promise.all([...manifest.walls, ...manifest.blocks, ...manifest.rocks].map(async (a) => {
    const g = await loader.loadAsync(BASE + a.file);
    let mesh = null; g.scene.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    const gg = mesh.geometry; gg.deleteAttribute("normal"); gg.computeVertexNormals();
    geo[a.name] = gg;
  }));
  const root = new THREE.Group();
  stage.scene.add(root);
  const stats = {};

  const terrain = new THREE.Mesh(buildTerrain(L), iceMaterial("terrain"));
  terrain.receiveShadow = true; terrain.castShadow = false; // walls, blocks and rocks cast; flat terrain self-shadow saw-tooths at 4 m facets
  root.add(terrain);
  stats.terrainTris = terrain.geometry.index.count / 3;

  const lines = edgeLines(L, 6);
  stats.edgeLines = lines.length;
  stats.edgeKm = Math.round(lines.reduce((s, l) => s + l.length * 6, 0)) / 1000;

  const wallMat = iceMaterial("wall", { seed: 1 });
  wallMat.side = THREE.DoubleSide;
  const walls = placeWalls(L, lines, manifest.walls);
  for (const w of walls) {
    const m = new THREE.Mesh(geo[w.name], wallMat);
    m.matrixAutoUpdate = false; wallMatrix(w, m.matrix);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }
  stats.walls = walls.length;

  const blockMat = iceMaterial("block", { seed: 2 });
  const blocks = placeBlocks(L, lines, manifest.blocks);
  for (const b of blocks) {
    const m = new THREE.Mesh(geo[b.name], blockMat);
    m.matrixAutoUpdate = false; blockMatrix(b, m.matrix);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }
  stats.blocks = blocks.length;

  const rockMat = iceMaterial("rock", { seed: 3 });
  const rocks = placeRocks(L, lines, manifest.rocks);
  stats.rocks = 0;
  for (const [name, mats] of Object.entries(rocks)) {
    if (!mats.length) continue;
    const im = new THREE.InstancedMesh(geo[name], rockMat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    root.add(im);
    stats.rocks += mats.length;
  }

  const sunDir = (() => { const a = THREE.MathUtils.degToRad(LIGHT.azimuth), e = THREE.MathUtils.degToRad(LIGHT.elevation); return [Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)]; })();
  stage.scene.add(buildJupiter({ sun: sunDir }));
  stage.applyLight(LIGHT, LIGHT.shadowBox, ["#000000"]);
  // Faceted double-sided scan sheets acne with the studio default bias; push it out a little.
  stage.sun.shadow.bias = -0.0006; stage.sun.shadow.normalBias = 0.6;
  stats.buildMs = Math.round(performance.now() - t0);

  // Views: gameplay convention, a close oblique of the wall nearest the gameplay target, a hero overview.
  // close-up subject: a tall, sunlit wall near the gameplay target
  const sx = sunDir[0], sz = sunDir[2], sl = Math.hypot(sx, sz);
  const lit = (w) => (Math.sin(w.yaw) * sx + Math.cos(w.yaw) * sz) / sl;
  // Try candidate walls until the line of sight from the camera to the face is clear for at least 75 % of the way.
  const closeDist = Number(params.get("cd") || 62);
  const ray = new THREE.Raycaster();
  root.updateMatrixWorld(true);
  const closeFor = (w) => {
    const nx = Math.sin(w.yaw), nz = Math.cos(w.yaw);
    const along = Number(params.get("ca") || 36), px = w.x + nx * closeDist - nz * along, pz = w.z + nz * closeDist + nx * along;
    const position = [px, L.height(px, pz) + 30, pz];
    const target = [w.x + nz * 30, w.y + w.drop * 0.34, w.z - nx * 30];
    return { position, target, fov: 66, shadowBox: [w.x - 160, w.z - 160, w.x + 160, w.z + 160] };
  };
  const clear = (v) => {
    const o = new THREE.Vector3(...v.position), t = new THREE.Vector3(...v.target), d = t.clone().sub(o), len = d.length();
    ray.set(o, d.normalize()); ray.far = len;
    const hit = ray.intersectObjects(root.children.filter((c) => c.isMesh && !c.isInstancedMesh), false)[0];
    return !hit || hit.distance > len * 0.75;
  };
  const cands = walls.filter((w) => w.z < 0 && w.drop > 70 && lit(w) > 0.25).sort((a, b) => Math.hypot(a.x - 60, a.z + 160) - Math.hypot(b.x - 60, b.z + 160));
  const near = cands.find((w) => clear(closeFor(w))) || cands[0] || walls[0];
  stats.closeWall = `${near.name} drop ${Math.round(near.drop)} m`;
  const views = {
    game: { position: [0, 150, 200], target: [0, 0, -14.2], fov: 78 },
    // oblique: stand out from the wall foot and along it, look back along the face
    close: closeFor(near),
    hero: { position: [820, 640, 780], target: [-40, 30, -260], fov: 52 },
  };
  window.rift = { stage, L, walls, blocks, views, stats };
  const setView = (v) => {
    const vw = views[v] || views.game;
    stage.applyLight({ ...LIGHT, shadowBox: vw.shadowBox || LIGHT.shadowBox }, LIGHT.shadowBox, ["#000000"]);
    stage.sun.shadow.bias = -0.0006; stage.sun.shadow.normalBias = vw.shadowBox ? 0.15 : 0.6;
    stage.setView(vw); stage.renderer.shadowMap.needsUpdate = true; document.querySelectorAll("[data-view]").forEach((b) => b.classList.toggle("on", b.dataset.view === v)); };
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
  setView(params.get("view") || "game");
  const st = document.getElementById("stats");
  if (st) st.textContent = Object.entries(stats).map(([k, v]) => `${k}: ${v}`).join("  ·  ");
  stage.onFrame = (s) => {
    window.__rift.frames = s.frames;
    window.__rift.render = { calls: s.renderer.info.render.calls, triangles: s.renderer.info.render.triangles };
    window.__rift.stats = stats;
    window.__rift.ready = true;
  };
  stage.invalidate(10);
}
main().catch((e) => { console.error(e); window.__rift.error = String(e); });
