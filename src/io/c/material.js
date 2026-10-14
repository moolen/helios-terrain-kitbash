import * as THREE from "three";

// Terrain material: MeshStandardMaterial with the lighting kept stock (CSM shadows, tone mapping) and
// the surface replaced by a baked-map + tiling-PBR layer stack:
//  * macro normal from the 1 m DEM normal map; on steep faces the flat geometric normal of the
//    error-bounded mesh takes over so walls stay faceted and crisp;
//  * triplanar projection of every tiling layer (top-only where flat), two scales against repetition;
//  * layer weights from baked masks (fresh flow, a'a, tephra, sulfur deposit, hotness, frost, fumarole)
//    with height-blended transitions;
//  * emissive lava from the baked emission mask times the crust crack pattern, plus baked lava irradiance.


export function makeArrayTexture(img, layers, srgb) {
  const w = img.width, h = img.height / layers;
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const data = new Uint8Array(g.getImageData(0, 0, c.width, c.height).data.buffer);
  const t = new THREE.DataArrayTexture(data, w, h, layers);
  t.format = THREE.RGBAFormat;
  t.type = THREE.UnsignedByteType;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

const GLSL_COMMON = /* glsl */ `
uniform sampler2D tGN;      // world normal, 1 m: rgb = (nx, nz, ny) * 0.5 + 0.5
uniform sampler2D tMA;      // r sky visibility, g fresh flow, b a'a fraction, a tephra
uniform sampler2D tMB;      // r sulfur deposit, g hotness, b SO2 frost, a fumarole crust
uniform sampler2D tME;      // r lava emission, g lava irradiance, b fumarole heat, a dark pyroclastic fan
uniform sampler2D tMX;      // r broad topographic position (80 m), g deposit episode age
uniform sampler2DArray tAlb, tNrm, tRgh;
uniform float uSize, uTime, uLava, uDeposit, uDetail, uIrr, uGeoN, uRegional, uDepScale;
uniform int uDebug;
uniform vec3 uLavaColor;
uniform vec4 uFiss[8]; uniform vec2 uFissP[8]; uniform int uNF;
uniform vec3 uVG[16]; uniform int uNV; uniform vec2 uPV; uniform float uLakeY;
varying vec3 vWPos;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
// voronoi edge distance (F2 - F1) for crack networks
vec2 voro(vec2 p) {
  vec2 n = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j); vec2 o = vec2(hash12(n + g), hash12(n + g + 19.7));
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  return vec2(sqrt(d2) - sqrt(d1), hash12(n));
}

// voronoi returning (F2 - F1, hash of the NEAREST cell, offset to its feature point): plate ids and centres
vec4 voro2(vec2 p) {
  vec2 n = floor(p), f = fract(p); float d1 = 8., d2 = 8.; vec2 id = vec2(0.), r1 = vec2(0.);
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    vec2 g = vec2(i, j); vec2 o = vec2(hash12(n + g), hash12(n + g + 19.7));
    vec2 r = g + o - f; float d = dot(r, r);
    if (d < d1) { d2 = d1; d1 = d; id = n + g; r1 = r; } else if (d < d2) d2 = d;
  }
  return vec4(sqrt(d2) - sqrt(d1), hash12(id + .37), r1);
}
uniform float uTile[16];
struct Tri { vec3 w; vec2 uvx, uvy, uvz; vec4 gx, gy, gz; float k; };
// world-metre triplanar frame; per-layer tile size is applied at sample time
Tri triSetup(vec3 p, vec3 n) {
  Tri t; vec3 w = pow(abs(n), vec3(6.)); w /= (w.x + w.y + w.z);
  if (w.y > .97) w = vec3(0, 1, 0);
  t.w = w;
  t.uvx = p.zy; t.uvy = p.xz; t.uvz = p.xy;
  t.gx = vec4(dFdx(t.uvx), dFdy(t.uvx)); t.gy = vec4(dFdx(t.uvy), dFdy(t.uvy)); t.gz = vec4(dFdx(t.uvz), dFdy(t.uvz));
  t.k = vnoise(p.xz * .021) * 7. + vnoise(p.xz * .0043) * 5.;
  return t;
}
// anti-tiling (after Quilez, 'texture repetition' #3): two lookups with per-region offsets and a
// rotation, blended across a low-frequency index field, so scanned patches with distinctive features
// (green spots, pools) do not repeat on a grid
vec4 antiTile(sampler2DArray s, vec2 uv, vec4 g, float layer, float k) {
  float i = floor(k), f = fract(k);
  vec2 oa = sin(vec2(3., 7.) * i) * 7.31, ob = sin(vec2(3., 7.) * (i + 1.)) * 7.31;
  float ra = i * 2.39996, rb = (i + 1.) * 2.39996;
  mat2 Ma = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)), Mb = mat2(cos(rb), -sin(rb), sin(rb), cos(rb));
  vec4 a = textureGrad(s, vec3(Ma * uv + oa, layer), Ma * g.xy, Ma * g.zw);
  vec4 b = textureGrad(s, vec3(Mb * uv + ob, layer), Mb * g.xy, Mb * g.zw);
  float m = smoothstep(.25, .75, f + .25 * (dot(a.rgb - b.rgb, vec3(.33))));
  return mix(a, b, m);
}
vec4 triS(sampler2DArray s, Tri t, float layer, float sc) {
  float it = sc / uTile[int(layer)];
  vec4 c = vec4(0.);
  if (t.w.y > 0.) c += t.w.y * antiTile(s, t.uvy * it, t.gy * it, layer, t.k);
  if (t.w.x > 0.) c += t.w.x * textureGrad(s, vec3(t.uvx * it, layer), t.gx.xy * it, t.gx.zw * it);
  if (t.w.z > 0.) c += t.w.z * textureGrad(s, vec3(t.uvz * it, layer), t.gz.xy * it, t.gz.zw * it);
  return c;
}
// whiteout-blended triplanar normal (Golus), returns world-space normal
vec3 triN(Tri t, float layer, vec3 n, float strength, float sc) {
  float it = sc / uTile[int(layer)];
  vec3 r = vec3(0.);
  if (t.w.y > 0.) { vec2 tn = (antiTile(tNrm, t.uvy * it, t.gy * it, layer, t.k).xy * 2. - 1.) * strength; tn.y = -tn.y;
    vec3 a = vec3(tn.x + n.x, abs(n.y), tn.y + n.z); r += t.w.y * vec3(a.x, a.y * sign(n.y), a.z); }
  if (t.w.x > 0.) { vec2 tn = (textureGrad(tNrm, vec3(t.uvx * it, layer), t.gx.xy * it, t.gx.zw * it).xy * 2. - 1.) * strength;
    vec3 a = vec3(abs(n.x), tn.y + n.y, tn.x + n.z); r += t.w.x * vec3(a.x * sign(n.x), a.y, a.z); }
  if (t.w.z > 0.) { vec2 tn = (textureGrad(tNrm, vec3(t.uvz * it, layer), t.gz.xy * it, t.gz.zw * it).xy * 2. - 1.) * strength;
    vec3 a = vec3(tn.x + n.x, tn.y + n.y, abs(n.z)); r += t.w.z * vec3(a.x, a.y, a.z * sign(n.z)); }
  return normalize(r);
}
// Dallol palette by hotness h (1 hot vent .. 0 cold fringe)
vec3 dallol(float h) {
  vec3 c0 = vec3(.86, .85, .80);   // cream / SO2 frost
  vec3 c1 = vec3(.88, .82, .45);   // pale sulfur
  vec3 c2 = vec3(.84, .70, .12);   // acid yellow
  vec3 c3 = vec3(.84, .3, .045);   // orange
  vec3 c4 = vec3(.6, .1, .03);     // vermilion / red short-chain sulfur
  vec3 c = mix(c0, c1, smoothstep(.0, .22, h));
  c = mix(c, c2, smoothstep(.22, .42, h));
  c = mix(c, c3, smoothstep(.42, .6, h));
  c = mix(c, c4, smoothstep(.62, .9, h));
  return c;
}
vec3 blackbody(float t) { // 0..1 -> dull red .. yellow-white (linear, unscaled)
  return vec3(1., .18 + .55 * t, .03 + .35 * t * t) * (0.4 + 2.6 * t * t);
}
`;

export function terrainMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const uniforms = {
    tGN: { value: tex.gn }, tMX: { value: tex.mx }, tMA: { value: tex.ma }, tMB: { value: tex.mb }, tME: { value: tex.me },
    tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh },
    uSize: { value: 7168 }, uTime: { value: 0 }, uLava: { value: 1 }, uDeposit: { value: 1 }, uDetail: { value: 1 },
    uIrr: { value: 1 }, uGeoN: { value: 1 }, uRegional: { value: 0.0 }, uDepScale: { value: 0.8 }, uFiss: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) }, uFissP: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) }, uNF: { value: 0 }, uVG: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) }, uNV: { value: 0 }, uPV: { value: new THREE.Vector2(300, -1550) }, uLakeY: { value: 1e4 }, uTile: { value: tex.tiles }, uDebug: { value: 0 }, uLavaColor: { value: new THREE.Color(1.0, 0.32, 0.06) },
  };
  mat.userData.uniforms = uniforms;
  mat.userData.hook = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + GLSL_COMMON)
      .replace("#include <map_fragment>", MAP_FRAGMENT)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = sRough;")
      .replace("#include <normal_fragment_maps>", "normal = normalize((viewMatrix * vec4(sN, 0.)).xyz);")
      .replace("#include <emissivemap_fragment>", "totalEmissiveRadiance = sEmit;")
      .replace("#include <aomap_fragment>", AO_FRAGMENT);
  };
  mat.onBeforeCompile = (s) => mat.userData.hook(s);
  mat.customProgramCacheKey = () => "io-c-terrain";
  return mat;
}

const MAP_FRAGMENT = /* glsl */ `
vec2 muv = (vWPos.xz + uSize * .5) / uSize;
vec4 MA = texture2D(tMA, muv), MB = texture2D(tMB, muv), ME = texture2D(tME, muv);
vec4 MX = texture2D(tMX, muv);
float tpl = MX.r - .5, depAge = MX.g, surfR = MX.b;
vec3 gn = texture2D(tGN, muv).rgb * 2. - 1.;
vec3 Nmap = normalize(vec3(gn.r, gn.b, gn.g));
vec3 Ngeo = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
if (Ngeo.y < 0.) Ngeo = -Ngeo;
float steepG = smoothstep(.72, .42, Ngeo.y);
vec3 Nm = normalize(mix(Nmap, Ngeo, steepG * uGeoN));
float slope = 1. - Nm.y;

// ---- masks. Only very low-frequency noise is used for variety (hundreds of metres); all breakup at
// metre scale comes from the terrain itself (fine topographic position, slope, ledges) and from the
// scan textures' own height fields, so nothing reads as leopard / camouflage blobs.
float nA = fbm(vWPos.xz * .0045), nL = fbm(vWPos.xz * .0011 + 5.3);
float fresh = MA.g, aaF = MA.b, tpi = MA.a - .5;
float dep = MB.r * uDeposit, hot = MB.g, frost = MB.b * uDeposit, fum = MB.a * uDeposit;
float freshB = texture2D(tMA, muv, 2.2).g;                               // ~10 m blurred flow mask
// the sim removed fan and fallout on the 2 m flow mask (hard edge); reconstruct the pre-burial amounts and
// bury them gradually with the blurred mask, so fan, deposit and flow meet without outlines
float burial = 1. - smoothstep(.05, .95, freshB);                        // one gradual burial factor for fan + deposit
float pyroU = clamp(texture2D(tME, muv, 3.2).a / max(1. - .9 * freshB, .1), 0., 1.) * uDeposit;   // ~6 m blur: no speckle    // fan amount before burial
float pyro = pyroU * burial;
float cliffW = smoothstep(.1, .25, slope);         // ~25-41 deg: pit walls, scarps, cone flanks shed fallout      // ~34-50 deg: the pit walls, scarps and cone flanks
float emit = ME.r * uLava * (1. - smoothstep(.12, .3, slope));   // the 2 m mask must not smear up pit walls
Tri T = triSetup(vWPos, Nm);
const float MACRO = .21;

// ---- old basalt ground: dark grey-brown weathered basalt, two scan sets mixed at very large scale
float mB = smoothstep(.3, .7, nL);
vec3 bA = triS(tAlb, T, 14., 1.).rgb, bB = triS(tAlb, T, 0., 1.).rgb, bM = triS(tAlb, T, 0., MACRO).rgb;
float lA = dot(bA, vec3(.3, .55, .15)), lB = dot(bB, vec3(.3, .55, .15)), lM = dot(bM, vec3(.3, .55, .15));
vec3 alb = vec3(mix(mix(lA, lB * 1.3, mB * .4), lM, .3)) * .36 * vec3(.97, .97, .98);
vec4 hBas = triS(tRgh, T, 14., 1.);
float rough = mix(.92, hBas.r, .5);
float ao = hBas.g;
vec3 Nd = triN(T, 14., Nm, 1.0 * uDetail, 1.);
// ---- dark pyroclastic fan (scoria / ash from the vent): black-brown cinder ground
float pyS = smoothstep(.2, .75, pyroU);                                   // gradational fan amount (unburied)
float wPy = smoothstep(.3, .9, pyroU) * burial * (1. - cliffW * .7);
if (wPy > .01) {
  vec4 r = triS(tRgh, T, 13., 1.);
  vec3 a = vec3(dot(mix(triS(tAlb, T, 13., 1.).rgb, triS(tAlb, T, 13., MACRO).rgb, .35), vec3(.3, .55, .15))) * vec3(.22, .21, .21);
  alb = mix(alb, a, wPy); rough = mix(rough, .95, wPy); ao = mix(ao, r.g, wPy);
  Nd = normalize(mix(Nd, triN(T, 13., Nm, 1.1 * uDetail, 1.), wPy));
}
// ---- walls: dark horizontal lava layering, 2-10 m bands of dark grey basalt and reddish-brown scoria
float wallBand = 0.;
if (cliffW > .01) {
  // stacked lava flows (after map A round 3): beds keyed to elevation with a slight regional dip and a
  // non-uniform warp (0.5-12 m beds), lateral lenses, mostly grey-on-grey with occasional reddish-brown
  // scoria/clinker beds, thin dark contacts and vertical cooling joints in the massive beds
  float yb = vWPos.y + vWPos.x * .012 - vWPos.z * .006;
  float lat = vnoise(vWPos.xz * .006) * 2. + vnoise(vWPos.xz * .025) * .6;
  float u = yb / 5. + 1.1 * fbm(vec2(yb * .045, 1.3)) + .6 * fbm(vec2(yb * .21, 4.7)) + lat;
  float id = floor(u), fr = fract(u);
  float hb = hash12(vec2(id, 7.1)), tone = hash12(vec2(id, 3.3));
  float lens = smoothstep(.55, .75, vnoise(vec2(dot(vWPos.xz, vec2(.7, .7)) * .02, id)));
  float scoria = step(.86, hb) * lens * (1. - fresh);
  float fw_ = fwidth(u) * 1.5;
  float contact = (1. - smoothstep(.0, .03 + fw_, min(fr, 1. - fr))) * step(.5, hash12(vec2(id, 1.7)));
  vec3 gtex = mix(triS(tAlb, T, 2., 1.).rgb, triS(tAlb, T, 2., .17).rgb, .5);
  vec3 grey = vec3(dot(gtex, vec3(.3, .55, .15))) * vec3(.97, .97, .98) * (.5 + .7 * tone) * .5;
  vec3 red = vec3(dot(mix(triS(tAlb, T, 1., 1.).rgb, triS(tAlb, T, 1., .3).rgb, .5), vec3(.33))) * vec3(.5, .36, .3);
  vec2 tg = normalize(vec2(-Nm.z, Nm.x) + 1e-4);
  float hcoord = dot(vWPos.xz, tg) / (1.5 + 2.5 * hash12(vec2(id, 9.9)));
  float jw = fract(hcoord + .3 * vnoise(vec2(hcoord * .5, vWPos.y * .2)));
  float joint = (1. - smoothstep(.0, .06 + fwidth(hcoord) * 1.5, min(jw, 1. - jw))) * step(.35, hash12(vec2(id, 4.4))) * (1. - scoria);
  vec3 a = mix(grey, red, scoria) * (1. - .15 * contact) * (1. - .3 * joint);
  wallBand = step(.7, hash12(vec2(id, 2.2))) * smoothstep(.75, .95, fr);   // some bed tops hold sulfur
  vec4 r = triS(tRgh, T, 2., 1.);
  alb = mix(alb, a, cliffW); rough = mix(rough, r.r * .5 + .45, cliffW); ao = mix(ao, r.g, cliffW);
  Nd = normalize(mix(Nd, triN(T, 2., Nm, 1.3 * uDetail, 1.), cliffW));
}
// ---- fresh flows: kit pahoehoe and 'a'a sets, high roughness, black-grey (no gloss)
float wFre = fresh * (1. - aaF), wAa = fresh * aaF;
if (wFre > .01) {
  vec4 r = triS(tRgh, T, 3., 1.);
  vec3 tf = mix(triS(tAlb, T, 3., 1.).rgb, triS(tAlb, T, 3., MACRO).rgb, .3);
  float sheen = triS(tRgh, T, 3., .35).r;                               // glassy vs dull patches (~10 m)
  vec3 a = vec3(dot(tf, vec3(.3, .55, .15))) * vec3(.97, .98, 1.02) * (.26 + .14 * smoothstep(.3, .7, r.b));
  float w = smoothstep(.0, .25, wFre - (r.b - .5) * .2);
  alb = mix(alb, a, w); rough = mix(rough, mix(.5, .86, smoothstep(.3, .7, sheen)) + .08 * r.r, w); ao = mix(ao, r.g, w);
  Nd = normalize(mix(Nd, triN(T, 3., Nm, 1.2 * uDetail, 1.), w));
}
if (wAa > .01) {
  vec4 r = triS(tRgh, T, 4., 1.);
  vec3 a = vec3(dot(mix(triS(tAlb, T, 4., 1.).rgb, triS(tAlb, T, 4., MACRO).rgb, .4), vec3(.3, .55, .15))) * .32 * vec3(1., .98, .97);
  float w = smoothstep(.0, .25, wAa - (r.b - .5) * .2);
  alb = mix(alb, a, w); rough = mix(rough, .93, w); ao = mix(ao, r.g, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.4 * uDetail, 1.), w));
}
float wCru = smoothstep(.02, .3, emit) * max(fresh, .5);
float crack = 0.;
if (wCru > .01) {
  vec4 r = triS(tRgh, T, 5., 1.);
  vec3 a = triS(tAlb, T, 5., 1.).rgb;
  alb = mix(alb, a * vec3(.3, .27, .27), wCru * .8); rough = mix(rough, .85, wCru);
  crack = r.b;
}
// ---- sulfur deposits (Pele plume fallout + fumarole crusts). The simulated amount has a smooth
// large-scale falloff; it is thresholded against TERRAIN: lows and flats hold crust, crests, steep
// faces and the dark flows shed it, so the zones break along the real relief. Edges are crisp at the
// Dallol micro-scale (the scan's own height field), never at a noise-blob scale.
float hD1 = triS(tRgh, T, 7., 1.).b, hD2 = triS(tRgh, T, 6., 1.).b;
float micro = (mix(hD1, hD2, smoothstep(.4, .7, hot)) - .5) * .16;
float ledge = smoothstep(.8, .93, Nmap.y);
float depWall = mix(1., (ledge * .85 + wallBand * .5) * (1. - fresh), smoothstep(.0, .55, cliffW));
// coverage: a moderate simulated amount already means continuous crust; only the fringe thins out
float flowNear = clamp(texture2D(tMA, muv, 3.5).g * 1.6, 0., 1.);   // ~20 m around the fresh flows
float terr = -smoothstep(.2, .45, tpi) * .35 - smoothstep(.0, .15, tpl) * .12 + smoothstep(.04, .3, -tpi) * .12 * (1. - flowNear) - smoothstep(.1, .32, slope) * .3;
float depUnder = clamp(dep / max(1. - .8 * fresh, .2), 0., 1.);          // the simulated fallout before burial
float depE = smoothstep(.04, .34, depUnder) * (1. - pyS) * mix(burial, 1., .1) * depWall * (1. - .45 * smoothstep(.25, .8, surfR));
// edges are where the terrain-weighted amount crosses the threshold (relief decides the shape); the
// Dallol micro height only roughens that edge by a few cm-scale steps, and the fringe fades softly
float vDep = depE - .45 + terr + micro * .35;
float flowLow = 1. - triS(tRgh, T, 3., 1.).b;                             // pahoehoe micro-lows
float vFl = mix(-1., (smoothstep(.55, .95, depUnder) * .4 - .62 + smoothstep(.55, .85, flowLow) * .3) - smoothstep(.1, .4, emit), smoothstep(.3, .8, fresh));
vDep = max(vDep, vFl);
float aaw = .02 + 1.2 * fwidth(vDep);
// crisp crust where the terrain-weighted amount is above threshold; below it a gradational thin dusting
// (no hard black/yellow camouflage edges at range)
// thin dusting follows the large-scale amount only (not the crest/low rule), so crests get a thin pale
// veneer instead of going bare black (no camouflage); thick crisp crust collects in lows and vent-facing slopes
// steep faces in the fallout zone: a thin, gradational veneer streaked down the fall line (fines that slid
// off the crest), so ridges grade from crusted lows to stained faces instead of bare black blotches
float depNoWall = smoothstep(.04, .34, depUnder) * (1. - pyS) * mix(burial, 1., .1);
vec2 fl_ = normalize(Nm.xz + 1e-4);
float streak = vnoise(vec2(dot(vWPos.xz, vec2(-fl_.y, fl_.x)) * .35, vWPos.y * .03));
// lee slopes: the sim leaves them nearly bare (incidence 0.15); a ~60 m average of the fallout gives
// them a thin veneer so ridges grade from crusted lows to stained lee faces, not black/yellow camouflage
float depBig = smoothstep(.04, .4, texture2D(tMB, muv, 5.).r) * (1. - pyS) * mix(burial, 1., .1) * (1. - fresh);
float dustW = max(smoothstep(.05, .45, max(depE, depBig * .7 * (1. - cliffW))) * .6 * (1. - .35 * smoothstep(.25, .5, slope)),
                  depBig * cliffW * (1. - smoothstep(.45, .65, hot)) * (.15 + .3 * smoothstep(.35, .75, streak)));
float wDep = max(smoothstep(-aaw, aaw, vDep), dustW);
if (wDep > .01) {
  // terrain-tied colour variety inside the deposit: fine fallout and condensate pool in the lows (paler,
  // yellow-cream), rises and rough flow tops stay hotter red-brown; plus the large-scale sim structure
  float lowness = smoothstep(.02, .25, -tpi), rise = smoothstep(.05, .3, tpi);
  float lowB = smoothstep(.0, .12, -tpl), riseB = smoothstep(.0, .12, tpl);
  // tonal mottling from the scan sets themselves (mixed-ochre at ~140 m and iron-red at ~30 m, anti-tiled):
  // red / orange / rust variation with metre-to-100 m structure that is not a noise blob
  float mM = dot(triS(tAlb, T, 9., MACRO).rgb, vec3(.3, .55, .15)), mR = dot(triS(tAlb, T, 7., .5).rgb, vec3(.3, .55, .15));
  float mG = dot(triS(tAlb, T, 9., .045).rgb, vec3(.3, .55, .15));          // ~650 m structure
  float mot = clamp((mM - .45) * 2.2 + (mR - .35) * 1.1 + (mG - .45) * 2.4, -1., 1.);
  float lowP = (lowness * .25 + lowB * .3) * (1. - flowNear);
  float h = clamp(hot + (hD1 - .5) * .08 + mot * .2 - lowP + rise * .06 + riseB * .05 - depAge * .22 + smoothstep(.2, .7, surfR) * .12, 0., 1.);
  vec3 tY = triS(tAlb, T, 6., 1.).rgb, tO = triS(tAlb, T, 9., 1.).rgb, tR = triS(tAlb, T, 7., 1.).rgb, tW = triS(tAlb, T, 8., 1.).rgb;
  // cream/white -> pale sulfur -> acid yellow -> orange -> vermilion red (short-chain sulfur)
  float z1 = smoothstep(.16, .22, h), z2 = smoothstep(.38, .46, h), z3 = smoothstep(.6, .7, h);
  vec3 tx = tW * vec3(1.02, 1., .95);
  tx = mix(tx, mix(tY, vec3(.95, .85, .35), .4), z1);
  tx = mix(tx, mix(tO, tY, .25) * vec3(1.2, .62, .3), z2);
  tx = mix(tx, mix(tR, tO, .2) * vec3(1.4, .5, .3), z3);
  vec3 tint = dallol(h);
  float lum = dot(tx, vec3(.3, .55, .15));
  vec3 a = mix(tx, tint * (.75 + .6 * lum), .42);
  // salt / SO2 flecks on the high points of the crust micro-relief (Dallol white), sparse and crisp
  float fl = smoothstep(.74, .8, hD2 + (hD1 - .5) * .3) * (1. - smoothstep(.85, 1., h)) * .7;
  a = mix(a, vec3(.88, .86, .78), fl);
  // thin veneer near the threshold lets the dark rock grain show through
  float thick = smoothstep(.0, .22, vDep);
  a *= .7 + .45 * smoothstep(-.4, .4, mot);
  // hue mottling inside the red/orange zone: rust where the scan structure is dark, ochre where bright
  float zr = smoothstep(.45, .7, h);
  vec3 rust = vec3(.4, .15, .07) * (.8 + .5 * lum), ochre = vec3(.66, .45, .17) * (.8 + .4 * lum);
  // terrain-tied: rough old lava and rises rust, smooth lows ochre/orange; plus the scan-set structure
  float mt = mot + smoothstep(.2, .7, surfR) * -.6 + tpl * 2.5;
  a = mix(a, rust, smoothstep(.0, .5, -mt) * .7 * zr);
  a = mix(a, ochre, smoothstep(.05, .55, mt) * .55 * zr);
  a = mix(vec3(dot(a, vec3(.3, .55, .15))), a, .88) * .88;
  // relief shading of the crust: darker in micro-lows and gullies, lighter on crests
  a *= .72 + .44 * smoothstep(-.3, .3, tpi) + .14 * smoothstep(-.1, .1, tpl);
  a *= .78 + .22 * smoothstep(.25, .85, dep);                              // thinner fallout: darker, rustier                                // rust-dark / bright patches
  a *= 1. + .14 * rise;                                                     // lighter crests
  // thin fallout over dark rock reads rust-brown (same hue family, darker), never beige/olive
  vec3 thinC = mix(a, vec3(.36, .16, .07) * (.8 + .4 * lum), .45) * .85;
  a = mix(thinC, a, thick);
  wDep *= .55 + .45 * thick;                                                // thin film: basalt shows through
  // desiccation-style polygon cracks in thick crust (thin dark lines, ~25 m cells, filtered with distance)
  vec2 pc = vWPos.xz * .04 + vec2(nA * 2.);
  float fwc = length(fwidth(pc));
  vec2 vc = voro(pc + vec2(vnoise(pc * 3.1), vnoise(pc * 2.7 + 4.)) * .35);
  float crk = (1. - smoothstep(.0, .03 + fwc * 1.5, vc.x)) * (1. - smoothstep(.04, .2, fwc)) * smoothstep(.45, .8, depE) * step(.35, vc.y);
  a *= 1. - .35 * crk;
  // older episode layers: duller, browner, slightly thinner crust
  a = mix(a, a * vec3(.82, .74, .66), depAge * .6);
  alb = mix(alb, a, wDep); rough = mix(rough, .82, wDep);
  Nd = normalize(mix(Nd, triN(T, h > .5 ? 7. : 6., Nm, .7 * uDetail, 1.), wDep * .8));
}
// fumarole crusts: narrow bright bands along the fissures, iron-stained fringe
float vFum = fum - .25 + micro * 1.5 - max(tpi, 0.) * .4; float aaf = .03 + 1.2 * fwidth(vFum);
float wFum = smoothstep(-aaf, aaf, vFum);
if (wFum > .01) {
  // fringe: orange-brown iron stain with white salt on the highs (no green terrace set: it read olive)
  vec3 tI = triS(tAlb, T, 9., 1.).rgb, tS = triS(tAlb, T, 8., 1.).rgb;
  vec3 a = mix(vec3(dot(tI, vec3(.33))) * vec3(1.05, .5, .2), vec3(dot(tS, vec3(.33))) * vec3(1.05, 1.0, .85), smoothstep(.66, .8, micro + .5 + fum * .3));
  alb = mix(alb, a, wFum * .45); rough = mix(rough, .8, wFum);
}
// faint SO2 cold-trap frost (and the frozen Viti floor)
float vFro = frost * (1. - smoothstep(.08, .3, slope) * .6) - .5 + micro - max(tpi, 0.) * .5; float aafr = .03 + 1.2 * fwidth(vFro);
float wFro = smoothstep(-aafr, aafr, vFro) * (1. - cliffW * (1. - ledge));
if (wFro > .01) {
  vec3 tW = triS(tAlb, T, 8., 1.).rgb;
  vec3 a = mix(vec3(.86, .87, .88), vec3(dot(tW, vec3(.33))) * vec3(1., 1., 1.03), .35);
  alb = mix(alb, a, wFro * .85); rough = mix(rough, .6, wFro);
}
// ---- lava emission: baked heat x crust crack pattern; glow only in cracks, throats and margins
vec3 sEmit = vec3(0.);
float lakeM = smoothstep(.3, .7, MX.a) * uLava * (1. - smoothstep(.06, .2, 1. - Ngeo.y)) * step(vWPos.y, uLakeY + 1.5);
if (lakeM > .01) {
  // LAVA LAKE (after Erta Ale / Halemaumau): mostly dark crust plates of strongly varying size (2-40 m),
  // rafted and rotated, slowly drifting; sparse open seams of varying width, torn and curved (domain
  // warp); a bright incandescent margin where the crust tears against the wall; subtle plate relief.
  vec2 q = vWPos.xz + vec2(vnoise(vWPos.xz * .04), vnoise(vWPos.xz * .04 + 7.)) * 9. + vec2(vnoise(vWPos.xz * .2), vnoise(vWPos.xz * .2 + 3.)) * 1.6;
  q += vec2(.6, .35) * uTime * .08;                                        // slow raft drift
  vec4 P1 = voro2(q / 36.), P2 = voro2(q / 10. + 3.1), P3 = voro2(q / 3.2 + 7.7);
  float split2 = step(.42, P1.y), split3 = split2 * step(.62, P2.y);       // some big plates broken up
  float e1 = P1.x * 36., e2 = mix(1e3, P2.x * 10., split2), e3 = mix(1e3, P3.x * 3.2, split3);
  float eM = min(e1, min(e2, e3));
  float lvl = e1 <= min(e2, e3) ? 1. : (e2 <= e3 ? 2. : 3.);
  float pid = lvl < 1.5 ? P1.y : (lvl < 2.5 ? P2.y : P3.y);
  vec2 poff = lvl < 1.5 ? P1.zw * 36. : (lvl < 2.5 ? P2.zw * 10. : P3.zw * 3.2);
  // seams: big-plate seams open more often and wider; width varies along the seam (torn)
  float openS = smoothstep(.55, .75, vnoise(q * .03 + pid * 3.) + (lvl < 1.5 ? .1 : -.15));
  float sw = (.12 + 1.6 * pow(vnoise(q * .09 + 1.3), 2.) * (lvl < 1.5 ? 1. : .5)) * openS;
  float fw = fwidth(eM) + .02;
  float seam = 1. - smoothstep(sw - fw, sw + fw * 1.5, eM);
  float halo = exp(-eM / (.5 + 2.5 * sw)) * openS * .18;
  // torn incandescent margin against the wall (baked emission core), broken into arcs
  float arcsL = smoothstep(.25, .55, vnoise(vWPos.xz * .05 + 7.) * .7 + vnoise(vWPos.xz * .19) * .3);
  float rimL = smoothstep(.6, .95, emit) * arcsL;
  float flick = .85 + .15 * sin(uTime * (.6 + pid * 1.4) + pid * 30.);
  float TtL = clamp(max(seam * (.55 + .4 * pid), rimL) * flick, 0., 1.);
  // plate surface: dark glassy crust, rotated per plate (rafted), per-plate tone; young small plates hotter
  float ang = pid * 6.283;
  mat2 Rm = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
  vec2 luv = Rm * (-poff) / 3.;
  vec3 ct = textureGrad(tAlb, vec3(luv, 5.), Rm * dFdx(-poff) / 3., Rm * dFdy(-poff) / 3.).rgb;
  vec3 plate = vec3(dot(ct, vec3(.3, .55, .15))) * vec3(.3, .28, .28) * (.6 + .7 * hash12(vec2(pid, 2.)));
  plate += vec3(.25, .04, .01) * smoothstep(2.5, 1., lvl) * .0;               // (no plate-wide glow)
  alb = mix(alb, plate, lakeM); rough = mix(rough, .55 + .3 * hash12(vec2(pid, 5.)), lakeM);
  // relief: each plate slightly tilted, seams sunken
  vec3 tilt = vec3(hash12(vec2(pid, 8.)) - .5, 0., hash12(vec2(pid, 9.)) - .5) * .35;
  Nd = normalize(mix(Nd, normalize(vec3(0., 1., 0.) + tilt), lakeM * (1. - seam)));
  sEmit += (blackbody(TtL) * TtL * mix(3.5, 9., rimL) + vec3(1., .28, .05) * halo * .6) * lakeM;
  alb *= 1. - .8 * TtL * lakeM;
}
emit *= 1. - lakeM;
if (emit > .003) {
  vec2 p1 = vWPos.xz * .07 + vec2(nA) * 1.5, p2 = vWPos.xz * .23 + 5.3;
  vec2 v1 = voro(p1), v2 = voro(p2);
  float w1 = .025 + .06 * emit, w2 = .015 + .04 * emit;
  float f1 = length(fwidth(p1)), f2 = length(fwidth(p2));
  float net = 1. - smoothstep(-f1, w1 + f1, v1.x);
  float fine = 1. - smoothstep(-f2, w2 + f2, v2.x);
  net = mix(net, w1 * 1.6, smoothstep(.15, .6, f1));
  fine = mix(fine, w2 * 1.6, smoothstep(.15, .6, f2));
  // crusted plates: the fine network only glows where the crust is young/hot; the coarse plate seams
  // are sparse (only some seams open); the molten margin is broken into arcs (after the I32 Pele image)
  float open_ = step(.45, v1.y);
  float pat = max(net * open_, fine * .7 * smoothstep(.45, .7, emit)) * (.45 + crack * 1.2) * smoothstep(.06, .2, emit);
  float arcs = smoothstep(.3, .5, vnoise(vWPos.xz * .045 + 7.) * .7 + vnoise(vWPos.xz * .17) * .3);
  float core = smoothstep(.62, .97, emit) * arcs;             // molten margin, broken
  pat = mix(pat, 1., core);
  float pulse = .8 + .2 * sin(uTime * (.7 + v1.y * 1.3) + v1.y * 40.) * (.6 + .4 * vnoise(vWPos.xz * .05 + uTime * .1));
  float Tt = clamp(emit * pat * pulse, 0., 1.);
  sEmit = blackbody(Tt) * Tt * 16.;
  alb *= 1. - .7 * Tt;
}
// incandescent fissures: jagged en-echelon segments with crust bridges and varying intensity
for (int i = 0; i < 8; i++) {
  if (i >= uNF) break;
  vec2 A = uFiss[i].xy, B = uFiss[i].zw, P = vWPos.xz;
  vec2 AB = B - A; float L = length(AB); vec2 u = AB / L, nrm = vec2(-u.y, u.x);
  float along = dot(P - A, u), acr = dot(P - A, nrm);
  if (along < -10. || along > L + 10. || abs(acr) > 30.) continue;
  float segL = 26.;
  float sid = floor(along / segL), sf = fract(along / segL);
  float hs = hash12(vec2(sid, float(i) * 7.1));
  float off = (hs - .5) * 7. + (sf - .5) * 3. * sign(hs - .5);         // en-echelon step + slight obliquity
  float jag = (vnoise(vec2(along * .9, float(i))) - .5) * .9 + (vnoise(vec2(along * 3.1, 3. + float(i))) - .5) * .35;
  float d = abs(acr - off - jag);
  float on = .5 + .5 * sin(along / L * uFissP[i].x * 6.2832 + uFissP[i].y);
  float bridge = step(.28, hs) * smoothstep(.0, .08, sf) * smoothstep(1., .9, sf) * step(0., along) * step(along, L);
  float w = (.25 + .8 * vnoise(vec2(along * .2, 9.1 + float(i)))) * (.5 + .5 * on);
  float fw = fwidth(d);
  float core = (1. - smoothstep(w - fw, w + fw * 1.5, d)) * bridge;
  float flick = .8 + .2 * sin(uTime * 3.1 + along * .7) * vnoise(vec2(along * .4 - uTime * .6, 1.));
  float Tt = clamp((.35 + .65 * on * hs) * core * flick, 0., 1.);
  sEmit += blackbody(Tt) * Tt * 14. * uLava;
  sEmit += vec3(1., .25, .05) * exp(-d / 1.5) * (.15 + .4 * on) * .3 * bridge * uLava;
  alb *= 1. - .8 * core;
}
for (int i = 0; i < 16; i++) {
  if (i >= uNV) break;
  float d = length(vWPos.xz - uVG[i].xy);
  if (d > uVG[i].z * 4.) continue;
  float fw = fwidth(d);
  float ang = atan(vWPos.z - uVG[i].y, vWPos.x - uVG[i].x);
  float rr = uVG[i].z * (.5 + .12 * sin(ang * 5. + float(i)) + .06 * sin(ang * 11.));   // ragged throat
  float core = 1. - smoothstep(rr - fw, rr + fw, d);
  float flick = .85 + .15 * sin(uTime * 2.3 + float(i) * 1.7);
  sEmit += blackbody(.9 * flick) * core * 18. * flick * uLava + vec3(1., .3, .06) * exp(-d / uVG[i].z) * .4 * uLava;
}
sEmit += vec3(1., .35, .08) * ME.b * .03 * uLava;
float sRough = clamp(rough, .3, 1.);
diffuseColor.rgb = alb;
vec3 sN = Nd;
float sAO = MA.r;
float sIrr = ME.g * ME.g * uIrr * uLava * (1. - .95 * lakeM);         // the lake does not light its own crust

if (uDebug == 1) { diffuseColor.rgb = vec3(dep, hot * dep, frost) + vec3(0., 0., pyro * .5); }
else if (uDebug == 2) { diffuseColor.rgb = vec3(fresh, aaF, pyro); }
else if (uDebug == 3) { diffuseColor.rgb = Nm * .5 + .5; }
else if (uDebug == 4) { diffuseColor.rgb = vec3(emit, ME.g, fum); }
else if (uDebug == 5) { diffuseColor.rgb = vec3(sAO); }
else if (uDebug == 6) { diffuseColor.rgb = alb * 2.; }
else if (uDebug == 7) { diffuseColor.rgb = vec3(wDep, wPy, wFum); }
else if (uDebug == 8) { diffuseColor.rgb = vec3(cliffW, wFro, fresh); }
`;

const AO_FRAGMENT = /* glsl */ `
float aoV = mix(1., sAO, .9) * mix(1., ao, .5);
reflectedLight.indirectDiffuse *= aoV;
reflectedLight.indirectSpecular *= aoV;
// baked lava irradiance (warm bounce light from glowing lava onto the surrounding ground)
reflectedLight.indirectDiffuse += sIrr * uLavaColor * diffuseColor.rgb * 1.2;
if (uDebug > 0) { reflectedLight.directDiffuse = diffuseColor.rgb * .9; reflectedLight.indirectDiffuse = vec3(0.); reflectedLight.directSpecular = vec3(0.); reflectedLight.indirectSpecular = vec3(0.); }
`;
