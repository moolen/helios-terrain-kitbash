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
uniform sampler2D tME;      // r lava emission, g lava irradiance, b fumarole heat, a tube / skylight
uniform sampler2DArray tAlb, tNrm, tRgh;
uniform float uSize, uTime, uLava, uDeposit, uDetail, uIrr, uGeoN, uRegional, uDepScale;
uniform int uDebug;
uniform vec3 uLavaColor;
uniform vec4 uFiss[32]; uniform vec2 uFissP[32]; uniform int uNF;
uniform sampler2D tMC;   // r talus apron, g spatter-cone / scoria, b fissure light, a spare
uniform vec3 uVG[16]; uniform int uNV;
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
  vec3 c3 = vec3(.80, .42, .07);   // orange
  vec3 c4 = vec3(.55, .16, .05);   // red short-chain sulfur
  vec3 c = mix(c0, c1, smoothstep(.0, .25, h));
  c = mix(c, c2, smoothstep(.25, .5, h));
  c = mix(c, c3, smoothstep(.5, .75, h));
  c = mix(c, c4, smoothstep(.75, 1., h));
  return c;
}
vec3 blackbody(float t) { // 0..1 -> dull red .. yellow-white (linear, unscaled)
  return vec3(1., .18 + .55 * t, .03 + .35 * t * t) * (0.4 + 2.6 * t * t);
}
`;

export function terrainMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 });
  const uniforms = {
    tGN: { value: tex.gn }, tMA: { value: tex.ma }, tMB: { value: tex.mb }, tME: { value: tex.me },
    tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh },
    uSize: { value: 7168 }, uTime: { value: 0 }, uLava: { value: 1 }, uDeposit: { value: 1 }, uDetail: { value: 1 },
    uIrr: { value: 1 }, uGeoN: { value: 1 }, uRegional: { value: 0.0 }, uDepScale: { value: 0.9 }, uFiss: { value: Array.from({ length: 32 }, () => new THREE.Vector4()) }, uFissP: { value: Array.from({ length: 32 }, () => new THREE.Vector2()) }, tMC: { value: tex.mc }, uNF: { value: 0 }, uVG: { value: Array.from({ length: 16 }, () => new THREE.Vector3()) }, uNV: { value: 0 }, uTile: { value: tex.tiles }, uDebug: { value: 0 }, uLavaColor: { value: new THREE.Color(1.0, 0.32, 0.06) },
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
  mat.customProgramCacheKey = () => "io-a-terrain";
  return mat;
}

const MAP_FRAGMENT = /* glsl */ `
vec2 muv = (vWPos.xz + uSize * .5) / uSize;
vec4 MA = texture2D(tMA, muv), MB = texture2D(tMB, muv), ME = texture2D(tME, muv), MC = texture2D(tMC, muv);
float edgeD = uSize * .5 - max(abs(vWPos.x), abs(vWPos.z));
float edgeF = 1. - smoothstep(0., 450., edgeD);      // fade detail toward the coarse context apron
vec3 gn = texture2D(tGN, muv, edgeF * 3.).rgb * 2. - 1.;
vec3 Nmap = normalize(vec3(gn.r, gn.b, gn.g));
vec3 Ngeo = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
if (Ngeo.y < 0.) Ngeo = -Ngeo;
float steepG = smoothstep(.72, .42, Ngeo.y);
vec3 Nm = normalize(mix(Nmap, Ngeo, steepG * uGeoN * (1. - edgeF)));
float slope = 1. - Nm.y;

// ---- masks
float nA = fbm(vWPos.xz * .013), nB = fbm(vWPos.xz * .07 + 3.1);
float fresh = MA.g, aaF = MA.b;
float dep = MB.r * uDeposit, hot = MB.g, frost = MB.b * uDeposit, fum = MB.a * uDeposit;
float talusM = MC.r, coneM = MC.g;
float cliffW = smoothstep(.30, .62, slope + (nB - .5) * .12);
float emit = ME.r * uLava;
Tri T = triSetup(vWPos, Nm);
const float MACRO = .21;   // second, larger scale against repetition

// ---- old basalt ground: dark grey-brown, two scan textures mixed at macro scale
vec4 hBas = triS(tRgh, T, 0., 1.);
float mB = smoothstep(.35, .65, fbm(vWPos.xz * .0031 + 2.7));
// round 3: sunlit basalt reads mid-dark grey; texture luminance only, a faint warm cast
vec3 bA = triS(tAlb, T, 0., 1.).rgb, bB = triS(tAlb, T, 10., 1.).rgb, bM = triS(tAlb, T, 0., MACRO).rgb;
float lA = dot(bA, vec3(.3, .55, .15)), lB = dot(bB, vec3(.3, .55, .15)) * 2.6, lM = dot(bM, vec3(.3, .55, .15));
vec3 alb = vec3(mix(mix(lA, lB, mB * .25), lM, .3)) * .42 * vec3(1., .97, .93);
float rough = mix(.92, hBas.r, .6);
float ao = hBas.g;
vec3 Nd = triN(T, 0., Nm, .9 * uDetail, 1.);
// talus aprons at wall feet / bench edges: lighter, coarse rubble so the aprons read at range
if (talusM > .02) {
  vec3 a = mix(triS(tAlb, T, 4., 1.).rgb, triS(tAlb, T, 2., .5).rgb, .5) * vec3(.62, .6, .58);
  float w = smoothstep(.1, .7, talusM) * (1. - cliffW * .7);
  alb = mix(alb, a, w); rough = mix(rough, .93, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.4 * uDetail, 1.), w));
}
// ---- walls: horizontal lava-flow layering, 2-10 m beds of dark grey basalt and reddish-brown scoria
float ledge = smoothstep(.78, .92, Nmap.y);
if (cliffW > .01) {
  // stacked lava flows keyed to absolute elevation with a slight regional dip, so beds continue across
  // benches. Bed boundaries come from a non-uniform warp (0.5-12 m beds), lateral noise makes beds pinch
  // out and form lenses; mostly grey-on-grey, occasional reddish-brown scoria/clinker; vertical cooling
  // joints in the massive beds.
  float yb = vWPos.y + vWPos.x * .012 - vWPos.z * .006;
  float lat = vnoise(vWPos.xz * .006) * 2. + vnoise(vWPos.xz * .025) * .6;
  float u = yb / 5. + 1.1 * fbm(vec2(yb * .045, 1.3)) + .6 * fbm(vec2(yb * .21, 4.7)) + lat;
  float id = floor(u), fr = fract(u);
  float hb = hash12(vec2(id, 7.1)), tone = hash12(vec2(id, 3.3));
  float lens = smoothstep(.55, .75, vnoise(vec2(dot(vWPos.xz, vec2(.7, .7)) * .02, id)));     // lateral lenses
  float scoria = step(.84, hb) * lens;
  float fw_ = fwidth(u) * 1.5;
  float contact = (1. - smoothstep(.0, .03 + fw_, min(fr, 1. - fr))) * step(.5, hash12(vec2(id, 1.7)));
  vec3 gtex = mix(triS(tAlb, T, 2., 1.).rgb, triS(tAlb, T, 2., .17).rgb, .5);
  float gl = dot(gtex, vec3(.3, .55, .15));
  vec3 grey = vec3(gl) * vec3(1., .98, .95) * (.55 + .7 * tone) * .62;
  vec3 red = vec3(dot(mix(triS(tAlb, T, 1., 1.).rgb, triS(tAlb, T, 1., .3).rgb, .5), vec3(.33))) * vec3(.62, .44, .36);
  // columnar joints: vertical dark lines, spacing 1.5-4 m per bed, along the wall's horizontal direction
  vec2 tg = normalize(vec2(-Nm.z, Nm.x) + 1e-4);
  float hcoord = dot(vWPos.xz, tg) / (1.5 + 2.5 * hash12(vec2(id, 9.9)));
  float jw = fract(hcoord + .3 * vnoise(vec2(hcoord * .5, vWPos.y * .2)));
  float joint = (1. - smoothstep(.0, .06 + fwidth(hcoord) * 1.5, min(jw, 1. - jw))) * step(.35, hash12(vec2(id, 4.4))) * (1. - scoria);
  vec3 a = mix(grey, red, scoria) * (1. - .15 * contact) * (1. - .3 * joint);
  vec4 r = triS(tRgh, T, 2., 1.);
  alb = mix(alb, a, cliffW); rough = mix(rough, mix(r.r, .95, scoria), cliffW); ao = mix(ao, r.g, cliffW);
  Nd = normalize(mix(Nd, triN(T, scoria > .5 ? 1. : 2., Nm, 1.2 * uDetail, 1.), cliffW));
}
// ---- spatter cones: scoria and spatter
if (coneM > .02 && fresh < .5) {
  vec3 a = mix(triS(tAlb, T, 1., 1.).rgb * vec3(.5, .33, .26), triS(tAlb, T, 4., 1.).rgb * vec3(.35, .3, .3), smoothstep(.4, .6, nB));
  float w = smoothstep(.05, .4, coneM);
  alb = mix(alb, a, w); rough = mix(rough, .96, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.3 * uDetail, 1.), w));
}
// ---- fresh flow: rough 'a'a clinker and pahoehoe; glassy sheen only in small pahoehoe patches
float wFre = fresh * (1. - aaF), wAa = fresh * aaF;
if (wFre > .01) {
  vec4 r = triS(tRgh, T, 3., 1.);
  vec3 a = mix(triS(tAlb, T, 3., 1.).rgb, triS(tAlb, T, 3., MACRO).rgb, .35) * vec3(.34, .34, .36);
  float w = smoothstep(.0, .25, wFre - (r.b - .5) * .2);
  float glass = smoothstep(.82, .88, vnoise(vWPos.xz * .09 + 4.) * .7 + r.b * .3) * .7;
  alb = mix(alb, a, w); rough = mix(rough, mix(.86 + .1 * r.r, .62, glass), w); ao = mix(ao, r.g, w);
  Nd = normalize(mix(Nd, triN(T, 3., Nm, 1.2 * uDetail, 1.), w));
}
if (wAa > .01) {
  vec4 r = triS(tRgh, T, 4., 1.);
  vec3 a = mix(triS(tAlb, T, 4., 1.).rgb, triS(tAlb, T, 4., MACRO).rgb, .4) * vec3(.45, .42, .42);
  float w = smoothstep(.0, .25, wAa - (r.b - .5) * .2);
  alb = mix(alb, a, w); rough = mix(rough, .94, w); ao = mix(ao, r.g, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.7 * uDetail, 1.), w));
}
float wCru = smoothstep(.04, .3, emit) * fresh * (1. - coneM);
float crack = 0.;
if (wCru > .01) {
  vec4 r = triS(tRgh, T, 5., 1.);
  vec3 a = triS(tAlb, T, 5., 1.).rgb;
  alb = mix(alb, a * vec3(.3, .27, .27), wCru * .7); rough = mix(rough, .85, wCru);
  crack = r.b;
}
// ---- sulfur deposits (round 2). Large-scale coverage comes only from the simulation (soft falloff of
// the concentric plume zones and the fault bands); the crisp edges come from the Dallol scans' own
// metre-scale height at real scale: a crust covers the micro-lows first, so a cell with 40 % coverage
// shows 40 % of its micro-relief crusted. No mid-frequency blob noise.
float m1 = triS(tRgh, T, 6., 2.6).b, m2 = triS(tRgh, T, 8., 2.6).b, m3 = triS(tRgh, T, 7., 2.6).b;   // metre-scale crust relief
float micro = clamp((m1 * .5 + m2 * .3 + m3 * .2 - .5) * 1.7 + .5, 0., 1.);
float onWall = cliffW * (1. - ledge);
float depE = dep * uDepScale * (1. - onWall * .97) * (1. - talusM * .6) * (1. - smoothstep(.15, .35, slope) * .6);
float cover = smoothstep(.22, .85, depE);
float vDep = cover - (1. - micro) - smoothstep(.6, .85, hot) * smoothstep(.35, .65, 1. - m3 * .6 - triS(tRgh, T, 7., .8).b * .4) * .22;
float aaw = .05 + 1.5 * fwidth(vDep);
float wDep = smoothstep(-aaw, aaw, vDep);
float dust = smoothstep(-.32, -.02, vDep) * smoothstep(.02, .3, cover);      // thin dusting around crusts
float camD = length(vWPos - cameraPosition);
float farF = smoothstep(700., 2200., camD) * .8;                                    // beyond ~1 km: average, no grain
wDep = mix(wDep, cover * .85, farF); float thickFar = farF; dust = mix(dust, 0., farF);
// fumarole streaks may run down a wall (condensate below a hot fracture)
float streakW = onWall * smoothstep(.15, .5, fum + MB.r * hot * .5) * smoothstep(.55, .75, fbm(vec2(dot(vWPos.xz, normalize(vec2(-Nmap.z, Nmap.x) + 1e-4)) * .25, vWPos.y * .02)));
wDep = max(wDep, streakW * .8);
if (wDep > .01 || dust > .01) {
  float h = clamp(hot + (m1 - .5) * .12, 0., 1.);
  vec3 tY = triS(tAlb, T, 6., 1.).rgb, tO = triS(tAlb, T, 9., 1.).rgb, tR = triS(tAlb, T, 7., 1.).rgb, tW = triS(tAlb, T, 8., 1.).rgb;
  vec3 tG = triS(tAlb, T, 11., 1.).rgb;
  float z1 = smoothstep(.16, .22, h), z2 = smoothstep(.42, .48, h), z3 = smoothstep(.66, .72, h);
  vec3 tx = mix(tW * 1.1, tG, smoothstep(.6, .8, nA) * .2);
  tx = mix(tx, mix(tY * vec3(1.05, .95, .8), vec3(1., .8, .16), .6), z1);
  tx = mix(tx, mix(tO, vec3(.98, .55, .12), .55), z2);
  tx = mix(tx, mix(tR, vec3(.75, .2, .06), .5), z3);
  vec3 tint = dallol(h);
  float lum = dot(tx, vec3(.3, .55, .15));
  vec3 a = mix(tx, tint * (.8 + .5 * lum), .55) * 1.12;
  a = max(mix(vec3(dot(a, vec3(.3, .55, .15))), a, 1.3), 0.);   // Dallol saturation
  // thickness gradation: rim of the crust thin and translucent, then bright, thick crust in the lows
  float thick = smoothstep(.0, .2, vDep);
  float rim = smoothstep(.0, .06, vDep) * (1. - smoothstep(.06, .2, vDep));
  // thin crust: paler and less saturated (sulfur film), never a grey-yellow mix (that reads olive)
  vec3 thin = mix(vec3(dot(a, vec3(.3, .55, .15))) * vec3(1.02, .95, .8), a, .78) * .88;
  a = mix(thin, a, max(thick, thickFar)) + rim * .05;
  vec3 dustC = mix(alb, vec3(dot(a, vec3(.3, .55, .15))) * vec3(1.05, .98, .84), .35);
  alb = mix(mix(alb, dustC, dust), a, wDep); rough = mix(rough, .85, wDep);
  // the crust surface is smoother than the rock: it fills the micro-lows, so the rock's detail normal
  // fades out with thickness and the Dallol normal takes over
  vec3 Nc = triN(T, h > .4 ? 6. : 8., Nm, .9 * uDetail, 2.6);
  Nd = normalize(mix(Nd, mix(Nm, Nc, .5 + .5 * thick), wDep * (1. - farF * .5)));
  ao = mix(ao, 1., wDep * thick);
}
// iron-stained / salt fringe of the fumarole bands
float vFum = smoothstep(.1, .7, fum) - (1. - micro); float aaf = .04 + 1.5 * fwidth(vFum);
float wFum = smoothstep(-aaf, aaf, vFum) * (1. - onWall);
if (wFum > .01) {
  vec3 tI = triS(tAlb, T, 7., 1.).rgb, tT = triS(tAlb, T, 12., 1.).rgb;
  vec3 a = mix(tI, tT, smoothstep(.3, .7, fum + (nB - .5) * .3));
  alb = mix(alb, a * vec3(.9, .78, .66), wFum * .85); rough = mix(rough, .8, wFum);
}
// faint SO2 frost in cold traps only
float vFro = smoothstep(.25, .9, frost) * .6 - (1. - micro); float aafr = .04 + 1.5 * fwidth(vFro);
float wFro = smoothstep(-aafr, aafr, vFro) * (1. - cliffW);
if (wFro > .01) {
  vec3 a = mix(vec3(.78, .78, .76), triS(tAlb, T, 8., 1.).rgb, .4);
  alb = mix(alb, a, wFro * .6); rough = mix(rough, .6, wFro);
}
// ---- lava emission: crack glow only on the youngest crust (sparse: a fraction of the crust plates
// have glowing seams), hot lobe fronts / breakouts and the lake margin from the baked emission map.
vec3 sEmit = vec3(0.);
if (emit > .003) {
  vec2 p1 = vWPos.xz * .07 + nB * 1.5, p2 = vWPos.xz * .23 + 5.3;
  vec2 v1 = voro(p1), v2 = voro(p2);
  float w1 = .03 + .06 * emit, w2 = .02 + .04 * emit;
  float f1 = length(fwidth(p1)), f2 = length(fwidth(p2));
  float net = 1. - smoothstep(-f1, w1 + f1, v1.x);
  float fine = 1. - smoothstep(-f2, w2 + f2, v2.x);
  net = mix(net, w1 * 1.6, smoothstep(.15, .6, f1));
  fine = mix(fine, w2 * 1.6, smoothstep(.15, .6, f2));
  float sparse = step(.55 - .5 * smoothstep(.3, .7, emit), v1.y);
  float pat = max(net, fine * .6 * sparse) * sparse * (.6 + crack * 1.2) * smoothstep(.04, .2, emit) * (1. - coneM) * (1. - smoothstep(.2, .4, slope));
  float core = smoothstep(.55, .95, emit);
  pat = mix(pat, 1., core);
  float pulse = .8 + .2 * sin(uTime * (.7 + v1.y * 1.3) + v1.y * 40.) * (.6 + .4 * vnoise(vWPos.xz * .05 + uTime * .1));
  float Tt = clamp(emit * pat * pulse, 0., 1.);
  sEmit = blackbody(Tt) * Tt * 16.;
  alb *= 1. - .7 * Tt;
}
// ---- eruptive fissures: en-echelon slots (baked list), jagged, varying width, crust bridges,
// intensity varying along the slot, spatter on the lips
for (int i = 0; i < 32; i++) {
  if (i >= uNF) break;
  vec2 A = uFiss[i].xy, B = uFiss[i].zw, P = vWPos.xz;
  vec2 AB = B - A; float L = length(AB); vec2 u = AB / L, nrm = vec2(-u.y, u.x);
  float along = dot(P - A, u);
  if (along < -10. || along > L + 10.) continue;
  float seed = float(i) * 7.31;
  float off = (vnoise(vec2(along * .3, seed)) - .5) * 1.4 + (vnoise(vec2(along * 1.3, seed + 2.)) - .5) * .4;
  float d = abs(dot(P - A, nrm) - off);
  if (d > 14.) continue;
  float endT = smoothstep(0., 3., along) * smoothstep(L, L - 3., along);
  float w = uFissP[i].y * (.35 + .9 * vnoise(vec2(along * .18, seed + 5.))) * endT;
  float bridge = smoothstep(.18, .3, vnoise(vec2(along * .14, seed + 9.)));
  float inten = uFissP[i].x * (.35 + .65 * vnoise(vec2(along * .05, seed + 13.)));
  float fw = fwidth(d);
  float core = (1. - smoothstep(w - fw, w + fw * 1.5, d)) * bridge;
  float flick = .85 + .15 * sin(uTime * 3.1 + along * .7) * vnoise(vec2(along * .4 - uTime * .6, seed));
  float Tt = clamp(inten * core * flick, 0., 1.);
  sEmit += blackbody(Tt) * Tt * 5. * uLava;
  sEmit += vec3(1., .22, .04) * exp(-max(d - w, 0.) / 1.2) * inten * bridge * .25 * uLava;
  alb *= 1. - .85 * core;
  // spatter on the lips: clots within ~6 m, the nearest still dull red
  vec2 sp = voro(P * 1.1 + seed);
  float clot = step(.82, sp.y) * (1. - smoothstep(.0, .25, sp.x)) * (1. - smoothstep(2., 6., d));
  alb = mix(alb, vec3(.05, .04, .04), clot * .8);
  sEmit += vec3(1., .2, .03) * clot * (1. - smoothstep(1., 3., d)) * inten * 1.5 * uLava;
}
for (int i = 0; i < 16; i++) {
  if (i >= uNV) break;
  float d = length(vWPos.xz - uVG[i].xy);
  if (d > uVG[i].z * 4.) continue;
  float ang = atan(vWPos.z - uVG[i].y, vWPos.x - uVG[i].x);
  float rr = uVG[i].z * .55 * (.8 + .35 * vnoise(vec2(ang * 2. + float(i), 1.)));
  float fw = fwidth(d);
  float core = 1. - smoothstep(rr - fw, rr + fw, d);
  float flick = .85 + .15 * sin(uTime * 2.3 + float(i) * 1.7);
  sEmit += blackbody(.8 * flick) * core * 2.2 * flick * uLava + vec3(1., .3, .06) * exp(-d / uVG[i].z) * .3 * uLava;
}
sEmit += vec3(1., .35, .08) * ME.b * .03 * uLava;
sEmit = min(sEmit, vec3(6., 3.5, 1.5));   // keep HDR peaks bounded: the bloom kernel is truncated and turns extreme points into squares
float sRough = clamp(rough, .08, 1.);
diffuseColor.rgb = alb;
vec3 sN = Nd;
float sAO = MA.r;
float sIrr = ME.g * ME.g * uIrr * uLava;

if (uDebug == 1) { diffuseColor.rgb = vec3(dep, hot * dep, frost); }
else if (uDebug == 2) { diffuseColor.rgb = vec3(fresh, aaF, coneM); }
else if (uDebug == 3) { diffuseColor.rgb = Nm * .5 + .5; }
else if (uDebug == 4) { diffuseColor.rgb = vec3(emit, ME.g, fum); }
else if (uDebug == 5) { diffuseColor.rgb = vec3(sAO); }
else if (uDebug == 6) { diffuseColor.rgb = vec3(wDep); }
`;

const AO_FRAGMENT = /* glsl */ `
float aoV = mix(1., sAO, .9) * mix(1., ao, .5);
reflectedLight.directSpecular *= .45;   // dusty basalt: weak forward sheen at grazing sun
reflectedLight.indirectDiffuse *= aoV;
reflectedLight.indirectSpecular *= aoV;
// baked lava irradiance (warm bounce light from glowing lava onto the surrounding ground)
reflectedLight.indirectDiffuse += sIrr * uLavaColor * diffuseColor.rgb * 1.2;
if (uDebug > 0) { reflectedLight.directDiffuse = diffuseColor.rgb * .9; reflectedLight.indirectDiffuse = vec3(0.); reflectedLight.directSpecular = vec3(0.); reflectedLight.indirectSpecular = vec3(0.); }
`;
