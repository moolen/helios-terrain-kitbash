import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
import { loadBinary } from "./binary.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSM } from "three/addons/csm/CSM.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { QuadTerrain, HeightField } from "./terrain.js";
import { terrainMaterial, makeArrayTexture } from "./material.js";
import { buildSky } from "./sky.js";
import { buildScatter } from "./scatter.js";
import { buildApron } from "./apron.js";
import { buildTrails } from "./trails.js";
import { buildScanWalls } from "./scan-walls.js";
import { buildHeroWalls } from "./hero-walls.js";
import { buildVapour } from "./vapour.js";

// Mars scene mm-cerberus: Cerberus Fossae twin fissures (anchor A 10.30N 156.95E). Real HiRISE 1 m +
// CTX 20 m terrain, true 3D basalt scan wall modules, platy lava and rootless-cone
// stamps from HiRISE, Mars kit rocks and boulder trails. See docs/mm/mm-cerberus/ROUND-1.md.
const params = new URLSearchParams(location.search);
const capture = params.has("capture");
const BASE = "mm/mm-cerberus/";
const W = Number(params.get("w") || 0), H = Number(params.get("h") || 0);
const state = (window.__mmc = { ready: false, frames: 0, error: null, stats: {} });
const status = document.getElementById("status");
const setStatus = (s) => { if (status) status.textContent = s; };
window.addEventListener("error", (e) => { state.error = String(e.message || e); setStatus("error: " + state.error); });

const LAT = THREE.MathUtils.degToRad(10.3);
const HAZE = new THREE.Color(0xc29a74);   // distance haze = horizon sky

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
  t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  res(t);
}, undefined, rej));
const loadImg = (url) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });

async function main() {
  const t0 = performance.now();
  const view = document.getElementById("view");
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", reversedDepthBuffer: params.has("rdepth") });
  renderer.info.autoReset = false;
  renderer.setPixelRatio(capture ? 1 : Math.min(window.devicePixelRatio, 1.5));
  const width = () => W || window.innerWidth, height = () => H || window.innerHeight;
  renderer.setSize(width(), height());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = params.get("tm") === "agx" ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  view.appendChild(renderer.domElement);
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  state.gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(50, width() / height(), 1.5, 60000);

  setStatus("loading terrain…");
  const meshMeta = await fetch(BASE + (params.get("mesh") || "mesh") + "/mesh.json").then((r) => r.json());
  const sceneMeta = await fetch(BASE + "scene.json").then((r) => r.json());
  const [bins, hfBuf, gn, ma, mb, mc, albI, nrmI, rghI, layers] = await Promise.all([
    Promise.all([...Array(meshMeta.levels).keys()].map((L) => loadBinary(`${BASE}${params.get("mesh") || "mesh"}/L${L}.bin`))),
    loadBinary(BASE + "height_8m.bin"),
    loadTex(BASE + (sceneMeta.normalMap?.file || "maps/normal_2m.jpg")), loadTex(BASE + "maps/masks_a.webp"), loadTex(BASE + "maps/masks_b.png"), loadTex(BASE + "maps/masks_c.webp"),
    loadImg(BASE + "tex/albedo.jpg"), loadImg(BASE + "tex/normal.jpg"), loadImg(BASE + "tex/rgh.jpg"),
    fetch(BASE + "tex/layers.json").then((r) => r.json()),
  ]);
  setStatus("building…");
  const nL = layers.layers.length;
  const tex = { gn, ma, mb, mc, alb: makeArrayTexture(albI, nL, true), nrm: makeArrayTexture(nrmI, nL, false), rgh: makeArrayTexture(rghI, nL, false) };
  tex.octNormalLevels = sceneMeta.normalMap?.encoding?.startsWith("octahedral-") ? sceneMeta.normalMap.componentLevels - 1 : 0;
  tex.tiles = Array.from({ length: 16 }, (_, i) => layers.layers[i]?.tile ?? 4);
  // mean linear luminance per layer (palette locking in the shader)
  tex.meanL = Array.from({ length: 16 }, (_, i) => { const m = layers.layers[i]?.albedoMean || [.5, .5, .5]; const l = m.map((v) => Math.pow(v, 2.2)); return .3 * l[0] + .55 * l[1] + .15 * l[2]; });
  const hf = new HeightField(sceneMeta.heightfield, hfBuf);
  state.hf = hf;

  // ---- lights: one hard CSM sun (Mars: ~43 % of Earth's irradiance, set through exposure), dusty sky fill
  scene.fog = new THREE.FogExp2(HAZE.clone(), 0.000038);
  scene.background = HAZE.clone();
  const SUN_I = 4.2;
  const sun0 = sunDir(Number(params.get("t") ?? sceneMeta.defaultHour ?? 15.6));
  const csm = new CSM({
    maxFar: 14000, cascades: 4, mode: "practical", parent: scene, shadowMapSize: capture ? 4096 : 2048,
    lightDirection: sun0.clone().negate(), camera, lightIntensity: SUN_I, lightMargin: 3000, shadowBias: -0.00012, shadowNormalBias: 0.6,
  });
  csm.fade = true;
  for (const l of csm.lights) { l.color.set(0xfff1e0); l.shadow.radius = 1; }
  const amb = new THREE.HemisphereLight(0xd2a77c, 0x5a3c28, 0.55);
  scene.add(amb);
  const mat = terrainMaterial(tex);
  csm.setupMaterial(mat);
  const csmHook = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { csmHook(s, r); mat.userData.hook(s); };
  let apron = null;
  const terrain = new QuadTerrain(meshMeta, bins, mat);
  scene.add(terrain.group);
  try {
    const [am, ab] = await Promise.all([fetch(BASE + "apron_32m.json").then((r) => r.json()), fetch(BASE + "apron_32m.bin").then((r) => readAssetBinary(r))]);
    apron = buildApron(am, ab, tex, csm, hf, sceneMeta.size);
    scene.add(apron);
  } catch (e) { console.warn("apron", e); }
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, wireframe: true });

  const sky = buildSky();
  scene.add(sky.group);

  let scatter = null, trails = null;
  try { scatter = await buildScatter(BASE, sceneMeta, csm, tex); if (scatter) scene.add(scatter.group); } catch (e) { console.warn("scatter", e); }
  try { trails = await buildTrails(BASE, csm); if (trails) scene.add(trails); } catch (e) { console.warn("trails", e); }
  let cliffs = null, vapour = null;
  // Round 6 replaces the DTM-derived ribbon faces with true 3D scan modules.
  try {
    cliffs = await (params.get("walls") === "r8" ? buildScanWalls : buildHeroWalls)(BASE, csm, tex, hf);
    if (cliffs) {
      scene.add(cliffs.group);
      terrain.setScanWallCoverage(cliffs.placements.terrainCoverage || cliffs.placements);
    }
  } catch (e) { throw new Error('scan wall kit: ' + e.message); }
  try { vapour = buildVapour(sceneMeta, hf); if (vapour) scene.add(vapour.group); } catch (e) { console.warn("vapour", e); }

  // ---- post: MSAA HDR target, faint bloom (sun disc), ACES output
  const rt = new THREE.WebGLRenderTarget(width(), height(), { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.25, 0.4, 1.2);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ---- camera + controls
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !capture;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.zoomSpeed = 1.2;
  const keys = new Set();
  addEventListener("keydown", (e) => { if (e.target.tagName !== "INPUT") keys.add(e.code); });
  addEventListener("keyup", (e) => keys.delete(e.code));

  const VIEWS = sceneMeta.views;
  function setView(name) {
    const v = VIEWS[name];
    if (!v) return;
    const tg = new THREE.Vector3(v.target[0], v.target[1] ?? hf.at(v.target[0], v.target[2]), v.target[2]);
    const yaw = THREE.MathUtils.degToRad(v.yaw), pitch = THREE.MathUtils.degToRad(v.pitch);
    const off = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(v.dist);
    camera.position.copy(tg).add(off);
    camera.fov = v.fov || 50;
    camera.updateProjectionMatrix();
    controls.target.copy(tg);
    controls.update();
    if (v.hour !== undefined) setHour(v.hour);
    if (v.exposure !== undefined) renderer.toneMappingExposure = v.exposure; else renderer.toneMappingExposure = ui.exposure;
    state.view = name;
  }

  const ui = { hour: Number(params.get("t") ?? sceneMeta.defaultHour ?? 15.6), exposure: Number(params.get("exposure") || 1.0), scatter: true, debug: 0, tau: terrain.tau, wire: false, bloom: true };
  function setHour(h) {
    ui.hour = h;
    const s = sunDir(h);
    csm.lightDirection.copy(s).negate();
    const up = THREE.MathUtils.smoothstep(s.y, -0.03, 0.08);
    for (const l of csm.lights) l.intensity = SUN_I * up;
    sky.setSun(s);
    amb.intensity = 0.08 + 0.72 * THREE.MathUtils.smoothstep(s.y, -0.1, 0.4);
    const day = THREE.MathUtils.smoothstep(s.y, -0.12, 0.12);
    scene.fog.color.copy(HAZE).multiplyScalar(0.08 + 0.92 * day);
    scene.background.copy(scene.fog.color);
    if (scatter) scatter.setSun?.(s);
    const sl = document.getElementById("hourlbl"); if (sl) sl.textContent = h.toFixed(1) + " h";
  }

  // ---- UI
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
    <label>time <input id="hour" type="range" min="6" max="18" step="0.05" value="${ui.hour}"><span id="hourlbl"></span></label>
    <label>exposure <input id="expo" type="range" min="0.3" max="3" step="0.05" value="${ui.exposure}"></label>
    <label>haze <input id="haze" type="range" min="0" max="3" step="0.05" value="1"></label>
    <h4>Layers</h4>
    <label><input type="checkbox" id="cSc" checked> scatter (rocks)</label>
    <label><input type="checkbox" id="cTr" checked> boulder trails</label>
    <label><input type="checkbox" id="cCl" checked> cliff band meshes</label>
    <label><input type="checkbox" id="cVa" checked> thermal vapour</label>
    <label><input type="checkbox" id="cDu" checked> dust</label>
    <label><input type="checkbox" id="cGp"> gameplay masks (hubs, deposit, thermal cells)</label>
    <label><input type="checkbox" id="cBl" checked> bloom</label>
    <h4>Debug</h4>
    <label><select id="dbg"><option value="0">shaded</option><option value="1">dust / sand / streak</option><option value="2">band / talus / platy</option><option value="3">normals</option><option value="4">thermal / deposit / hub</option><option value="5">sky visibility</option><option value="6">cones / tpi</option></select></label>
    <label><input type="checkbox" id="cWi"> wireframe</label>
    <label>LOD px <input id="tau" type="range" min="0.5" max="8" step="0.1" value="${terrain.tau}"></label>
    <div id="tri" style="font:11px ui-monospace,monospace;color:#9ab"></div>`;
  const $ = (id) => document.getElementById(id);
  const U = mat.userData.uniforms;
  $("hour").oninput = (e) => setHour(Number(e.target.value));
  $("expo").oninput = (e) => { ui.exposure = Number(e.target.value); renderer.toneMappingExposure = ui.exposure; };
  $("haze").oninput = (e) => { scene.fog.density = 0.000038 * Number(e.target.value); };
  $("cSc").onchange = (e) => { if (scatter) scatter.group.visible = e.target.checked; };
  $("cTr").onchange = (e) => { if (trails) trails.visible = e.target.checked; };
  $("cCl").onchange = (e) => { if (cliffs) cliffs.group.visible = e.target.checked; };
  $("cVa").onchange = (e) => { if (vapour) vapour.group.visible = e.target.checked; };
  $("cDu").onchange = (e) => { U.uDust.value = e.target.checked ? 1 : 0; };
  $("cGp").onchange = (e) => { U.uGameplay.value = e.target.checked ? 1 : 0; };
  $("cBl").onchange = (e) => { bloom.enabled = e.target.checked; };
  $("dbg").onchange = (e) => { U.uDebug.value = Number(e.target.value); };
  $("cWi").onchange = (e) => { ui.wire = e.target.checked; terrain.setMaterial(ui.wire ? wireMat : mat); };
  $("tau").oninput = (e) => { terrain.tau = Number(e.target.value); };
  for (const [k, id] of [["scatter", "cSc"], ["trails", "cTr"], ["cliffs", "cCl"], ["vapour", "cVa"], ["dust", "cDu"], ["bloom", "cBl"]]) {
    if (params.get(k) === "0") { $(id).checked = false; $(id).onchange({ target: $(id) }); }
  }
  if (params.get("gameplay") === "1") { $("cGp").checked = true; $("cGp").onchange({ target: $("cGp") }); }
  if (params.get("debug")) { $("dbg").value = params.get("debug"); U.uDebug.value = Number(params.get("debug")); }
  if (params.get("tau")) terrain.tau = Number(params.get("tau"));
  if (params.get("rtau") && scatter) scatter.tau = Number(params.get("rtau"));
  if (params.get("haze")) scene.fog.density = 0.000038 * Number(params.get("haze"));

  setHour(ui.hour);
  setView(params.get("view") || "gameplay");
  if (params.get("t")) setHour(Number(params.get("t")));
  if (params.get("exposure")) renderer.toneMappingExposure = Number(params.get("exposure"));

  addEventListener("resize", () => {
    if (W) return;
    camera.aspect = width() / height(); camera.updateProjectionMatrix();
    renderer.setSize(width(), height()); composer.setSize(width(), height()); csm.updateFrustums();
  });

  const clock = new THREE.Clock();
  const frustum = new THREE.Frustum(), pm = new THREE.Matrix4();
  let fpsT = performance.now(), fpsN = 0, fps = 0;
  const fixedTime = params.get("time") ? Number(params.get("time")) : null;
  state.buildMs = Math.round(performance.now() - t0);
  function frame() {
    const dt = Math.min(0.05, clock.getDelta());
    const time = fixedTime ?? clock.elapsedTime;
    // fly keys
    if (keys.size) {
      const sp = (keys.has("ShiftLeft") ? 900 : 180) * dt;
      const f = new THREE.Vector3(); camera.getWorldDirection(f); f.y = 0; f.normalize();
      const r = new THREE.Vector3().crossVectors(f, camera.up).normalize();
      const m = new THREE.Vector3();
      if (keys.has("KeyW")) m.add(f); if (keys.has("KeyS")) m.sub(f);
      if (keys.has("KeyD")) m.add(r); if (keys.has("KeyA")) m.sub(r);
      if (keys.has("KeyE")) m.y += 1; if (keys.has("KeyQ")) m.y -= 1;
      m.multiplyScalar(sp); camera.position.add(m); controls.target.add(m);
    }
    controls.update();
    const g = hf.at(camera.position.x, camera.position.z) + 3;
    if (camera.position.y < g) camera.position.y = g;
    terrain.update(camera, renderer.domElement.height);
    camera.updateMatrixWorld();
    csm.update();
    sky.follow(camera);
    mat.userData.uniforms.uTime.value = time;
    scatter?.update?.(camera);
    cliffs?.update(camera);
    trails?.userData.update?.(camera);
    vapour?.update(time);
    renderer.info.reset();
    composer.render(dt);
    fpsN++;
    const now = performance.now();
    if (now - fpsT > 1000) { fps = (fpsN * 1000) / (now - fpsT); fpsN = 0; fpsT = now; }
    if (state.frames % 10 === 0) {
      pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pm);
      const t = terrain.countTriangles(frustum);
      const sc = scatter ? scatter.countTriangles(frustum) : { tris: 0, instances: 0 };
      const cl = cliffs ? cliffs.countTriangles(frustum) : { tris: 0, n: 0 };
      const trailTris = trails?.visible ? trails.userData.countTriangles(frustum) : 0;
      const apronTris = apron?.visible ? apron.userData.countTriangles(frustum) : 0;
      state.stats = { trailTris, apronTris, terrainTris: t.tris, terrainNodes: t.nodes, scatterTris: sc.tris, scatterInstances: sc.instances, cliffTris: cl.tris, cliffModules: cl.n, total: t.tris + sc.tris + cl.tris + trailTris + apronTris, fps: Math.round(fps), calls: renderer.info.render.calls };
      const s = state.stats;
      const txt = `${state.view}  tris ${(s.total / 1000).toFixed(0)}k (terrain ${(s.terrainTris / 1000).toFixed(0)}k/${s.terrainNodes} nodes, rocks ${(s.scatterTris / 1000).toFixed(0)}k/${s.scatterInstances}, cliffs ${(s.cliffTris / 1000).toFixed(0)}k/${s.cliffModules})  ${s.fps} fps  ${state.gpu}`;
      setStatus(txt);
      const tri = document.getElementById("tri"); if (tri) tri.textContent = `tris ${(s.total / 1000).toFixed(0)}k\nfps ${s.fps}`;
    }
    state.frames++;
    state.ready = true;
    requestAnimationFrame(frame);
  }
  window.mmc = { renderer, scene, camera, composer, csm, terrain, mat, setView, setHour, scatter, trails, cliffs, vapour, hf, controls, sky };
  frame();
}

main().catch((e) => { console.error(e); state.error = String(e?.stack || e); setStatus("error: " + e); });
