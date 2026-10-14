import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";
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
import { buildPlumes } from "./plumes.js";
import { buildScatter } from "./scatter.js";
import { HeatShimmerShader } from "./shimmer.js";
import { buildApron } from "./apron.js";

// Io scene C, "Krafla plume field" (game region io.pele). Real ArcticDEM 2 m Krafla caldera + kit-bashed pit, flow field and
// spatter cones, offline sulfur-deposit simulation, baked lava light. See docs/io/c/ROUND-1.md.
const params = new URLSearchParams(location.search);
const capture = params.has("capture");
const BASE = "io/c/";
const W = Number(params.get("w") || 0), H = Number(params.get("h") || 0);
const state = (window.__ioc = { ready: false, frames: 0, error: null, stats: {} });
const status = document.getElementById("status");
const setStatus = (s) => { if (status) status.textContent = s; };
window.addEventListener("error", (e) => { state.error = String(e.message || e); setStatus("error: " + state.error); });

const LAT = THREE.MathUtils.degToRad(20);
const JUP = { az: 14, el: 10 };   // Jupiter hangs fixed in Io's sky (tidally locked)

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
  const meshMeta = await fetch(BASE + "mesh/mesh.json").then((r) => r.json());
  const sceneMeta = await fetch(BASE + "scene.json").then((r) => r.json());
  const [bins, hfBuf, gn, ma, mb, me, mx, albI, nrmI, rghI, layers, jtex] = await Promise.all([
    Promise.all([...Array(meshMeta.levels).keys()].map((L) => fetch(`${BASE}mesh/L${L}.bin`).then((r) => readAssetBinary(r)))),
    fetch(BASE + "height_8m.bin").then((r) => readAssetBinary(r)),
    loadTex(BASE + "maps/normal_1m.jpg"), loadTex(BASE + "maps/masks_a.png"), loadTex(BASE + "maps/masks_b.png"), loadTex(BASE + "maps/emit.png"), loadTex(BASE + "maps/aux.png"),
    loadImg(BASE + "tex/albedo.jpg"), loadImg(BASE + "tex/normal.jpg"), loadImg(BASE + "tex/rgh.jpg"),
    fetch(BASE + "tex/layers.json").then((r) => r.json()),
    loadTex(BASE + "jupiter_2k.jpg", true, { flipY: true }),
  ]);
  setStatus("building…");
  const nL = layers.layers.length;
  const tex = { gn, ma, mb, me, mx, alb: makeArrayTexture(albI, nL, true), nrm: makeArrayTexture(nrmI, nL, false), rgh: makeArrayTexture(rghI, nL, false) };
  tex.tiles = Array.from({ length: 16 }, (_, i) => layers.layers[i]?.tile ?? 4);
  const hf = new HeightField(sceneMeta.heightfield, hfBuf);
  state.hf = hf;

  // ---- lights: CSM sun, Jupiter-shine fill, faint sky ambient, lava point lights
  const sun0 = sunDir(Number(params.get("t") ?? sceneMeta.defaultHour ?? 16.9));
  const csm = new CSM({
    maxFar: 9000, cascades: 4, mode: "practical", parent: scene, shadowMapSize: capture ? 4096 : 2048,
    lightDirection: sun0.clone().negate(), camera, lightIntensity: 5.2, lightMargin: 2500, shadowBias: -0.00012, shadowNormalBias: 0.6,
  });
  csm.fade = true;
  for (const l of csm.lights) { l.color.set(0xfff4e6); l.shadow.radius = 2; }
  const jupDir = dirAzEl(JUP.az, JUP.el);
  const jfill = new THREE.DirectionalLight(0xf0c890, 0.0);
  jfill.position.copy(jupDir).multiplyScalar(1000);
  scene.add(jfill, jfill.target);
  const amb = new THREE.HemisphereLight(0x8a8c94, 0x3a3634, 0.05);
  scene.add(amb);

  const mat = terrainMaterial(tex);
  {
    const U = mat.userData.uniforms;
    (sceneMeta.fissures || []).slice(0, 8).forEach((f, i) => { U.uFiss.value[i].set(f[0], f[1], f[2], f[3]); U.uFissP.value[i].set(f[4], f[5]); });
    U.uNF.value = Math.min(8, (sceneMeta.fissures || []).length);
    (sceneMeta.ventGlow || []).slice(0, 16).forEach((v, i) => U.uVG.value[i].set(v[0], v[1], v[2]));
    U.uNV.value = Math.min(16, (sceneMeta.ventGlow || []).length);
    const pv = (sceneMeta.vents || []).find((v) => v.type === "plume");
    if (pv) U.uPV.value.set(pv.x, pv.z);
    if (sceneMeta.info?.lakeLevelM !== undefined) U.uLakeY.value = sceneMeta.info.lakeLevelM - (sceneMeta.h0 ?? 600);
  }
  csm.setupMaterial(mat);
  const csmHook = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { csmHook(s, r); mat.userData.hook(s); };
  const terrain = new QuadTerrain(meshMeta, bins, mat);
  scene.add(terrain.group);
  try {
    const [am, ab, adb] = await Promise.all([fetch(BASE + "apron_32m.json").then((r) => r.json()), fetch(BASE + "apron_32m.bin").then((r) => readAssetBinary(r)),
      fetch(BASE + "apron_32m_dep.bin").then((r) => (r.ok ? readAssetBinary(r) : null)).catch(() => null)]);
    scene.add(buildApron(am, ab, tex, csm, adb && adb.byteLength === am.n * am.n * 2 ? adb : null));
  } catch (e) { console.warn("apron", e); }
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, wireframe: true });

  const sky = buildSky(jtex);
  sky.setJupiterDir(jupDir);
  scene.add(sky.group);

  // lava point lights (a handful; the rest of the lava light is baked)
  const lavaLights = [];
  for (const L of sceneMeta.lavaLights || []) {
    const pl = new THREE.PointLight(0xff6a20, L.intensity * 0.04, Math.min(L.range, 300), 2);
    pl.position.set(L.x, L.y, L.z);
    pl.userData.base = L.intensity * 0.04;
    scene.add(pl);
    lavaLights.push(pl);
  }

  let plumes = null, scatter = null;
  try { plumes = await buildPlumes(BASE, sceneMeta, hf); scene.add(plumes.group); } catch (e) { console.warn("plumes", e); }
  try { scatter = await buildScatter(BASE, sceneMeta, csm, tex); if (scatter) scene.add(scatter.group); } catch (e) { console.warn("scatter", e); }

  // ---- post: MSAA HDR target, bloom for the lava, heat shimmer, AgX output
  const rt = new THREE.WebGLRenderTarget(width(), height(), { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.addPass(new RenderPass(scene, camera));
  const shimmer = new ShaderPass(HeatShimmerShader);
  composer.addPass(shimmer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(width(), height()), 0.55, 0.6, 0.9);
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

  const ui = { hour: Number(params.get("t") ?? sceneMeta.defaultHour ?? 16.9), exposure: 1.4, plumes: true, particles: true, deposits: true, lava: true, scatter: true, debug: 0, tau: 1.4, wire: false, shimmer: true, bloom: true };
  function setHour(h) {
    ui.hour = h;
    const s = sunDir(h);
    csm.lightDirection.copy(s).negate();
    const up = THREE.MathUtils.smoothstep(s.y, -0.03, 0.06);
    for (const l of csm.lights) l.intensity = 5.2 * up;
    sky.setSun(s);
    // Jupiter-shine: Jupiter's lit fraction seen from Io, times a faint base level
    const k = (1 - s.dot(jupDir)) / 2;
    jfill.intensity = 0.06 + 0.22 * k;
    amb.intensity = 0.03 + 0.05 * up;
    if (plumes) plumes.setSun(s);
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
    <label>time <input id="hour" type="range" min="5" max="21" step="0.05" value="${ui.hour}"><span id="hourlbl"></span></label>
    <label>exposure <input id="expo" type="range" min="0.3" max="4" step="0.05" value="1.4"></label>
    <h4>Layers</h4>
    <label><input type="checkbox" id="cPl" checked> plumes</label>
    <label><input type="checkbox" id="cPa" checked> particles (gas, dust, smoke)</label>
    <label><input type="checkbox" id="cDe" checked> deposit layer</label>
    <label><input type="checkbox" id="cLa" checked> lava glow</label>
    <label><input type="checkbox" id="cSc" checked> scatter</label>
    <label><input type="checkbox" id="cSh" checked> heat shimmer</label>
    <label><input type="checkbox" id="cBl" checked> bloom</label>
    <h4>Debug</h4>
    <label><select id="dbg"><option value="0">shaded</option><option value="1">deposit map</option><option value="2">flow masks</option><option value="3">normals</option><option value="4">lava / fumarole</option><option value="5">sky visibility</option><option value="6">albedo x2</option></select></label>
    <label><input type="checkbox" id="cWi"> wireframe</label>
    <label>LOD px <input id="tau" type="range" min="0.5" max="6" step="0.25" value="1"></label>
    <div id="tri" style="font:11px ui-monospace,monospace;color:#9ab"></div>`;
  const $ = (id) => document.getElementById(id);
  $("hour").oninput = (e) => setHour(Number(e.target.value));
  $("expo").oninput = (e) => { ui.exposure = Number(e.target.value); renderer.toneMappingExposure = ui.exposure; };
  $("cPl").onchange = (e) => { ui.plumes = e.target.checked; plumes?.setVisible({ plumes: ui.plumes }); };
  $("cPa").onchange = (e) => { ui.particles = e.target.checked; plumes?.setVisible({ particles: ui.particles }); };
  $("cDe").onchange = (e) => { mat.userData.uniforms.uDeposit.value = e.target.checked ? 1 : 0; scatter?.setDeposit(e.target.checked ? 1 : 0); };
  $("cLa").onchange = (e) => { ui.lava = e.target.checked; mat.userData.uniforms.uLava.value = ui.lava ? 1 : 0; for (const l of lavaLights) l.visible = ui.lava; };
  $("cSc").onchange = (e) => { if (scatter) scatter.group.visible = e.target.checked; };
  $("cSh").onchange = (e) => { shimmer.enabled = e.target.checked; };
  $("cBl").onchange = (e) => { bloom.enabled = e.target.checked; };
  $("dbg").onchange = (e) => { mat.userData.uniforms.uDebug.value = Number(e.target.value); };
  $("cWi").onchange = (e) => { ui.wire = e.target.checked; terrain.setMaterial(ui.wire ? wireMat : mat); };
  $("tau").oninput = (e) => { terrain.tau = Number(e.target.value); };
  for (const k of ["plumes", "particles", "deposits", "lava", "scatter", "shimmer", "bloom"]) {
    if (params.get(k) === "0") {
      const id = { plumes: "cPl", particles: "cPa", deposits: "cDe", lava: "cLa", scatter: "cSc", shimmer: "cSh", bloom: "cBl" }[k];
      $(id).checked = false; $(id).onchange({ target: $(id) });
    }
  }
  if (params.get("debug")) { $("dbg").value = params.get("debug"); mat.userData.uniforms.uDebug.value = Number(params.get("debug")); }
  if (params.get("tau")) terrain.tau = Number(params.get("tau"));

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
    for (const l of lavaLights) l.intensity = l.userData.base * (0.85 + 0.15 * Math.sin(time * 1.7 + l.position.x));
    plumes?.update(time, camera);
    scatter?.update?.(camera);
    shimmer.uniforms.uTime.value = time;
    composer.render(dt);
    fpsN++;
    const now = performance.now();
    if (now - fpsT > 1000) { fps = (fpsN * 1000) / (now - fpsT); fpsN = 0; fpsT = now; }
    if (state.frames % 10 === 0) {
      pm.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(pm);
      const t = terrain.countTriangles(frustum);
      const sc = scatter ? scatter.countTriangles(frustum) : { tris: 0, instances: 0 };
      state.stats = { terrainTris: t.tris, terrainNodes: t.nodes, scatterTris: sc.tris, scatterInstances: sc.instances, total: t.tris + sc.tris, fps: Math.round(fps), calls: renderer.info.render.calls };
      const s = state.stats;
      const txt = `${state.view}  tris ${(s.total / 1000).toFixed(0)}k (terrain ${(s.terrainTris / 1000).toFixed(0)}k/${s.terrainNodes} nodes, scatter ${(s.scatterTris / 1000).toFixed(0)}k/${s.scatterInstances})  ${s.fps} fps  ${state.gpu}`;
      setStatus(txt);
      const tri = document.getElementById("tri"); if (tri) tri.textContent = `tris ${(s.total / 1000).toFixed(0)}k\nfps ${s.fps}`;
    }
    state.frames++;
    state.ready = true;
    requestAnimationFrame(frame);
  }
  window.ioc = { renderer, scene, camera, composer, csm, terrain, mat, setView, setHour, plumes, scatter, hf, controls };
  frame();
}

main().catch((e) => { console.error(e); state.error = String(e?.stack || e); setStatus("error: " + e); });
