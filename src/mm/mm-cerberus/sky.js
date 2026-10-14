import * as THREE from "three";

// Mars daytime sky: butterscotch dust sky, darker and browner toward the zenith, a small hard sun with
// the blue-ish forward-scattering aureole of Martian dust around it, and a pale horizon band that matches
// the distance haze (scene fog) so the terrain fades into it. Analytic, no textures.
export function buildSky() {
  const group = new THREE.Group();
  group.name = "sky";
  const U = {
    sun: { value: new THREE.Vector3(0, 1, 0) },
    horizon: { value: new THREE.Color(0xc8a07a) },
    zenith: { value: new THREE.Color(0x8c6a50) },
    aureole: { value: new THREE.Color(0xb9c4cc) },
    gain: { value: 1.0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: U, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
    fragmentShader: `uniform vec3 sun, horizon, zenith, aureole; uniform float gain; varying vec3 vD;
      void main(){
        vec3 d = normalize(vD); float h = clamp(d.y, -0.2, 1.);
        float day = smoothstep(-0.12, 0.12, sun.y);
        vec3 c = mix(horizon, zenith, pow(clamp(h, 0., 1.), 0.55));
        c = mix(c, horizon * .8, smoothstep(0., -.15, d.y));
        float cs = max(dot(d, normalize(sun)), 0.);
        c += aureole * (pow(cs, 14.) * .35 + pow(cs, 220.) * .9) * day;          // dust forward scattering
        c *= (.08 + .92 * day);
        float disk = smoothstep(.99985, .99993, cs);                               // ~0.35 deg sun disc
        c += vec3(1., .97, .9) * disk * 40. * day;
        gl_FragColor = vec4(c * gain, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50000, 64, 32), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -2;
  group.add(dome);
  return {
    group, uniforms: U,
    setSun(dir) { U.sun.value.copy(dir).normalize(); },
    follow(cam) { group.position.copy(cam.position); },
  };
}
