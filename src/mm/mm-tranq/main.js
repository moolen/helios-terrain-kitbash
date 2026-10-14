import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSM } from "three/addons/csm/CSM.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { QuadTerrain, HeightField } from "./terrain.js";
import { terrainMaterial, terrainDepthMaterial, pitMaterial, makeArrayTexture, shared } from "./material.js";
import { buildSky } from "./sky.js";
import { buildScatter } from "./scatter.js";
import { buildApron } from "./apron.js";
import { buildPit } from "./pit.js";

// mm-tranq: Mare Tranquillitatis pit (moon.mare_tranquillitatis). Kaguya TC 8.4 m base + the LROC NAC TRANQPIT1 2 m
// strip at its true position, real 2 m mare micro-relief elsewhere, West crater (Apollo 11 NAC DTM) and Fecunditatis
// ridge stamps, the pit shaft as an authored mesh, Apollo-sample rocks. See docs/mm/mm-tranq/ROUND-1.md.
const params = new URLSearchParams(location.search);
const capture = params.has("capture");
const BASE = "mm/mm-tranq/";
const W = Number(params.get("w") || 0), H = Number(params.get("h") || 0);
const state = (window.__mmt = { ready: false, frames: 0, error: null, stats: {} });
const status = document.getElementById("status");
const setStatus = (s) => { if (status) status.textContent = s; };
window.addEventListener("error", (e) => { state.error = String(e.message || e); setStatus("error: " + state.error); });

const LAT = THREE.MathUtils.degToRad(8.2855);
const SUN_I = 4.2;
// local solar time (lunar "hours": 24 h = one synodic day of 29.5 Earth days); sun declination ignored (+-1.5 deg)
function sunDir(hours) {
  const Hh = (hours / 24 - 0.5) * Math.PI * 2;
  const E = -Math.sin(Hh), N = -Math.sin(LAT) * Math.cos(Hh), U = Math.cos(LAT) * Math.cos(Hh);
  return new THREE.Vector3(E, U, -N).normalize();
}
function dirAzEl(az, el) {
  const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), -Math.cos(a) * Math.cos(e));
}
const loadTex = (url, srgb = false, opts = {}) => new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = opts.aniso ?? 8;
  t.flipY = opts.flipY ?? false;   // baked maps: image row 0 = north = world -z
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.needsUpdate = true;
  res(t);
}, undefined, rej));
const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

async function main() {
  const t0 = performance.now();
  const view = document.getElementById("view");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", logarithmicDepthBuffer: false });
  renderer.setPixelRatio(capture ? 1 : Math.min(window.devicePixelRatio, 1.5));
  const width = () => W || window.innerWidth, height = () => H || window.innerHeight;
  renderer.setSize(width(), height());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;      // very hard sun: no soft penumbra kernel
  renderer.toneMapping = params.get("tm") === "agx" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  view.appendChild(renderer.domElement);
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  state.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(50, width() / height(), 0.8, 140000);

  setStatus("loading terrain…");
  const meshMeta = await fetch(BASE + "mesh/mesh.json").then((r) => r.json());
  const sceneMeta = await fetch(BASE + "scene.json").then((r) => r.json());
  const pitMeta = await fetch(BASE + "pit/pit.json").then((r) => r.json());
  const [bins, hfBuf, gn, ma, albI, nrmI, rghI, layers, etex, cn, ctxM, ctxB, farM, farB] = await Promise.all([
    Promise.all([...Array(meshMeta.levels).keys()].map((L) => fetch(`${BASE}mesh/L${L}.bin`).then((r) => readAssetBinary(r)))),
    fetch(BASE + "height_8m.bin").then((r) => readAssetBinary(r)),
    loadTex(BASE + "maps/normal.jpg"), loadTex(BASE + "maps/masks_a.png"),
    loadImg(BASE + "tex/albedo.jpg"), loadImg(BASE + "tex/normal.jpg"), loadImg(BASE + "tex/rgh.jpg"),
    fetch(BASE + "tex/layers.json").then((r) => r.json()),
    loadTex(BASE + "earth_2k.jpg", true, { flipY: true }),
    loadTex(BASE + "maps/ctx_normal.jpg"),
    fetch(BASE + "apron_ctx.json").then((r) => r.json()), fetch(BASE + "apron_ctx.bin").then((r) => readAssetBinary(r)),
    fetch(BASE + "apron_far.json").then((r) => r.json()), fetch(BASE + "apron_far.bin").then((r) => readAssetBinary(r)),
  ]);
  setStatus("building…");
  const nL = layers.layers.length;
  const tex = { gn, ma, alb: makeArrayTexture(albI, nL, true), nrm: makeArrayTexture(nrmI, nL, false), rgh: makeArrayTexture(rghI, nL, false) };
  tex.tiles = Array.from({ length: 8 }, (_, i) => layers.layers[i]?.tile ?? 3);
  const hf = new HeightField(sceneMeta.heightfield, hfBuf);
  state.hf = hf;
  shared.uPitC.value.set(pitMeta.centre[0], pitMeta.centre[1]);
  shared.uLip.value.set(pitMeta.lip256);

  // ---- lights: CSM sun, earthshine fill, regolith bounce (hemisphere: dark sky above, lit ground below)
  const sun0 = sunDir(Number(params.get("t") ?? sceneMeta.defaultHour ?? 7.8));
  const csm = new CSM({
    maxFar: 12000, cascades: 4, mode: "practical", parent: scene, shadowMapSize: capture ? 4096 : 2048,
    lightDirection: sun0.clone().negate(), camera, lightIntensity: SUN_I, lightMargin: 3000, shadowBias: -0.0003, shadowNormalBias: 1.6,
  });
  csm.fade = true;
  for (const l of csm.lights) { l.color.set(0xfffaf2); l.shadow.radius = 1; }
  const earthDir = dirAzEl(sceneMeta.earth.azDeg, sceneMeta.earth.elDeg);
  const efill = new THREE.DirectionalLight(0xb8c8ff, 0.0);
  efill.position.copy(earthDir).multiplyScalar(1000);
  scene.add(efill, efill.target);
  const bounce = new THREE.HemisphereLight(0x000000, 0x8a8c90, 0.0);
  scene.add(bounce);

  const withCSM = (mat, own) => { csm.setupMaterial(mat); const h = mat.onBeforeCompile; mat.onBeforeCompile = (s, r) => { h(s, r); own(s, r); }; return mat; };
  const mat = terrainMaterial(tex);
  withCSM(mat, (s) => mat.userData.hook(s));
  const terrain = new QuadTerrain(meshMeta, bins, mat);
  const depthMat = terrainDepthMaterial();
  for (const m of terrain.nodes.values()) m.customDepthMaterial = depthMat;
  scene.add(terrain.group);
  const pmat = pitMaterial(tex);
  const pown = pmat.onBeforeCompile;
  withCSM(pmat, pown);
  const pit = await buildPit(BASE, pmat);
  scene.add(pit.group);
  let apron = null;
  try { apron = buildApron(ctxM, ctxB, farM, farB, cn, tex, csm, hf); scene.add(apron); } catch (e) { console.warn("apron", e); }
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, wireframe: true });

  const sky = buildSky(etex);
  sky.setEarthDir(earthDir);
  scene.add(sky.group);

  let scatter = null;
  try { scatter = await buildScatter(BASE, csm, tex); if (scatter) scene.add(scatter.group); } catch (e) { console.warn("scatter", e); }

  const rt = new THREE.WebGLRenderTarget(width(), height(), { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.12, 0.2, 1.6);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !capture;
  controls.maxPolarAngle = Math.PI;
  controls.zoomSpeed = 1.2;
  const keys = new Set();
  addEventListener("keydown", (e) => { if (e.target.tagName !== "INPUT") keys.add(e.code); });
  addEventListener("keyup", (e) => keys.delete(e.code));

  const ui = { hour: Number(params.get("t") ?? sceneMeta.defaultHour ?? 7.8), exposure: Number(params.get("exposure") || 1.0) };
  const VIEWS = sceneMeta.views;
  function setView(name) {
    const v = VIEWS[name];
    if (!v) return;
    camera.fov = v.fov || 50;
    camera.updateProjectionMatrix();
    if (v.pos || v.posAbs) {
      const q = v.posAbs || v.pos;
      camera.position.set(q[0], q[1], q[2]);
      controls.target.copy(camera.position).add(dirAzEl(v.lookAz, v.lookEl).multiplyScalar(60));
    } else {
      const tg = new THREE.Vector3(v.target[0], v.target[1] ?? hf.at(v.target[0], v.target[2]), v.target[2]);
      const yaw = THREE.MathUtils.degToRad(v.yaw), pitch = THREE.MathUtils.degToRad(v.pitch);
      const off = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(v.dist);
      camera.position.copy(tg).add(off);
      controls.target.copy(tg);
    }
    controls.update();
    if (v.hour !== undefined && !params.get("t")) setHour(v.hour);
    ui.viewExposure = v.exposure ?? 1;
    applyExposure();
    state.view = name;
    scatter?.update(camera, true);
  }
  // camera-like exposure: the lit mare is ~4x brighter at high sun than at 20 deg; compensate like an auto-exposure
  function applyExposure() {
    const el = Math.max(0.03, shared.uSunW.value.y);
    renderer.toneMappingExposure = ui.exposure * (ui.viewExposure ?? 1) * 0.82 * Math.pow(0.05 + el, -1.3);
  }
  function setHour(h) {
    ui.hour = h;
    const s = sunDir(h);
    csm.lightDirection.copy(s).negate();
    shared.uSunW.value.copy(s);
    const up = THREE.MathUtils.smoothstep(s.y, -0.01, 0.03);
    for (const l of csm.lights) l.intensity = SUN_I * up;
    sky.setSun(s);
    // earthshine: Earth's lit fraction seen from the Moon (sun behind the observer -> full Earth); ~1e-4 of sunlight
    // in reality; kept faintly visible so the night side is not pure black
    const k = (1 - s.dot(earthDir)) / 2;
    efill.intensity = 0.012 * k * (1 - 0.7 * up);
    bounce.intensity = 0.22 * up * Math.max(0.2, s.y);
    applyExposure();
    const sl = document.getElementById("hourlbl"); if (sl) sl.textContent = h.toFixed(2) + " h, sun " + THREE.MathUtils.radToDeg(Math.asin(s.y)).toFixed(0) + "°";
  }

  const bar = document.getElementById("bar");
  for (const name of Object.keys(VIEWS)) {
    const b = document.createElement("button");
    b.textContent = VIEWS[name].label || name;
    b.onclick = () => setView(name);
    bar.appendChild(b);
  }
  const panel = document.getElementById("panel");
  panel.innerHTML = `
    <h4>Light</h4>
    <label>time <input id="hour" type="range" min="5.6" max="18.4" step="0.05" value="${ui.hour}"></label><div id="hourlbl"></div>
    <label>exposure <input id="expo" type="range" min="0.3" max="3" step="0.05" value="${ui.exposure}"></label>
    <label><input type="checkbox" id="cPh" checked> regolith photometry (off = Lambert)</label>
    <h4>Layers</h4>
    <label><input type="checkbox" id="cSc" checked> boulders / rubble</label>
    <label><input type="checkbox" id="cHa" checked> fresh-crater halos + rays</label>
    <label><input type="checkbox" id="cPi" checked> pit shaft mesh</label>
    <label><input type="checkbox" id="cAp" checked> context ring + skyline</label>
    <h4>Debug</h4>
    <label><select id="dbg"><option value="0">shaded</option><option value="1">masks (halo, blocky, deposit)</option><option value="2">normals</option><option value="3">sky visibility</option><option value="4">grey albedo</option></select></label>
    <label><input type="checkbox" id="cWi"> wireframe</label>
    <label>LOD px <input id="tau" type="range" min="0.5" max="6" step="0.25" value="0.45"></label>
    <div id="tri" style="font:11px ui-monospace,monospace;color:#9ab;white-space:pre"></div>`;
  const $ = (id) => document.getElementById(id);
  $("hour").oninput = (e) => setHour(Number(e.target.value));
  $("expo").oninput = (e) => { ui.exposure = Number(e.target.value); applyExposure(); };
  $("cPh").onchange = (e) => { shared.uPhoto.value = e.target.checked ? 1 : 0; };
  $("cSc").onchange = (e) => { if (scatter) scatter.group.visible = e.target.checked; };
  $("cHa").onchange = (e) => { shared.uImmGain.value = e.target.checked ? 1 : 0; };
  $("cPi").onchange = (e) => { pit.group.visible = e.target.checked; };
  $("cAp").onchange = (e) => { if (apron) apron.visible = e.target.checked; };
  $("dbg").onchange = (e) => { shared.uDebug.value = Number(e.target.value); };
  $("cWi").onchange = (e) => { terrain.setMaterial(e.target.checked ? wireMat : mat); };
  $("tau").oninput = (e) => { terrain.tau = Number(e.target.value); };
  for (const [k, id] of [["scatter", "cSc"], ["halos", "cHa"], ["pit", "cPi"], ["apron", "cAp"], ["photo", "cPh"]]) {
    if (params.get(k) === "0") { $(id).checked = false; $(id).onchange({ target: $(id) }); }
  }
  if (params.get("debug")) { $("dbg").value = params.get("debug"); shared.uDebug.value = Number(params.get("debug")); }
  if (params.get("tau")) terrain.tau = Number(params.get("tau"));

  setHour(ui.hour);
  setView(params.get("view") || "gameplay");
  if (params.get("t")) setHour(Number(params.get("t")));
  $("hour").value = ui.hour;

  addEventListener("resize", () => {
    if (W) return;
    camera.aspect = width() / height(); camera.updateProjectionMatrix();
    renderer.setSize(width(), height()); composer.setSize(width(), height()); csm.updateFrustums();
  });

  const clock = new THREE.Clock();
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4();
  let fpsT = performance.now(), fpsN = 0, fps = 0;
  state.buildMs = Math.round(performance.now() - t0);
  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    if (keys.size) {
      const sp = (keys.has("ShiftLeft") ? 900 : 120) * dt;
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
      const m = new THREE.Vector3();
      if (keys.has("KeyW")) m.add(f); if (keys.has("KeyS")) m.sub(f);
      if (keys.has("KeyD")) m.add(r); if (keys.has("KeyA")) m.sub(r);
      if (keys.has("KeyE")) m.y += 1; if (keys.has("KeyQ")) m.y -= 1;
      m.multiplyScalar(sp); camera.position.add(m); controls.target.add(m);
    }
    controls.update();
    // keep above ground, except inside the pit shaft (the heightfield there is the plug)
    const dpx = camera.position.x - pitMeta.centre[0], dpz = camera.position.z - pitMeta.centre[1];
    if (Math.hypot(dpx, dpz) > 75) { const g = hf.at(camera.position.x, camera.position.z) + 2; if (camera.position.y < g) camera.position.y = g; }
    terrain.update(camera, renderer.domElement.height);
    pit.update(camera);
    camera.updateMatrixWorld();
    csm.update();
    sky.follow(camera);
    scatter?.update(camera);
    composer.render(dt);
    fpsN++;
    const now = performance.now();
    if (now - fpsT > 1000) { fps = (fpsN * 1000) / (now - fpsT); fpsN = 0; fpsT = now; }
    if (state.frames % 10 === 0) {
      pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pm);
      const t = terrain.countTriangles(frustum);
      const sc = scatter ? scatter.countTriangles(frustum) : { tris: 0, instances: 0 };
      const pt = pit.group.visible ? pit.tris(frustum) : 0;
      let at = 0;
      if (apron?.visible) for (const m of apron.children) { m.geometry.boundingSphere || m.geometry.computeBoundingSphere(); if (frustum.intersectsSphere(m.geometry.boundingSphere)) at += m.geometry.index.count / 3; }
      state.stats = { terrainTris: t.tris, terrainNodes: t.nodes, pitTris: pt, apronTris: at, scatterTris: sc.tris, scatterInstances: sc.instances, total: t.tris + sc.tris + pt + at, fps: Math.round(fps), calls: renderer.info.render.calls };
      const s = state.stats;
      setStatus(`${state.view}  tris ${(s.total / 1000).toFixed(0)}k (terrain ${(s.terrainTris / 1000).toFixed(0)}k, pit ${(s.pitTris / 1000).toFixed(0)}k, ring ${(s.apronTris / 1000).toFixed(0)}k, rocks ${(s.scatterTris / 1000).toFixed(0)}k / ${s.scatterInstances})  ${s.fps} fps  ${state.gpu}`);
      const tri = $("tri"); if (tri) tri.textContent = `tris ${(s.total / 1000).toFixed(0)}k\nrocks ${s.scatterInstances}\nfps ${s.fps}`;
    }
    state.frames++;
    state.ready = true;
    requestAnimationFrame(frame);
  }
  window.mmt = { renderer, scene, camera, composer, csm, terrain, mat, setView, setHour, scatter, hf, controls, pit, apron, shared };
  frame();
}

main().catch((e) => { console.error(e); state.error = String(e?.stack || e); setStatus("error: " + e); });
