import * as THREE from "three";

// Black airless sky: faint star points and Jupiter (NASA/ESA OPAL 2015 map, public domain),
// ~19.5 deg across as seen from Io, lit from the sun direction so its phase follows the time of day.
export function buildSky(jupiterTex) {
  const group = new THREE.Group();
  group.name = "sky";
  const R = 50000;
  // stars
  const n = 4000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
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
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, depthWrite: false, fog: false }));
  stars.renderOrder = -2;
  stars.frustumCulled = false;
  group.add(stars);

  const sun = new THREE.Vector3(0, 1, 0);
  const jmat = new THREE.ShaderMaterial({
    uniforms: { map: { value: jupiterTex }, sun: { value: sun }, gain: { value: 1.0 } },
    depthWrite: false,
    vertexShader: "varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform sampler2D map;uniform vec3 sun;uniform float gain;varying vec2 vUv;varying vec3 vN;
      void main(){ vec3 c = texture2D(map, vUv).rgb; float d = dot(normalize(vN), sun);
        float l = smoothstep(-0.06, 0.25, d) * (0.35 + 0.65 * clamp(d, 0., 1.));
        vec3 col = c * l * gain + c * 0.004;   // faint night side
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const jdist = 45000, jang = THREE.MathUtils.degToRad(19.5);
  const jup = new THREE.Mesh(new THREE.SphereGeometry(Math.tan(jang / 2) * jdist, 96, 48), jmat);
  jup.renderOrder = -1;
  jup.frustumCulled = false;
  group.add(jup);
  return {
    group, jupiter: jup, stars,
    setJupiterDir(dir) { jup.position.copy(dir).normalize().multiplyScalar(jdist); jup.rotation.set(0.05, 0, 0.06); },
    setSun(dir) { sun.copy(dir).normalize(); },
    follow(cam) { group.position.copy(cam.position); },
    setGain(g) { jmat.uniforms.gain.value = g; },
  };
}
