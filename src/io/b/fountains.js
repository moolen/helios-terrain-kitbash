import * as THREE from "three";

// Curtain of fire: lava fountain particles along the active fissure slot pieces (lava.json "fountains").
// Each clot is ballistic under Io gravity (no drag): launched nearly vertically from a random point on
// a slot piece, with a small spread across and along the fissure. Every flight cycle re-rolls the
// launch speed from a hash of (particle, cycle) and a slow pulse that travels along the fissure, so the
// curtain is made of jets that rise and fall rather than a uniform sheet. Clots cool in flight
// (blackbody white-yellow -> orange -> dull red) and fade as they darken. Pure GPU: no per-frame CPU work.
const G = 1.796;

const VS = /* glsl */ `
attribute vec4 aA;   // slot start x, z, end x, end z
attribute vec4 aB;   // along 0..1, lateral offset (m), phase, size (m)
attribute vec4 aC;   // base speed, heat, spread (rad), seed
uniform float uTime, uScale;
varying vec4 vCol;
float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
void main() {
  float g = ${G};
  float seed = aC.w;
  float v0 = aC.x;
  float tfMax = 2. * v0 * 1.25 / g + .5;
  float cyc = uTime / tfMax + aB.z;
  float k = floor(cyc);
  float r1 = h11(seed * 13.7 + k * 1.37), r2 = h11(seed * 7.1 + k * 3.11), r3 = h11(seed * 3.3 + k * 9.7), r4 = h11(seed * 5.9 + k * 0.73);
  vec2 A = aA.xy, B = aA.zw; vec2 AB = B - A; float L = length(AB); vec2 u = AB / max(L, 1e-3); vec2 n = vec2(-u.y, u.x);
  float along = fract(aB.x + r4 * .37);
  // travelling pulse along the fissure and per-cycle jet strength
  float pulse = .55 + .45 * sin(uTime * .35 + (A.x + u.x * along * L) * .045 + (A.y + u.y * along * L) * .03);
  // sheet envelope along each slot piece: tapers at the ends, uneven crest (jets) every few metres
  float jq = along * L / 3.5 + aA.x * .37; float jf = fract(jq); jf = jf * jf * (3. - 2. * jf);
  float env = pow(sin(3.14159 * along), .6) * (.4 + .6 * mix(h11(floor(jq)), h11(floor(jq) + 1.), jf));
  float spd = v0 * (.55 + .45 * r1) * (.6 + .4 * pulse) * (.7 + .3 * aC.y) * env;
  float zen = aC.z * (r2 * 2. - 1.);
  float azn = (r3 * 2. - 1.) * .12;
  vec3 dir = normalize(vec3(n.x * sin(zen) + u.x * azn * sin(aC.z), cos(zen), n.y * sin(zen) + u.y * azn * sin(aC.z)));
  float tf = 2. * spd * dir.y / g;
  float t = fract(cyc) * tfMax;
  vec2 base = A + AB * along + n * aB.y;
  vec3 p = vec3(base.x, 0., base.y) + dir * spd * t;
  p.y -= .5 * g * t * t;
  float alive = step(t, tf) * step(.05, env);
  // vertical origin: per-vertex attribute baked into position.y
  p.y += position.y;
  vec4 mv = modelViewMatrix * vec4(p, 1.);
  gl_Position = projectionMatrix * mv;
  float size = aB.w * (1. + .6 * r2);
  gl_PointSize = clamp(size * 1.4 * uScale / -mv.z, 1.2, 18.) * alive;
  // cooling: clot temperature by flight time; big clots stay hot longer
  float T = exp(-t / (2.2 + 1.5 * aB.w)) * (.7 + .3 * aC.y);
  vec3 c = vec3(1., .2 + .6 * T, .04 + .4 * T * T) * (.18 + 1.6 * T * T);
  float a = alive * smoothstep(0., .6, t) * smoothstep(.02, .25, T);
  if (aB.w > 1.9) c *= .06;
  // seen from above, the narrow sheet collapses onto the slot and additive clots pile up into lozenges
  vec3 vd = normalize(p - cameraPosition);
  a *= 1. - .75 * smoothstep(.45, .85, -vd.y);
  vCol = vec4(c * a, a);
}`;

const FS = /* glsl */ `
uniform float uGain;
varying vec4 vCol;
void main() {
  // clots streak vertically (motion blur of fast, mostly vertical flight)
  vec2 d = gl_PointCoord * 2. - 1.; float r2 = d.x * d.x * 1.6 + d.y * d.y * .9;
  if (r2 > 1.) discard;
  float f = exp(-r2 * 3.);
  gl_FragColor = vec4(vCol.rgb * f * uGain, 0.);
}`;

export function buildFountains(meta, hf) {
  const list = meta.fountains || [];
  const group = new THREE.Group();
  group.name = "fountains";
  if (!list.length) return { group, update() {}, setVisible() {} };
  let s = 1234567;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const perM = 70;      // clots per metre of active slot at full heat
  const items = [];
  for (const f of list) {
    const L = Math.hypot(f.b[0] - f.a[0], f.b[1] - f.a[1]);
    const n = Math.round(L * perM * f.heat);
    for (let i = 0; i < n; i++) items.push(f);
  }
  const N = items.length;
  const pos = new Float32Array(N * 3), aA = new Float32Array(N * 4), aB = new Float32Array(N * 4), aC = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const f = items[i];
    const along = rnd();
    const x = f.a[0] + (f.b[0] - f.a[0]) * along, z = f.a[1] + (f.b[1] - f.a[1]) * along;
    pos[i * 3 + 1] = f.ya !== undefined ? f.ya + (f.yb - f.ya) * along : hf.at(x, z);   // slot lip height from the 1 m DEM
    aA.set([f.a[0], f.a[1], f.b[0], f.b[1]], i * 4);
    // 16 % "veil": big, slow, low and dim sprites that read as the incandescent sheet at the base
    const veil = false, big = rnd() < 0.05;
    aB.set([along, (rnd() - 0.5) * 0.8, rnd(), veil ? 2.0 + rnd() * 2.5 : big ? 0.9 + rnd() * 0.8 : 0.3 + rnd() * 0.5], i * 4);
    aC.set([f.speed * (veil ? 0.32 : 1), f.heat, THREE.MathUtils.degToRad(veil ? 5 : f.spread), rnd() * 1000], i * 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("aA", new THREE.BufferAttribute(aA, 4));
  g.setAttribute("aB", new THREE.BufferAttribute(aB, 4));
  g.setAttribute("aC", new THREE.BufferAttribute(aC, 4));
  const m = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 800 }, uGain: { value: 1.0 } },
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, premultipliedAlpha: true,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 4;
  group.add(pts);
  return {
    group, count: N,
    update(time, camera, h) {
      m.uniforms.uTime.value = time;
      m.uniforms.uScale.value = h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    },
    setVisible(v) { group.visible = v; },
  };
}
