import * as THREE from "three";

// mm-tranq materials. MeshStandardMaterial keeps the stock lighting path (CSM shadows, tone mapping); the hooks
// replace the surface (baked maps + triplanar scan textures) and re-weight the direct sun term with regolith
// photometry (lunar-Lambert after McEwen 1991, a lunar phase curve and a narrow opposition surge), so the mare reads
// flat-bright toward the anti-sun point, dark toward the sun, and slopes facing the sun do not wash out.

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

// shared: sun direction, photometry switch, the pit lip (for the terrain cut)
export const shared = {
  uSunW: { value: new THREE.Vector3(0, 1, 0) },
  uPhoto: { value: 1 },
  uPitC: { value: new THREE.Vector2() },
  uLip: { value: new Float32Array(256) },
  uImmGain: { value: 1 },
  uDebug: { value: 0 },
};

export const LUNAR_GLSL = /* glsl */ `
uniform vec3 uSunW; uniform float uPhoto;
// regolith photometry: lunar-Lambert limb term L(alpha), phase curve and opposition surge; normalised to 1 at
// normal incidence / emission and alpha = 0 for the limb term, ~1 at alpha ~ 60 deg overall
float lunarF(vec3 Nw, vec3 Vw) {
  float mu0 = max(dot(Nw, uSunW), 0.), mu = max(dot(Nw, Vw), 0.03);
  float a = degrees(acos(clamp(dot(uSunW, Vw), -1., 1.)));
  float L = clamp(1. - .019 * a + .000242 * a * a - .00000146 * a * a * a, 0., 1.);
  float F = (1. - L) + 2. * L / max(mu0 + mu, .08);
  float ph = pow(10., -.4 * .011 * (a - 60.));                 // softened lunar phase curve (0.011 mag / deg)
  float B = 1. + .3 / (1. + tan(radians(a) * .5) / .03);       // opposition surge (narrow, h ~ 0.03)
  return mix(1., clamp(F * ph * B, .0, 5.), uPhoto);
}
`;

// applied after the lights are accumulated (aomap slot); needs vWPos and a world normal expression
export const lunarApply = (nExpr) => /* glsl */ `
{
  vec3 Nw_ = ${nExpr};
  vec3 Vw_ = normalize(cameraPosition - vWPos);
  reflectedLight.directDiffuse *= lunarF(Nw_, Vw_);
  reflectedLight.directSpecular *= .04;
}
`;

const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;

export const TRI_GLSL = /* glsl */ `
uniform sampler2DArray tAlb, tNrm, tRgh;
uniform float uTile[8];
struct Tri { vec3 w; vec2 uvx, uvy, uvz; vec4 gx, gy, gz; float k; };
Tri triSetup(vec3 p, vec3 n) {
  Tri t; vec3 w = pow(abs(n), vec3(6.)); w /= (w.x + w.y + w.z);
  if (w.y > .97) w = vec3(0, 1, 0);
  t.w = w;
  t.uvx = p.zy; t.uvy = p.xz; t.uvz = p.xy;
  t.gx = vec4(dFdx(t.uvx), dFdy(t.uvx)); t.gy = vec4(dFdx(t.uvy), dFdy(t.uvy)); t.gz = vec4(dFdx(t.uvz), dFdy(t.uvz));
  t.k = vnoise(p.xz * .021 + p.y * .013) * 7. + vnoise(p.xz * .0043 + p.y * .03) * 5.;
  return t;
}
// hex-tile blending (after Mikkelsen 2022, "Practical real-time hex-tiling"): the texture plane is covered by a
// triangle grid; each vertex owns a random translation (no rotation, so no swirls), the three samples are blended
// with sharpened barycentric weights, so there are no visible cell seams or a repeat grid
vec2 hexHash(vec2 p) { vec2 r = mat2(127.1, 311.7, 269.5, 183.3) * p; return fract(sin(r) * 43758.5453); }
vec4 antiTile(sampler2DArray s, vec2 uv, vec4 g, float layer, float k) {
  vec2 q = uv * 1.7320508 * .55 + k * 0.;
  vec2 sk = mat2(1., 0., -.57735027, 1.15470054) * q;
  vec2 b = floor(sk); vec3 t = vec3(fract(sk), 0.); t.z = 1. - t.x - t.y;
  float sg = step(0., -t.z), s2 = 2. * sg - 1.;
  float w1 = -t.z * s2, w2 = sg - t.y * s2, w3 = sg - t.x * s2;
  vec2 v1 = b + vec2(sg, sg), v2 = b + vec2(sg, 1. - sg), v3 = b + vec2(1. - sg, sg);
  vec4 c1 = textureGrad(s, vec3(uv + hexHash(v1 + layer * 7.1) * 9.7, layer), g.xy, g.zw);
  vec4 c2 = textureGrad(s, vec3(uv + hexHash(v2 + layer * 7.1) * 9.7, layer), g.xy, g.zw);
  vec4 c3 = textureGrad(s, vec3(uv + hexHash(v3 + layer * 7.1) * 9.7, layer), g.xy, g.zw);
  vec3 w = pow(vec3(w1, w2, w3), vec3(5.));
  w *= vec3(.6 + dot(c1.rgb, vec3(.33)), .6 + dot(c2.rgb, vec3(.33)), .6 + dot(c3.rgb, vec3(.33)));
  w /= (w.x + w.y + w.z);
  return c1 * w.x + c2 * w.y + c3 * w.z;
}
vec4 triS(sampler2DArray s, Tri t, float layer, float sc) {
  float it = sc / uTile[int(layer)];
  vec4 c = vec4(0.);
  if (t.w.y > 0.) c += t.w.y * antiTile(s, t.uvy * it, t.gy * it, layer, t.k);
  if (t.w.x > 0.) c += t.w.x * antiTile(s, t.uvx * it, t.gx * it, layer, t.k + 3.7);
  if (t.w.z > 0.) c += t.w.z * antiTile(s, t.uvz * it, t.gz * it, layer, t.k + 1.9);
  return c;
}
vec3 triN(Tri t, float layer, vec3 n, float strength, float sc) {
  float it = sc / uTile[int(layer)];
  vec3 r = vec3(0.);
  if (t.w.y > 0.) { vec2 tn = (antiTile(tNrm, t.uvy * it, t.gy * it, layer, t.k).xy * 2. - 1.) * strength; tn.y = -tn.y;
    vec3 a = vec3(tn.x + n.x, abs(n.y), tn.y + n.z); r += t.w.y * vec3(a.x, a.y * sign(n.y), a.z); }
  if (t.w.x > 0.) { vec2 tn = (antiTile(tNrm, t.uvx * it, t.gx * it, layer, t.k + 3.7).xy * 2. - 1.) * strength;
    vec3 a = vec3(abs(n.x), tn.y + n.y, tn.x + n.z); r += t.w.x * vec3(a.x * sign(n.x), a.y, a.z); }
  if (t.w.z > 0.) { vec2 tn = (antiTile(tNrm, t.uvz * it, t.gz * it, layer, t.k + 1.9).xy * 2. - 1.) * strength;
    vec3 a = vec3(tn.x + n.x, tn.y + n.y, abs(n.z)); r += t.w.z * vec3(a.x, a.y, a.z * sign(n.z)); }
  return normalize(r);
}
float lum(vec3 c) { return dot(c, vec3(.3, .55, .15)); }
`;

// the pit cut: discard terrain inside the lip (same 256-sample lip radius as the shaft mesh)
const PIT_GLSL = /* glsl */ `
uniform vec2 uPitC; uniform float uLip[256];
float lipR(vec2 p) {
  vec2 d = p - uPitC;
  float th = atan(d.x, -d.y); if (th < 0.) th += 6.2831853;
  float f = th / 6.2831853 * 256.; int i = int(floor(f)) % 256; int j = (i + 1) % 256;
  return mix(uLip[i], uLip[j], fract(f));
}
bool inPit(vec3 p) { vec2 d = p.xz - uPitC; return dot(d, d) < 6400. && length(d) < lipR(p.xz); }
`;

// mare palette: high-Ti mare is dark and slightly blue-grey; fresh ejecta (immature) is brighter and more neutral
const MAP_FRAGMENT = /* glsl */ `
if (inPit(vWPos)) discard;
vec2 muv = (vWPos.xz + uSize * .5) / uSize;
vec4 MA = texture2D(tMA, muv);
float edgeD = uSize * .5 - max(abs(vWPos.x), abs(vWPos.z));
float edgeF = 1. - smoothstep(0., 500., edgeD);
vec3 gn = texture2D(tGN, muv, edgeF * 2.).rgb * 2. - 1.;
vec3 Nmap = normalize(vec3(gn.r, gn.b, gn.g));
vec3 Ngeo = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
if (Ngeo.y < 0.) Ngeo = -Ngeo;
float steepG = smoothstep(.8, .55, Ngeo.y);
vec3 Nm = normalize(mix(Nmap, Ngeo, steepG * (1. - edgeF)));
float slope = 1. - Nm.y;
float imm = MA.g * uImmGain, rockM = MA.b, depM = MA.a;
Tri T = triSetup(vWPos, Nm);
float camD = length(vWPos - cameraPosition);

// regolith: real regolith scans at several scales (3 m, ~13 m, ~27 m, ~53 m tiles: the cratered scan is self-similar,
// so it reads as micro-craters at every range), anti-tiled; fine micro texture close up
float mixA = smoothstep(.3, .7, fbm(vWPos.xz * .006 + 3.));
float lR = lum(triS(tAlb, T, 0., 1.).rgb), lC = lum(triS(tAlb, T, 1., 1.).rgb);
float lC2 = lum(triS(tAlb, T, 1., .24).rgb), lC3 = lum(triS(tAlb, T, 1., .06).rgb), lM = lum(triS(tAlb, T, 2., .12).rgb);
float l = mix(lR, lC, mixA * .7);
l = l * (.55 + .45 * (lC2 / .19)) * (.65 + .35 * (lM / .22)) * (.7 + .3 * (lC3 / .19));
float lMicro = lum(triS(tAlb, T, 7., 1.).rgb);
l *= mix(1., .65 + .7 * lMicro, 1. - smoothstep(25., 90., camD));
l = .19 + (l - .19) * 1.6;                          // regolith contrast: fresh clasts and pits read at the close cameras
l = max(l, .04);
vec3 mare = vec3(.93, .955, 1.) * .40;             // high-Ti mare: albedo ~0.075 after the texture luminance
vec3 alb = mare * l;
vec4 rg = triS(tRgh, T, 0., 1.);
float ao = mix(1., rg.g, .6);
vec3 Nd = normalize(mix(triN(T, 0., Nm, .7, 1.), triN(T, 1., Nm, .7, 1.), mixA * .7));
float nfar = 1. - smoothstep(600., 2500., camD);
// detail normals fade with distance (they interfered into a faint grid / rosette at range)
float fN1 = 1. - smoothstep(60., 400., camD), fN2 = 1. - smoothstep(400., 2200., camD), fN3 = 1. - smoothstep(1200., 5000., camD);
Nd = normalize(mix(Nm, Nd, fN1));
Nd = normalize(mix(Nd, triN(T, 1., Nd, 1.4, .24), .6 * fN2));
Nd = normalize(mix(Nd, triN(T, 1., Nd, 1.3, 1.), .5 * (1. - smoothstep(40., 160., camD))));
Nd = normalize(mix(Nd, triN(T, 1., Nd, .8, .06), .4 * fN3));
// blocky ground: fresh crater walls and rims, the funnel, the ridge crest
if (rockM > .02) {
  float g = lum(triS(tAlb, T, 5., 1.).rgb);
  vec4 gr = triS(tRgh, T, 5., 1.);
  float w = smoothstep(.15, .8, rockM - (gr.b - .5) * .4) * .55;
  alb = mix(alb, mare * g * (.75 + .6 * smoothstep(.1, .35, g)) * 1.05, w * .8);
  Nd = normalize(mix(Nd, triN(T, 5., Nm, .9, 1.), w));
  ao = mix(ao, gr.g, w * .6);
}
// steep fresh slopes (crater walls, funnel): immature rock and regolith, bright and coarse
float steepW = smoothstep(.12, .35, slope);
if (steepW > .01) {
  float rf = lum(mix(triS(tAlb, T, 6., 1.).rgb, triS(tAlb, T, 6., .2).rgb, .4));
  alb = mix(alb, vec3(.95, .96, 1.) * rf * .85 * (.6 + .4 * l / .19), steepW * .55);
  Nd = normalize(mix(Nd, triN(T, 6., Nm, 1.1, 1.), steepW * .7));
}
// fresh ejecta: immature regolith is brighter (bright halos and rays); its edge is broken by the scan texture
// break the 4 m halo mask up with the real regolith scans at 2-40 m (bright fines collect unevenly), not noise
float immE = clamp(imm, 0., 1.2) * clamp(.35 + .9 * (lC2 / .19) * (.6 + .4 * lC3 / .19) - .2 + .35 * (lC / .19 - 1.), .2, 1.4);
// fresh ejecta: immature regolith ~2-2.5x brighter, and blocky near the rims (bright clasts in the gravel scan)
float gB = lum(triS(tAlb, T, 5., .9).rgb), gB2 = lum(triS(tAlb, T, 5., .3).rgb);
float blockyE = smoothstep(.25, .8, immE) * (1. - steepW * .5);
alb *= 1. + 1.5 * immE;
alb *= mix(1., .45 + 1.1 * (gB * .6 + gB2 * .4) / .17, blockyE * .7);
alb = mix(alb, vec3(lum(alb)), immE * .5);
Nd = normalize(mix(Nd, triN(T, 5., Nm, 1.2, .9), blockyE * .6));
// ilmenite basalt exposed on the West crater inner rim: dark bluish-black blocks
if (depM > .02) {
  float b = lum(triS(tAlb, T, 4., 1.).rgb);
  float w = smoothstep(.1, .6, depM) * smoothstep(.35, .6, b + depM * .3);
  alb = mix(alb, vec3(.8, .86, 1.) * b * .55, w);
  Nd = normalize(mix(Nd, triN(T, 4., Nm, 1.4, 1.), w));
}
diffuseColor.rgb = alb;
vec3 sN = Nd;
float sAO = MA.r * ao;
if (uDebug == 1) diffuseColor.rgb = vec3(imm, rockM, depM);
else if (uDebug == 2) diffuseColor.rgb = Nm * .5 + .5;
else if (uDebug == 3) diffuseColor.rgb = vec3(MA.r);
else if (uDebug == 4) diffuseColor.rgb = vec3(.18);
`;

const AO_FRAGMENT = /* glsl */ `
reflectedLight.indirectDiffuse *= mix(1., sAO, .9);
reflectedLight.indirectSpecular *= sAO;
${lunarApply("sN")}
if (uDebug > 0 && uDebug != 4) { reflectedLight.directDiffuse = diffuseColor.rgb * .9; reflectedLight.indirectDiffuse = vec3(0.); reflectedLight.directSpecular = vec3(0.); }
`;

export function terrainMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0 });
  const uniforms = {
    ...shared,
    tGN: { value: tex.gn }, tMA: { value: tex.ma },
    tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh },
    uSize: { value: 12000 }, uTile: { value: tex.tiles },
  };
  mat.userData.uniforms = uniforms;
  mat.userData.hook = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\nuniform sampler2D tGN, tMA; uniform float uSize, uImmGain; uniform int uDebug;\n" + NOISE_GLSL + TRI_GLSL + PIT_GLSL + LUNAR_GLSL)
      .replace("#include <map_fragment>", MAP_FRAGMENT)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = 1.;")
      .replace("#include <normal_fragment_maps>", "normal = normalize((viewMatrix * vec4(sN, 0.)).xyz);")
      .replace("#include <aomap_fragment>", AO_FRAGMENT);
  };
  mat.onBeforeCompile = (s) => mat.userData.hook(s);
  mat.customProgramCacheKey = () => "mm-tranq-terrain";
  return mat;
}

// shadow-depth material for the terrain: the same pit cut, so the hole does not cast a lid shadow into the shaft
export function terrainDepthMaterial() {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, { uPitC: shared.uPitC, uLip: shared.uLip });
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;\n" + PIT_GLSL)
      .replace("void main() {", "void main() {\nif (inPit(vWPos)) discard;");
  };
  m.customProgramCacheKey = () => "mm-tranq-terrain-depth";
  return m;
}

// pit shaft: layered mare basalt (beds from the mesh attribute), crisp faceted faces, regolith-capped lip,
// dark overhang ceiling, bright blocky floor / talus
const PIT_FRAGMENT = /* glsl */ `
vec3 Ng = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
Tri T = triSetup(vWPos, Ng);
float kind = vKind, bed = vBed;
float tone = hash12(vec2(bed, 3.3)), ves = step(.72, hash12(vec2(bed, 8.1)));
// massive mare basalt: the kit's real basalt scans at three scales (anti-tiled), graded to mare grey; a tone per
// flow unit that also drifts along the wall (the same unit is not one flat colour all round)
float drift = vnoise(vec2(atan(vWPos.x - uPitC.x, vWPos.z - uPitC.y) * 3.1, bed * 1.7)) - .5;
float b1 = lum(triS(tAlb, T, 3., 1.).rgb), b2 = lum(triS(tAlb, T, 3., .21).rgb), b3 = lum(triS(tAlb, T, 4., .55).rgb);
float bl = mix(mix(b1, b2, .5), b3, .3 + ves * .3);
vec3 wall = vec3(.92, .95, 1.) * bl * 1.35 * (.8 + .35 * tone + .25 * drift);
vec3 alb = wall;
vec3 Nd = normalize(mix(triN(T, 3., Ng, 1.2, 1.), triN(T, 4., Ng, 1.0, .55), .4));
float rg = lum(triS(tAlb, T, 0., 1.).rgb), rg2 = lum(triS(tAlb, T, 1., .3).rgb);
vec3 regol = vec3(.93, .955, 1.) * mix(rg, rg2, .5) * .42;
if (kind > 5.5 && kind < 6.5) {          // fine regolith cap on top of the lip
  alb = regol * 1.25; Nd = triN(T, 0., Ng, .8, 1.);
} else if (kind > 4.5 && kind < 5.5) {   // dark, rough overhang lip (caprock basalt)
  alb = wall * .6; Nd = normalize(mix(triN(T, 4., Ng, 1.6, 1.), triN(T, 6., Ng, 1.2, .4), .5));
} else if (kind > .5 && kind < 1.5) {    // overhang ceiling
  alb = wall * .7;
} else if (kind > 3.5 && kind < 4.5) {   // floor and talus: blocky regolith, immature
  float g = lum(triS(tAlb, T, 5., 1.).rgb);
  alb = vec3(.93, .955, 1.) * mix(rg * .55, g * .75, .55);
  Nd = normalize(mix(triN(T, 0., Ng, 1., 1.), triN(T, 5., Ng, 1.3, 1.), .6));
}
// regolith-dusted ledges and small talus aprons where beds step back (any up-facing wall face)
float upw = smoothstep(.45, .8, Ng.y) * step(1.5, kind) * step(kind, 3.5) + step(6.5, kind);
if (upw > .01) {
  float g = lum(triS(tAlb, T, 5., 1.6).rgb);
  alb = mix(alb, mix(regol * 1.15, vec3(.93, .955, 1.) * g * .7, .35), upw);
  Nd = normalize(mix(Nd, triN(T, 5., Ng, 1.1, 1.6), upw));
}
diffuseColor.rgb = alb;
vec3 sN = Nd;
if (uDebug == 2) diffuseColor.rgb = Ng * .5 + .5;
`;

export function pitMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const uniforms = { ...shared, tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh }, uTile: { value: tex.tiles } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = s.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec2 attr; varying vec3 vWPos; varying float vKind; flat varying float vBed;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz; vKind = attr.x; vBed = attr.y;");
    s.fragmentShader = s.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vWPos; varying float vKind; flat varying float vBed; uniform int uDebug; uniform vec2 uPitC;\n" + NOISE_GLSL + TRI_GLSL + LUNAR_GLSL)
      .replace("#include <map_fragment>", PIT_FRAGMENT)
      .replace("#include <roughnessmap_fragment>", "float roughnessFactor = 1.;")
      .replace("#include <normal_fragment_maps>", "normal = normalize((viewMatrix * vec4(sN, 0.)).xyz);")
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + lunarApply("sN"));
  };
  mat.customProgramCacheKey = () => "mm-tranq-pit";
  return mat;
}

export { NOISE_GLSL, PIT_GLSL };
