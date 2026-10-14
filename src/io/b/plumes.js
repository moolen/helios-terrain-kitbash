import * as THREE from "three";

// Live particle systems, all GPU points animated in the vertex shader (no per-frame CPU work):
//  * plume umbrellas: Io-ballistic particles (no drag, g = 1.796 m/s^2) with the same vent speed and
//    launch-angle distribution as the offline deposit simulation (scripts/io/b/deposits.json);
//  * fumarole gas puffs, ground-hugging dust drifting out from the vents, faint outgassing over hot lava.
const G = 1.796;

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { return Math.sqrt(-2 * Math.log(Math.max(1e-9, r()))) * Math.cos(2 * Math.PI * r()); }

const COMMON_VS = /* glsl */ `
uniform float uTime, uScale;
uniform sampler2D tH; uniform float uHSize, uHMin, uHMax;
float groundAt(vec2 xz) { vec2 uv = (xz + uHSize * .5) / uHSize; return texture2D(tH, uv).r; }
`;

const SPRITE_FS = /* glsl */ `
uniform vec3 uSun; uniform float uSunUp, uGain;
varying vec4 vCol; varying float vSoft;
void main() {
  vec2 d = gl_PointCoord * 2. - 1.; float r2 = dot(d, d);
  if (r2 > 1.) discard;
  float a = exp(-r2 * (2.5 + vSoft * 2.)) * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a * uGain, a);
}`;

function makeMat(vs, blending) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uScale: { value: 800 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunUp: { value: 1 }, uGain: { value: 1 },
      tH: { value: null }, uHSize: { value: 7168 }, uHMin: { value: 0 }, uHMax: { value: 1 },
      uVent: { value: new THREE.Vector3() }, uSpeed: { value: 60 }, uCamDir: { value: new THREE.Vector3() }, uAlpha: { value: 0.2 }, uGrow: { value: 3.5 }, uMaxPx: { value: 96 },
    },
    vertexShader: COMMON_VS + vs, fragmentShader: SPRITE_FS,
    transparent: true, depthWrite: false, blending, premultipliedAlpha: true,   // shaders output premultiplied colour
  });
}

// ballistic umbrella; attributes: launch azimuth, zenith, speed factor, phase, size, temperature
const PLUME_VS = /* glsl */ `
attribute vec4 aL;   // azimuth, zenith, speed factor, phase
attribute vec2 aS;   // size, hot
uniform vec3 uVent, uSun, uCamDir; uniform float uSpeed, uSunUp, uAlpha, uGrow, uMaxPx;
varying vec4 vCol; varying float vSoft;
void main() {
  float v = uSpeed * aL.z, ct = cos(aL.y), st = sin(aL.y);
  float tf = (v * ct + sqrt(v * v * ct * ct + 2. * ${G} * 40.)) / ${G};
  float u = fract(uTime / tf + aL.w);
  float t = u * tf;
  vec3 p = uVent + vec3(v * st * cos(aL.x) * t, v * ct * t - .5 * ${G} * t * t, v * st * sin(aL.x) * t);
  float gnd = groundAt(p.xz);
  float landed = step(p.y, gnd + 1.);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float size = aS.x * (1. + uGrow * u);
  gl_PointSize = clamp(size * uScale / -mv.z, 1., uMaxPx);
  // forward scattering: brighter when looking toward the sun through the plume
  vec3 vd = normalize(p - cameraPosition);
  float fwd = pow(max(dot(vd, uSun), 0.), 6.);
  float lit = .12 + uSunUp * (.7 + 1.8 * fwd);
  vec3 dust = mix(vec3(.95, .86, .62), vec3(.9, .55, .3), aS.y * (1. - u));
  vec3 gas = vec3(.62, .72, .95);
  vec3 c = mix(dust, gas, .35 + .4 * u) * lit + vec3(1., .45, .15) * aS.y * smoothstep(.2, 0., u) * .8;
  float a = smoothstep(0., .03, u) * (1. - smoothstep(.75, 1., u)) * (1. - landed) * uAlpha;
  vCol = vec4(c, a); vSoft = u;
}`;

// fumarole puffs: slow rise, expansion, fade
const PUFF_VS = /* glsl */ `
attribute vec4 aP;   // x, z, base y, phase
attribute vec4 aQ;   // rise speed, spread dir x, spread dir z, size
uniform vec3 uSun; uniform float uSunUp;
varying vec4 vCol; varying float vSoft;
void main() {
  float life = 9. + 6. * fract(aP.w * 7.3);
  float u = fract(uTime / life + aP.w);
  float t = u * life;
  vec3 p = vec3(aP.x, aP.z, aP.y) + vec3(aQ.y * t * 1.6, aQ.x * t, aQ.z * t * 1.6);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aQ.w * (1. + 4. * u) * uScale / -mv.z, 1., 160.);
  float lit = .25 + .75 * uSunUp;
  vCol = vec4(vec3(.92, .9, .82) * lit, smoothstep(0., .1, u) * (1. - u) * .035);
  vSoft = 1.;
}`;

// ground dust: drifts radially outward from a vent, hugging the terrain
const DUST_VS = /* glsl */ `
attribute vec4 aD;   // vent x, vent z, angle, phase
attribute vec2 aE;   // max radius, size
uniform float uSunUp;
varying vec4 vCol; varying float vSoft;
void main() {
  float life = 30.;
  float u = fract(uTime / life + aD.w);
  float r = aE.x * (.15 + .85 * u);
  float ang = aD.z + .25 * sin(uTime * .05 + aD.w * 30.);
  vec2 xz = aD.xy + vec2(cos(ang), sin(ang)) * r;
  vec3 p = vec3(xz.x, groundAt(xz) + 1.5 + 4. * fract(aD.w * 13.1), xz.y);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aE.y * uScale / -mv.z, 1., 64.);
  vCol = vec4(vec3(.85, .74, .52) * (.2 + .8 * uSunUp), smoothstep(0., .2, u) * (1. - u) * .05);
  vSoft = .5;
}`;

// outgassing over hot lava: faint, warm-lit from below
const GAS_VS = /* glsl */ `
attribute vec4 aG;   // x, y, z, phase
attribute vec2 aH;   // heat, size
uniform float uSunUp;
varying vec4 vCol; varying float vSoft;
void main() {
  float life = 12.;
  float u = fract(uTime / life + aG.w);
  vec3 p = aG.xyz + vec3(sin(aG.w * 50.) * 6. * u, 3. + 45. * u, cos(aG.w * 70.) * 6. * u);
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp(aH.y * (1. + 2.5 * u) * uScale / -mv.z, 1., 140.);
  vec3 c = mix(vec3(1., .42, .12) * 1.4 * aH.x * (1. - u), vec3(.7, .66, .62) * (.15 + .5 * uSunUp), u);
  vCol = vec4(c, smoothstep(0., .15, u) * (1. - u) * .035);
  vSoft = 1.;
}`;


// Raymarched umbrella volume: the analytic shape of a ballistic plume (no drag, Io gravity). Density sits
// in a canopy shell just under the trajectory envelope, a falling curtain at the deposit ring and a thin
// column over the vent; drifting 3D noise and a few radial rays break it up. Same speed and angle as the
// offline deposit simulation, so the curtain lands on the simulated ring.
const VOL_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const VOL_FS = `
uniform vec3 uVent, uSun; uniform float uR, uH, uSpeed, uTime, uSunUp, uGain;
uniform sampler2D tH; uniform float uHSize;
varying vec3 vW;
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
float groundAt(vec2 xz){ return texture2D(tH, (xz + uHSize * .5) / uHSize).r; }
void main(){
  vec3 ro = cameraPosition, rd = normalize(vW - cameraPosition);
  // intersect the bounding cylinder (axis y through the vent)
  vec2 oc = ro.xz - uVent.xz; float b = dot(oc, rd.xz), a = dot(rd.xz, rd.xz), c = dot(oc, oc) - uR * uR * 1.3;
  float disc = b * b - a * c; if (disc < 0.) discard;
  float t0 = max(0., (-b - sqrt(disc)) / a), t1 = (-b + sqrt(disc)) / a;
  if (t1 <= t0) discard;
  // terrain between the camera and the volume hides it (coarse heightfield march)
  for (int k = 1; k <= 24; k++) { vec3 pp = ro + rd * (t0 * float(k) / 24.); if (pp.y < groundAt(pp.xz) - 2.) discard; }
  const int N = 56; float dt = (t1 - t0) / float(N);
  float g = 1.796, v = uSpeed * .92, Hm = v * v / (2. * g);
  vec3 acc = vec3(0.); float tr = 1.;
  float jit = h31(vec3(gl_FragCoord.xy, uTime));
  for (int i = 0; i < N; i++) {
    float t = t0 + (float(i) + jit) * dt;
    vec3 p = ro + rd * t; vec3 q = p - uVent;
    float r = length(q.xz), y = q.y;
    if (y < -5. || y > Hm * 1.05) continue;
    if (p.y < groundAt(p.xz)) break;
    float env = Hm - g * r * r / (2. * v * v);           // trajectory envelope height at radius r
    float rr = r / uR;
    float shell = exp(-pow((env - y) / (.14 * Hm), 2.)) * (1. - smoothstep(env - .02 * Hm, env + .1 * Hm, y)) * smoothstep(1.12, .85, rr) * (.2 + .7 * rr);
    float yR = max(env, 0.);
    float curtain = exp(-pow((rr - 1.) / .07, 2.)) * smoothstep(-5., .1 * Hm, y) * (1. - smoothstep(.0, 1., y / max(.35 * Hm, 1.)));
    float column = exp(-pow(r / (.05 * uR + .02 * y), 2.)) * (1. - y / Hm) * .8;
    float ph = atan(q.z, q.x);
    float rays = .65 + .35 * sin(ph * 7. + 2. * n3(vec3(ph * 2., 0., 1.)));
    vec3 np = q * .0035 + vec3(0., -uTime * .01, 0.) + normalize(vec3(q.x, 0., q.z) + 1e-3) * uTime * .006;
    float nz = n3(np) * .6 + n3(np * 2.7) * .4;
    // particulate: fine clumps (~20-40 m) modulate the density so the umbrella reads as fallout grains
    float grain = smoothstep(.42, .78, n3(q * .045 + vec3(0., uTime * .15, 0.))) * .8 + .2;
    float d = (shell * .8 + curtain * 1.1 + column * .6) * rays * smoothstep(.3, .8, nz) * grain * 1.2;
    if (d < .001) continue;
    float fwd = pow(max(dot(rd, uSun), 0.), 6.);
    vec3 col = mix(vec3(.98, .88, .64), vec3(.68, .78, 1.), smoothstep(.2, .9, y / Hm)) * (.1 + uSunUp * (.65 + 2.2 * fwd));
    float s = d * dt * .00035 * uGain;
    acc += col * s * tr; tr *= 1. - s;
  }
  gl_FragColor = vec4(acc, 0.);
}`;

export async function buildPlumes(base, meta, hf) {
  const group = new THREE.Group();
  group.name = "particles";
  // heightfield texture for ground-hugging particles
  const n = hf.n;
  const ht = new THREE.DataTexture(hf.data, n, n, THREE.RedFormat, THREE.FloatType);
  ht.magFilter = ht.minFilter = THREE.LinearFilter;
  ht.needsUpdate = true;
  const mats = [];
  const plumeObjs = [], partObjs = [];
  const r = rng(7);
  for (const v of meta.vents || []) {
    if (v.type !== "plume") continue;
    {
      const vv = v.speed * 0.92, Hm = (vv * vv) / (2 * G), R = (vv * vv * Math.sin(2 * THREE.MathUtils.degToRad(v.zenithMean))) / G;
      const vm = new THREE.ShaderMaterial({
        uniforms: { uVent: { value: new THREE.Vector3(v.x, v.y, v.z) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uR: { value: R }, uH: { value: Hm },
          uSpeed: { value: v.speed }, uTime: { value: 0 }, uSunUp: { value: 1 }, uGain: { value: v.volumeGain ?? 2.0 }, tH: { value: null }, uHSize: { value: 7168 }, uScale: { value: 0 } },
        vertexShader: VOL_VS, fragmentShader: VOL_FS, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true, side: THREE.BackSide,
      });
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.15, R * 1.15, Hm * 1.1, 48, 1, false), vm);
      cyl.position.set(v.x, v.y + Hm * 0.55 - 5, v.z);
      cyl.frustumCulled = false;
      cyl.renderOrder = 5;
      group.add(cyl); mats.push(vm); plumeObjs.push(cyl);
    }
    // two layers: a soft canopy haze of large faint sprites and finer grains that show the ballistic rays
    for (const layer of [{ n: v.particles * 0.6, size: v.size * 0.9, alpha: 0.022, grow: 1.8, maxPx: 14 }]) {
      const N = Math.round(layer.n);
      const aL = new Float32Array(N * 4), aS = new Float32Array(N * 2), pos = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const zen = Math.abs(THREE.MathUtils.degToRad(v.zenithMean + gauss(r) * v.zenithSd));
        aL.set([r() * Math.PI * 2, Math.min(zen, 1.35), 0.75 + 0.25 * Math.sqrt(r()), r()], i * 4);
        aS.set([layer.size * (0.6 + 0.8 * r()), r() < v.hotFraction ? 1 : 0], i * 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("aL", new THREE.BufferAttribute(aL, 4));
      g.setAttribute("aS", new THREE.BufferAttribute(aS, 2));
      const m = makeMat(PLUME_VS, THREE.AdditiveBlending);
      m.uniforms.uVent.value.set(v.x, v.y, v.z);
      m.uniforms.uSpeed.value = v.speed;
      m.uniforms.uAlpha.value = layer.alpha; m.uniforms.uGrow.value = layer.grow; m.uniforms.uMaxPx.value = layer.maxPx;
      const pts = new THREE.Points(g, m);
      pts.frustumCulled = false;
      group.add(pts); mats.push(m); plumeObjs.push(pts);
    }
  }
  // fumarole puffs
  const fum = (meta.vents || []).filter((v) => v.type === "fumarole");
  if (fum.length) {
    const per = 40, N = fum.length * per;
    const aP = new Float32Array(N * 4), aQ = new Float32Array(N * 4);
    let k = 0;
    for (const v of fum) for (let i = 0; i < per; i++, k++) {
      const a = r() * Math.PI * 2;
      aP.set([v.x + gauss(r) * (v.spread || 4), v.z + gauss(r) * (v.spread || 4), v.y, r()], k * 4);
      aQ.set([(v.rise || 3) * (0.6 + 0.8 * r()), Math.cos(a) * 0.4, Math.sin(a) * 0.4, (v.size || 6) * (0.6 + 0.8 * r())], k * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aP", new THREE.BufferAttribute(aP, 4));
    g.setAttribute("aQ", new THREE.BufferAttribute(aQ, 4));
    const m = makeMat(PUFF_VS, THREE.NormalBlending);
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; group.add(pts); mats.push(m); partObjs.push(pts);
  }
  // ground dust around plume vents and big fumaroles
  const dv = (meta.vents || []).filter((v) => v.dust);
  if (dv.length) {
    const per = 1500, N = dv.length * per;
    const aD = new Float32Array(N * 4), aE = new Float32Array(N * 2);
    let k = 0;
    for (const v of dv) for (let i = 0; i < per; i++, k++) {
      aD.set([v.x, v.z, r() * Math.PI * 2, r()], k * 4);
      aE.set([v.dust * (0.4 + 0.6 * r()), 3 + 5 * r()], k * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aD", new THREE.BufferAttribute(aD, 4));
    g.setAttribute("aE", new THREE.BufferAttribute(aE, 2));
    const m = makeMat(DUST_VS, THREE.NormalBlending);
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; group.add(pts); mats.push(m); partObjs.push(pts);
  }
  // outgassing over hot lava
  const gs = meta.gasSources || [];
  if (gs.length) {
    const per = 6, N = gs.length * per;
    const aG = new Float32Array(N * 4), aH = new Float32Array(N * 2);
    let k = 0;
    for (const s of gs) for (let i = 0; i < per; i++, k++) {
      aG.set([s[0] + gauss(r) * 3, s[1], s[2] + gauss(r) * 3, r()], k * 4);
      aH.set([s[3], 8 + 10 * r()], k * 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
    g.setAttribute("aG", new THREE.BufferAttribute(aG, 4));
    g.setAttribute("aH", new THREE.BufferAttribute(aH, 2));
    const m = makeMat(GAS_VS, THREE.NormalBlending);
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; group.add(pts); mats.push(m); partObjs.push(pts);
  }
  for (const m of mats) { m.uniforms.tH.value = ht; m.uniforms.uHSize.value = hf.size; }
  return {
    group,
    update(time, camera) {
      const s = (window.iob?.renderer?.domElement.height || 900) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
      for (const m of mats) { m.uniforms.uTime.value = time; m.uniforms.uScale.value = s; }
    },
    setSun(dir) { const up = THREE.MathUtils.smoothstep(dir.y, -0.05, 0.08); for (const m of mats) { m.uniforms.uSun.value.copy(dir); m.uniforms.uSunUp.value = up; } },
    setVisible({ plumes, particles }) {
      if (plumes !== undefined) for (const o of plumeObjs) o.visible = plumes;
      if (particles !== undefined) for (const o of partObjs) o.visible = particles;
    },
  };
}
