import * as THREE from "three";

// Faint vapour over the possible thermal cells (round 2, cheap): a few hundred GPU points per cell rise 0-35 m from
// the floor patch, drift downwind (from azimuth 25 deg) and fade; streaky, low-opacity sprites so they read as a
// thin warm-air shimmer of condensate, not as puffs. Positions are analytic in the vertex shader (no CPU update).
export function buildVapour(meta, hf) {
  const cells = meta.sites?.thermalCells || [];
  if (!cells.length) return null;
  const N = 260, n = cells.length * N;
  const seed = new Float32Array(n * 4), base = new Float32Array(n * 3);
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const ax = Math.cos(THREE.MathUtils.degToRad(-22)), az = Math.sin(THREE.MathUtils.degToRad(22));
  cells.forEach((c, ci) => {
    for (let i = 0; i < N; i++) {
      const k = ci * N + i;
      const u = (rnd() - 0.5) * c.lengthM * 0.9, v = (rnd() - 0.5) * c.widthM * 0.8;
      const x = c.x + u * ax - v * az, z = c.z + u * az + v * ax;
      base.set([x, hf.at(x, z) + 0.5, z], k * 3);
      seed.set([rnd(), rnd(), rnd(), rnd()], k * 4);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(base, 3));
  g.setAttribute("seed", new THREE.BufferAttribute(seed, 4));
  const U0 = { uTime: { value: 0 }, uWind: { value: new THREE.Vector2(-Math.sin(THREE.MathUtils.degToRad(25)), Math.cos(THREE.MathUtils.degToRad(25))) }, uScale: { value: 900 } };
  const U = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, U0]);
  const mat = new THREE.ShaderMaterial({
    uniforms: U, transparent: true, depthWrite: false, fog: true,
    vertexShader: `uniform float uTime, uScale; uniform vec2 uWind; attribute vec4 seed; varying float vA; varying float vS;
      #include <common>
      #include <fog_pars_vertex>
      void main(){
        float T = 26. + seed.y * 18.;
        float t = fract(uTime / T + seed.x);
        vec3 p = position + vec3(uWind.x, 0., uWind.y) * t * (18. + 14. * seed.z) + vec3(sin(t * 6.28 + seed.w * 9.) * 2., t * (22. + 14. * seed.w), 0.);
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.); vec4 mv = mvPosition;
        gl_Position = projectionMatrix * mv;
        float sz = (6. + 10. * t) ;
        gl_PointSize = clamp(sz * uScale / -mv.z, 0., 64.);
        vA = smoothstep(0., .15, t) * (1. - smoothstep(.45, 1., t)) * .05 * smoothstep(60., 300., -mv.z);
        vS = seed.w;
        #include <fog_vertex>
      }`,
    fragmentShader: `varying float vA; varying float vS;
      #include <common>
      #include <fog_pars_fragment>
      void main(){
        vec2 q = gl_PointCoord - .5; float r = length(q);
        float streak = .6 + .4 * sin(q.y * 14. + vS * 30.);
        float a = vA * (1. - smoothstep(.15, .5, r)) * streak;
        if (a < .002) discard;
        gl_FragColor = vec4(vec3(1., .93, .84) * 1.3, a);
        #include <fog_fragment>
      }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  const group = new THREE.Group(); group.name = "vapour"; group.add(pts);
  return { group, update(t) { U.uTime.value = t; } };
}
