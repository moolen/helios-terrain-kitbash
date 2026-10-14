import * as THREE from "three";

// Terrain material: MeshStandardMaterial with the lighting kept stock (CSM shadows, tone mapping) and
// the surface replaced by a baked-map + tiling-PBR layer stack:
//  * macro normal from the 1 m DEM normal map; on steep faces the flat geometric normal of the
//    error-bounded mesh takes over so walls stay faceted and crisp;
//  * triplanar projection of every tiling layer (top-only where flat), two scales against repetition;
//  * layer weights from terrain-derived masks for dust, scree, bedrock, lava plains,
//    cones, exposed deposits and possible thermal cells.


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

export const GLSL_COMMON = /* glsl */ `
uniform sampler2D tGN;      // world normal, 2 m: rgb = (nx, nz, ny) * 0.5 + 0.5
uniform float uOctNormal;   // octahedral RG encoding; reconstruct upper-hemisphere height
uniform sampler2D tMA;      // r sky visibility, g dust cover, b sand / dust lows, a wind streak
uniform sampler2D tMB;      // r cliff band, g talus apron, b platy lava, a rootless cone
uniform sampler2D tMC;      // r thermal cell, g deposit, b hub pad, a fine topographic position
uniform sampler2DArray tAlb, tNrm, tRgh;
uniform float uSize, uTime, uDetail, uGeoN, uDust, uGameplay;
uniform int uDebug;
uniform vec3 cSoil, cDust, cSlope, cBed, cSand, cLight, cBasalt;
varying vec3 vWPos;

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
uniform float uTile[16]; uniform float uMeanL[16];
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
// Side projections used to repeat the same two-metre basalt square. Offset
// whole source patches without rotating their tangent frame. Explicit source
// derivatives preserve mip selection across the offset blend.
vec4 sideTile(sampler2DArray s, vec2 uv, vec4 g, float layer, float topWeight) {
  // Preserve gentle terrain sampling; this round targets steep wall faces.
  if (topWeight >= .7) return textureGrad(s, vec3(uv, layer), g.xy, g.zw);
  float k = vnoise(uv * .037) * 7. + vnoise(uv * .0091 + 13.) * 5.;
  float i = floor(k), f = fract(k);
  vec2 a = sin(vec2(3., 7.) * i) * 7.31;
  vec2 b = sin(vec2(3., 7.) * (i + 1.)) * 7.31;
  vec4 local = mix(textureGrad(s, vec3(uv + a, layer), g.xy, g.zw),
             textureGrad(s, vec3(uv + b, layer), g.xy, g.zw), smoothstep(.2, .8, f));
  // A partially resolved tile still repeats after offset blending. Fade its
  // side detail to the source's own terminal mip before it becomes a grid.
  float footprint = max(length(g.xy), length(g.zw));
  float lastMip = log2(float(max(textureSize(s, 0).x, textureSize(s, 0).y)));
  return mix(local, textureLod(s, vec3(.5, .5, layer), lastMip), smoothstep(.06, .35, footprint));
}
vec4 triS(sampler2DArray s, Tri t, float layer, float sc) {
  float it = sc / uTile[int(layer)];
  vec4 c = vec4(0.);
  if (t.w.y > 0.) c += t.w.y * antiTile(s, t.uvy * it, t.gy * it, layer, t.k);
  if (t.w.x > 0.) c += t.w.x * sideTile(s, t.uvx * it, t.gx * it, layer, t.w.y);
  if (t.w.z > 0.) c += t.w.z * sideTile(s, t.uvz * it, t.gz * it, layer, t.w.y);
  return c;
}
// whiteout-blended triplanar normal (Golus), returns world-space normal
vec3 triN(Tri t, float layer, vec3 n, float strength, float sc) {
  float it = sc / uTile[int(layer)];
  float footprint = max(length(dFdx(vWPos)), length(dFdy(vWPos))) * it;
  // Fade unresolved side detail; the geometric wall normal stays sharp.
  if (t.w.y < .7) strength *= 1. - (1. - t.w.y) * smoothstep(.12, .65, footprint);
  vec3 r = vec3(0.);
  if (t.w.y > 0.) { vec2 tn = (antiTile(tNrm, t.uvy * it, t.gy * it, layer, t.k).xy * 2. - 1.) * strength; tn.y = -tn.y;
    vec3 a = vec3(tn.x + n.x, abs(n.y), tn.y + n.z); r += t.w.y * vec3(a.x, a.y * sign(n.y), a.z); }
  if (t.w.x > 0.) { vec2 tn = (sideTile(tNrm, t.uvx * it, t.gx * it, layer, t.w.y).xy * 2. - 1.) * strength;
    vec3 a = vec3(abs(n.x), tn.y + n.y, tn.x + n.z); r += t.w.x * vec3(a.x * sign(n.x), a.y, a.z); }
  if (t.w.z > 0.) { vec2 tn = (sideTile(tNrm, t.uvz * it, t.gz * it, layer, t.w.y).xy * 2. - 1.) * strength;
    vec3 a = vec3(tn.x + n.x, tn.y + n.y, abs(n.z)); r += t.w.z * vec3(a.x, a.y, a.z * sign(n.z)); }
  return normalize(r);
}

// palette-locked colour: texture luminance relative to its mean drives a measured Mars colour
vec3 pal(vec3 tex, float meanL, vec3 c) { return c * clamp(dot(tex, vec3(.3, .55, .15)) / meanL, .35, 2.2); }
`;

export function terrainMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  const C = (h) => new THREE.Color(h);   // sRGB hex -> linear
  const uniforms = {
    tGN: { value: tex.gn }, tMA: { value: tex.ma }, tMB: { value: tex.mb }, tMC: { value: tex.mc },
    uOctNormal: { value: tex.octNormalLevels || 0 },
    tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh },
    uSize: { value: 12288 }, uTime: { value: 0 }, uDetail: { value: 1 }, uGeoN: { value: 1 }, uDust: { value: 1 }, uGameplay: { value: 0 },
    uTile: { value: tex.tiles }, uMeanL: { value: tex.meanL }, uDebug: { value: 0 },
    // measured natural-colour palette (mars-jezero-kit colour-refs)
    cSoil: { value: C(0x7e5e44) }, cDust: { value: C(0x714628) }, cSlope: { value: C(0xa57a59) }, cBed: { value: C(0x755139) },
    cSand: { value: C(0x5c4027) }, cLight: { value: C(0xb58561) }, cBasalt: { value: C(0x5f4c3e) },
  };
  mat.userData.uniforms = uniforms;
  mat.userData.hook = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; attribute vec3 aCliffOutward; varying vec3 vCliffOutward;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz; vCliffOutward = aCliffOutward;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vCliffOutward;\n" + GLSL_COMMON)
      .replace("#include <map_fragment>", MAP_FRAGMENT + `\n
        // Recessed faces between scan modules follow the measured outward
        // direction. Their neutral basalt has no repeating side tile.
        if (length(vCliffOutward) > .7 && abs(Ngeo.y) < .45) {
          sN = normalize(vCliffOutward); diffuseColor.rgb = cBasalt * .85; sRough = .92;
        }`)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = sRough;")
      .replace("#include <normal_fragment_maps>", "normal = normalize((viewMatrix * vec4(sN, 0.)).xyz);")
      .replace("#include <aomap_fragment>", AO_FRAGMENT);
  };
  mat.onBeforeCompile = (s) => mat.userData.hook(s);
  mat.customProgramCacheKey = () => "mm-cerberus-terrain";
  return mat;
}

// layers: 0 regolith, 1 dust-mantled bedrock, 2 layered basalt cliff, 3 dusty layered cliff, 4 pebbly soil,
// 5 basaltic sand, 6 wind ripples (aerial), 7 light-toned bedrock, 8 black lava, 9 polygon-cracked ground, 10 small ripples
const MAP_FRAGMENT = /* glsl */ `
vec2 muv = (vWPos.xz + uSize * .5) / uSize;
vec4 MA = texture2D(tMA, muv), MB = texture2D(tMB, muv), MC = texture2D(tMC, muv);
float edgeD = uSize * .5 - max(abs(vWPos.x), abs(vWPos.z));
float edgeF = 1. - smoothstep(0., 600., edgeD);
vec3 gn = texture2D(tGN, muv, edgeF * 3.).rgb * 2. - 1.;
if (uOctNormal > .5) {
  gn.rg = (gn.rg + 1.) * (255. / uOctNormal) - 1.;
  gn.b = max(0., 1. - abs(gn.r) - abs(gn.g));
}
vec3 Nmap = normalize(vec3(gn.r, gn.b, gn.g));
vec3 Ngeo = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
if (Ngeo.y < 0.) Ngeo = -Ngeo;
float steepG = smoothstep(.42, .18, Ngeo.y) * .8;   // the 2 m DEM normal carries the wall detail; facets only on near-vertical faces
vec3 Nm = normalize(mix(Nmap, Ngeo, steepG * uGeoN * (1. - edgeF)));
float slope = 1. - Nm.y;
float camD = length(vWPos - cameraPosition);

float dust = MA.g * uDust, sand = MA.b, streak = MA.a;
float band = MB.r, talusM = MB.g, platy = MB.b, cone = MB.a;
float therm = MC.r, depo = MC.g, hub = MC.b, tpi = MC.a;
float nA = fbm(vWPos.xz * .011), nB = fbm(vWPos.xz * .06 + 3.1), nC = fbm(vWPos.xz * .0023 + 7.);
Tri T = triSetup(vWPos, Nm);
const float MACRO = .19;

// ---- plains: dusty regolith over young platy lava; plates (dust-mantled bedrock / cracked crust)
// exposed on the real relief highs, regolith in the lows
vec4 rR = triS(tRgh, T, 0., 1.);
vec3 tR = mix(triS(tAlb, T, 0., 1.).rgb, triS(tAlb, T, 0., MACRO).rgb, .4);
vec3 alb = pal(tR, uMeanL[0], cSoil);
float rough = .9;
float ao = rR.g;
vec3 Nd = triN(T, 0., Nm, .8 * uDetail, 1.);
{
  // plate exposure follows the 1-4 m relief of the stamped / real platy surface (fine topographic position)
  float hi = smoothstep(.45, .75, tpi);
  float w = clamp(platy * (.35 + .65 * hi) * (1. - dust * .55), 0., 1.);
  vec3 tP = mix(triS(tAlb, T, 9., 1.).rgb, triS(tAlb, T, 1., 1.).rgb, .65);
  vec3 a = pal(tP, mix(uMeanL[9], uMeanL[1], .5), mix(cBed, cSoil, .7));
  alb = mix(alb, a, w * .6);
  Nd = normalize(mix(Nd, triN(T, 9., Nm, 1.1 * uDetail, 1.), w));
}
// thick dust mantle: smoother, redder-brown dust on gentle ground (measured 'dust')
{
  float w = smoothstep(.45, .85, dust) * (1. - smoothstep(.25, .45, slope));
  vec3 a = pal(triS(tAlb, T, 0., .6).rgb, uMeanL[0], mix(cDust, cSoil, .35))   /* regolith; the bedrock scan magnified drew marble veins */;
  alb = mix(alb, a, w * .7); rough = mix(rough, .95, w);
  Nd = normalize(mix(Nd, Nm, w * .5));
}
// wind streaks: bright dust tails in the lee of cones, crater rims and ridges (baked downwind smear)
alb = mix(alb, alb * vec3(1.28, 1.2, 1.1) + cSlope * .05, smoothstep(.03, .4, streak) * .85 * (1.-talusM));
// sand and dust in the lows / trough floors: dark basaltic sand with ripples
{
  float w = sand * .85;
  vec3 tS = mix(triS(tAlb, T, 5., 1.).rgb, triS(tAlb, T, 10., 1.).rgb, .5);
  vec3 a = pal(tS, mix(uMeanL[5], uMeanL[10], .5), cSand);
  // ripples catch dust on their crests
  float crest = smoothstep(.55, .8, triS(tRgh, T, 10., 1.).b);
  a = mix(a, pal(tS, uMeanL[5], cSlope * .85), crest * .35);
  alb = mix(alb, a, w); rough = mix(rough, .97, w);
  Nd = normalize(mix(Nd, triN(T, 10., Nm, 1.2 * uDetail, 1.), w));
}
// rootless cones: darker, coarser scoria rims, dust in the summit pits
if (cone > .02) {
  vec3 a = pal(triS(tAlb, T, 4., 1.).rgb, uMeanL[4], mix(cBasalt, cBed, .5));
  float w = smoothstep(.05, .5, cone) * (1. - smoothstep(.45, .55, 1. - tpi) * .6);
  alb = mix(alb, a, w); rough = mix(rough, .96, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.3 * uDetail, 1.), w));
}
// ---- talus aprons: dust-mantled scree, lighter dusty slope with darker blocky chutes and slope streaks
// (round 2: no elevation-keyed noise here: it switched the bedded wall shading on in bands across the talus)
float cliffW = smoothstep(.42, .66, slope + (nB - .5) * .16);
if (talusM > .02) {
  // round 2: blocky scree (pebbly soil + dust-mantled bedrock at two scales) with colour following the real
  // chute relief: dark basaltic sand runs down the gullies, light dust on the spurs and block tops
  // (the dust-mantled bedrock scan magnified reads as marble veins / contour lines: pebbly soil only, two scales)
  // only the scan's own scale: magnified 2-4x its mud cracks became contour-like loops (marble look)
  vec3 tP = triS(tAlb, T, 4., 1.).rgb, tB = tP * (.9 + .2 * nB), tBig = tP * (.85 + .3 * fbm(vWPos.xz * .09 + 1.7));
  float blk = .35 + .3 * (1. - Nm.y) + .2 * (1. - tpi);
  vec3 a = mix(pal(tP, uMeanL[4], mix(cSlope, cSoil, .5)), pal(mix(tB, tBig, .5), uMeanL[4], mix(cBasalt, cBed, .5)), blk * .85);
  // tpi is 8-bit at 4 m: narrow thresholds drew contour lines; use it only as a broad, weak bias
  float gully = smoothstep(.56, .2, tpi) * .6, spur = smoothstep(.45, .85, tpi) * .6;
  // Chutes are relief and scree placements, without a shader stripe field.
  a = mix(a, pal(tP, uMeanL[4], cSand) * 1.1, gully * .5);
  a = mix(a, pal(tB, uMeanL[4], cSlope) * 1.05, spur * .25);
  // Dust cover follows terrain hollows and exposed spurs.
  a = mix(a, pal(tP, uMeanL[4], cSand) * 1.05, gully * .3);
  a = mix(a, pal(tB, uMeanL[4], cSlope) * 1.05, spur * .3);
  float w = smoothstep(.05, .5, talusM) * (1. - cliffW * band);
  alb = mix(alb, a, w); rough = mix(rough, .94, w);
  // Native pebbly-soil scan normals supply scree between the visible blocks.
  Nd = normalize(mix(Nd, triN(T, 4., Nm, .8 * uDetail, 1.), w));
}
// ---- exposed terrain walls: native basalt scan colour with dust on upward-facing ledges
float ledge = smoothstep(.72, .9, Nmap.y);
// (round 2: the cliff band is a mesh now; the band mask on 30-40 deg talus drew the elevation-keyed beds as contour lines)
float wallW = max(cliffW, band * smoothstep(.36, .5, slope)) * (1.-smoothstep(.3,.8,talusM));
if (wallW > .01) {
  vec3 tC = triS(tAlb, T, 2., 1.).rgb;
  vec3 bas = pal(tC, uMeanL[2], mix(cBasalt, cBed, .35));
  // dust and fines washed down from the ledges: faint vertical streaks on the face
  vec2 tgw = vec2(.927, .375);
  float wstreak = smoothstep(.55, .8, fbm(vec2(dot(vWPos.xz, tgw) * .09, vWPos.y * .006)));
  bas = mix(bas, pal(tC, uMeanL[2], cSlope) * .8, wstreak * .35);
  vec3 a = bas;
  // dust on ledges and bed tops (Mars dust settles on every flat step of the wall)
  float ld = max(ledge, smoothstep(.6, .85, Nm.y) * .7) * (.7 + .3 * nB);
  a = mix(a, pal(triS(tAlb, T, 1., 1.).rgb, uMeanL[1], cSlope), clamp(ld * 1.1, 0., 1.) * uDust);
  vec4 r = triS(tRgh, T, 2., 1.);
  alb = mix(alb, a, wallW); rough = mix(rough, r.r * .3 + .7, wallW); ao = mix(ao, r.g, wallW);
  Nd = normalize(mix(Nd, triN(T, 2., Nm, 1.3 * uDetail, 1.), wallW * (1. - ld * .5)));
}
// ---- possible thermal cells on the fissure floors: dust-free dark young basalt
if (therm > .01) {
  float w = smoothstep(.05, .45, therm + (nB - .5) * .3);
  vec3 a = pal(triS(tAlb, T, 8., 1.).rgb, uMeanL[8], cBasalt * .62) * vec3(1.12, .95, .85);
  alb = mix(alb, a, w * .85); rough = mix(rough, .8, w);
  Nd = normalize(mix(Nd, triN(T, 8., Nm, 1.2 * uDetail, 1.), w));
}
// ---- deposit (hydrated / altered minerals on the collapsed block): light-toned bedrock exposures
if (depo > .01) {
  float w = depo * .72;
  vec3 a = pal(triS(tAlb, T, 7., 1.).rgb, uMeanL[7], cLight);
  alb = mix(alb, a, w); Nd = normalize(mix(Nd, triN(T, 7., Nm, 1.1 * uDetail, 1.), w));
}
// far field: a touch of large-scale albedo variation so the plains are not flat at the overview
alb *= .92 + .16 * nC;
// map edge: fade into the context apron's colour over the last ~600 m (no visible square at the overview)
{
  float lA_ = dot(texture(tAlb, vec3(vWPos.xz / 3., 0.)).rgb, vec3(.3, .55, .15));
  float lM_ = dot(texture(tAlb, vec3(vWPos.xz / 16., 1.)).rgb, vec3(.3, .55, .15));
  vec3 apr = vec3(.209, .111, .058) * clamp(mix(lA_, lM_, .5) / .147, .5, 1.8) * (.92 + .16 * nC) * .86;
  alb = mix(alb, apr, smoothstep(600., 0., edgeD) * .85);
}
if (uGameplay > 0.) {
  alb = mix(alb, vec3(.1, .5, .15), hub * .5);
  alb = mix(alb, vec3(.9, .8, .1), depo * .6);
  alb = mix(alb, vec3(.9, .2, .1), therm * .6);
}
float sRough = clamp(rough, .3, 1.);
diffuseColor.rgb = alb;
vec3 sN = Nd;
if (uDebug == 9) { diffuseColor.rgb = vec3(.3); sN = Nm; }
if (uDebug == 10) { sN = Nm; }
float sAO = MA.r;
if (uDebug == 1) { diffuseColor.rgb = vec3(dust, sand, streak); }
else if (uDebug == 2) { diffuseColor.rgb = vec3(band, talusM, platy); }
else if (uDebug == 3) { diffuseColor.rgb = Nm * .5 + .5; }
else if (uDebug == 4) { diffuseColor.rgb = vec3(therm, depo, hub); }
else if (uDebug == 5) { diffuseColor.rgb = vec3(sAO); }
else if (uDebug == 6) { diffuseColor.rgb = vec3(cone, tpi, 0.); }
`;

const AO_FRAGMENT = /* glsl */ `
float aoV = mix(1., sAO, .7) * mix(1., ao, .4);
reflectedLight.directSpecular *= .25;
reflectedLight.indirectDiffuse *= aoV;
reflectedLight.indirectSpecular *= aoV * .5;
if (uDebug > 0) { reflectedLight.directDiffuse = diffuseColor.rgb * .9; reflectedLight.indirectDiffuse = vec3(0.); reflectedLight.directSpecular = vec3(0.); reflectedLight.indirectSpecular = vec3(0.); }
`;
