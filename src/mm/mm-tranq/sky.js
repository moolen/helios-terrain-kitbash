import * as THREE from "three";

// Black airless sky, faint stars (only visible with the sun down) and Earth: Solar System Scope day map (CC BY 4.0),
// 1.9 deg across, fixed in the sky at the mean sub-Earth direction, lit by the sun so its phase follows the time of
// day (gibbous in the morning and evening, a thin crescent near local noon here).
export function buildSky(earthTex) {
  const group = new THREE.Group();
  group.name = "sky";
  const R = 50000;
  const n = 3000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  let s = 12345;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const u = rnd() * 2 - 1, t = rnd() * Math.PI * 2, r = Math.sqrt(1 - u * u);
    pos.set([r * Math.cos(t) * R, u * R, r * Math.sin(t) * R], i * 3);
    const b = Math.pow(rnd(), 6) * 0.9 + 0.05, w = rnd();
    col.set([b * (0.85 + 0.15 * w), b * 0.9, b * (1.05 - 0.2 * w)], i * 3);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  sg.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const smat = new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false, transparent: true, opacity: 0 });
  const stars = new THREE.Points(sg, smat);
  stars.renderOrder = -2;
  stars.frustumCulled = false;
  group.add(stars);

  const sun = new THREE.Vector3(0, 1, 0);
  const emat = new THREE.ShaderMaterial({
    uniforms: { map: { value: earthTex }, sun: { value: sun }, gain: { value: 1.0 } },
    depthWrite: false,
    vertexShader: "varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vec4 w=modelMatrix*vec4(position,1.);vV=normalize(cameraPosition-w.xyz);gl_Position=projectionMatrix*viewMatrix*w;}",
    fragmentShader: `uniform sampler2D map;uniform vec3 sun;uniform float gain;varying vec2 vUv;varying vec3 vN;varying vec3 vV;
      void main(){ vec3 c = texture2D(map, vUv).rgb; vec3 n = normalize(vN); float d = dot(n, sun);
        float l = smoothstep(-.03, .12, d) * (.25 + .75 * clamp(d, 0., 1.));
        float rim = pow(1. - clamp(dot(n, normalize(vV)), 0., 1.), 3.);
        vec3 col = (c * 1.25 + vec3(.05, .08, .16)) * l * gain + vec3(.25, .45, 1.) * rim * smoothstep(-.1, .3, d) * .6 * gain;
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const edist = 45000, eang = THREE.MathUtils.degToRad(1.9);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(Math.tan(eang / 2) * edist, 96, 48), emat);
  earth.renderOrder = -1;
  earth.frustumCulled = false;
  group.add(earth);
  return {
    group, earth, stars,
    // the near side faces the Moon: rotate so that ~0 deg longitude (Africa / Atlantic) faces us
    setEarthDir(dir) { earth.position.copy(dir).normalize().multiplyScalar(edist); earth.lookAt(0, 0, 0); earth.rotateY(-Math.PI / 2); earth.rotateX(0.41 * 0); },
    setSun(dir) { sun.copy(dir).normalize(); smat.opacity = THREE.MathUtils.smoothstep(-dir.y, -0.02, 0.1) * 0.9; },
    follow(cam) { group.position.copy(cam.position); },
    setGain(g) { emat.uniforms.gain.value = g; },
  };
}
