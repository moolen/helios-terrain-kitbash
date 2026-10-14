import * as THREE from "three";
import { GLSL_NOISE } from "../../studio/core/materials.js";

// Europa ice re-material for every surface in scene B (terrain, scan walls, blocks, scatter).
// Cheap and opaque: a flat-shaded MeshStandardMaterial whose albedo is computed from world position and the
// flat world normal: cream plate tops with rust lineae and crack lines, blue-white fresh ice on steep faces
// with salt/rust streaks running down from the lip, dark red-brown matrix between plates.
export const PALETTE = {
  top: "#e6dfd4", topDark: "#cbbfb0", fresh: "#cfe0ea", deep: "#86a9be", rust: "#8c4b2b", rustLight: "#b07448",
  matrix: "#5c4034", matrixLight: "#8b7566", talus: "#c3bcb2",
};

const KIND = { terrain: 0, wall: 1, block: 2, rock: 3 };

export function iceMaterial(kind, opts = {}) {
  const P = { ...PALETTE, ...(opts.palette || {}) };
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: opts.roughness ?? 0.62, metalness: 0, flatShading: true });
  const u = {
    uKind: { value: KIND[kind] }, uSeed: { value: opts.seed ?? 0 },
    uTop: { value: new THREE.Color(P.top) }, uTopDark: { value: new THREE.Color(P.topDark) }, uFresh: { value: new THREE.Color(P.fresh) },
    uDeep: { value: new THREE.Color(P.deep) }, uRust: { value: new THREE.Color(P.rust) }, uRustLight: { value: new THREE.Color(P.rustLight) },
    uMatrix: { value: new THREE.Color(P.matrix) }, uMatrixLight: { value: new THREE.Color(P.matrixLight) }, uTalus: { value: new THREE.Color(P.talus) },
    uStain: { value: opts.stain ?? 1 }, uLineae: { value: opts.lineae ?? 1 },
  };
  m.userData.uniforms = u;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", `#include <common>
varying vec3 vW; varying float vZone; varying float vDrop; varying float vInst; varying float vRaft;
${kind === "terrain" ? "attribute float zone; attribute float drop; attribute float raft;" : ""}`)
      .replace("#include <worldpos_vertex>", `#include <worldpos_vertex>
{ vec4 wq = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  wq = instanceMatrix * wq; vInst = instanceMatrix[3].x * 0.013 + instanceMatrix[3].z * 0.007;
#else
  vInst = 0.0;
#endif
  vW = (modelMatrix * wq).xyz; }
${kind === "terrain" ? "vZone = zone; vDrop = drop; vRaft = raft;" : "vZone = 0.0; vDrop = 0.0; vRaft = 0.0;"}`);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", `#include <common>
${GLSL_NOISE}
varying vec3 vW; varying float vZone; varying float vDrop; varying float vInst; varying float vRaft;
uniform float uKind; uniform float uSeed; uniform float uStain; uniform float uLineae;
uniform vec3 uTop; uniform vec3 uTopDark; uniform vec3 uFresh; uniform vec3 uDeep; uniform vec3 uRust; uniform vec3 uRustLight; uniform vec3 uMatrix; uniform vec3 uMatrixLight; uniform vec3 uTalus;
float lineBand(float c, float w){ return 1.0 - smoothstep(w * 0.4, w, abs(fract(c) - 0.5)); } // 1 on the line, width w (in cycles)
// thin crack network: voronoi cell borders
float cracks(vec2 p){ vec2 i=floor(p), f=fract(p); float f1=9., f2=9.; for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){ vec2 o=vec2(x,y); vec2 r=o+vec2(s_hash(i+o),s_hash(i+o+7.3))-f; float d=dot(r,r); if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;} return 1.0-smoothstep(0.0,0.035,sqrt(f2)-sqrt(f1)); }
vec3 europa(vec3 w, vec3 n){
  float ny = n.y;
  float steep = 1.0 - smoothstep(0.5, 0.82, ny);
  vec2 xz = w.xz + uSeed * 37.0;
  float big = s_fbm(xz * 0.004);
  // Plate tops: cream ice, rust lineae along two ridge sets, crack lines, mottling.
  float l1 = (xz.x * 0.42 + xz.y * 0.91) * 0.035 / 6.2832 + big * 0.35;
  float l2 = (xz.x * 0.95 - xz.y * 0.3) * 0.024 / 6.2832 + s_fbm(xz * 0.005 + 3.) * 0.3;
  float lin = max(lineBand(l1 * 2.0, 0.035) * (0.5 + 0.5 * s_noise(xz * 0.01)), 0.7 * lineBand(l2 * 2.0, 0.03) * s_noise(xz * 0.013 + 5.));
  float wide = smoothstep(0.62, 0.8, s_fbm(vec2(xz.x * 0.42 + xz.y * 0.91, xz.x * 0.91 - xz.y * 0.42) * vec2(0.03, 0.002)));
  vec3 top = mix(uTop, uTopDark, s_fbm(xz * 0.02) * 0.9);
  top = mix(top, uRustLight, wide * 0.3 * uLineae);
  top = mix(top, uRust, lin * 0.75 * uLineae);
  top = mix(top, uRust * 0.85, cracks(xz * 0.012 + s_fbm(xz * 0.01) * 0.8) * 0.25 * uLineae);
  // Steep faces: fresh blue-white ice, deeper blue low down and in streak gaps, rust/salt streaks down from the lip.
  float h = dot(w.xz, vec2(0.71, 0.71)) + w.x * 0.3;
  float streak = smoothstep(0.6, 0.85, s_fbm(vec2(h * 0.14, w.y * 0.008) + uSeed)) * (0.6 + 0.4 * smoothstep(0.3, 0.7, s_noise(w.xz * 0.02)));
  float fine = smoothstep(0.6, 0.9, s_noise(vec2(h * 0.6, w.y * 0.03)));
  vec3 face = mix(uFresh, uDeep, smoothstep(0.45, 0.8, s_fbm(vec2(h * 0.03, w.y * 0.02))) * 0.7);
  face = mix(face, uRustLight, streak * 0.7 * uStain);
  face = mix(face, uRust, fine * streak * 0.6 * uStain);
  vec3 c = mix(top, face, steep);
  if (uKind < 0.5) {
    // Terrain zones from the signed edge distance: matrix (dark, salt-rich), talus apron (ice debris), plate.
    float out_ = smoothstep(2.0, -6.0, vZone);
    float talus = smoothstep(-115.0, -12.0, vZone) * out_;
    vec3 mtx = mix(uMatrix, uMatrixLight, s_fbm(xz * 0.03) * 0.8);
    mtx = mix(mtx, uTopDark, smoothstep(0.62, 0.78, s_fbm(xz * 0.012 + 9.)) * 0.6);
    vec3 tal = mix(uTalus, uRustLight, s_fbm(xz * 0.05) * 0.55);
    vec3 low = mix(mtx, tal, min(1.0, talus * (0.75 + 0.45 * s_noise(xz * 0.06))));
    // rafts: old plate ice, cream tops with rust rims
    float rf = smoothstep(1.5, 4.0, vRaft);
    low = mix(low, mix(uTopDark, uTop, 0.5 + 0.5 * s_noise(xz * 0.05)), rf * (1.0 - steep) * 0.85);
    low = mix(low, face, steep * 0.6);
    c = mix(c, low, out_);
  } else if (uKind > 1.5) {
    // Blocks and scatter: ice with rust dust on up-facing facets.
    vec3 b = mix(uFresh, uTop, 0.35 + 0.4 * s_hash(vec2(vInst, uSeed)));
    b = mix(b, uRustLight, smoothstep(0.55, 0.95, ny) * 0.45 * uStain);
    b = mix(b, uRust, smoothstep(0.6, 0.85, s_fbm(w.xz * 0.2 + w.y * 0.1)) * 0.35 * uStain);
    c = mix(b, c, uKind > 2.5 ? 0.15 : 0.45) * (uKind > 2.5 ? 1.18 : 1.08);
  }
  return c;
}`)
      .replace("#include <color_fragment>", `#include <color_fragment>
{ vec3 wn = normalize(cross(dFdx(vW), dFdy(vW))); if (wn.y < -0.0 && false) wn = -wn;
  diffuseColor.rgb *= europa(vW, wn); }`);
  };
  m.customProgramCacheKey = () => `europa-${kind}`;
  return m;
}
