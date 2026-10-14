import * as THREE from "three";

// Procedural Jupiter for the black Europa sky: banded canvas texture, lit from the sun direction (phase).
export function buildJupiter({ dir = [-0.55, 0.16, -1], distance = 10500, radius = 1700, sun = [0.7, 0.2, 0.6] } = {}) {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  const bands = ["#d9c7a8", "#c49a6c", "#e8dcc4", "#a8754e", "#e2d2b6", "#b98b62", "#efe4d0", "#9d6b47", "#dccab0", "#c8a37c", "#e9dfcc", "#b08560"];
  let y = 0, k = 0;
  while (y < 256) { const h = 8 + ((k * 37) % 23); g.fillStyle = bands[k % bands.length]; g.fillRect(0, y, 512, h); y += h; k++; }
  // turbulent band edges and the great red spot
  for (let i = 0; i < 1600; i++) { const x = (i * 97) % 512, yy = (i * 53) % 256; g.fillStyle = `rgba(${150 + (i % 80)},${110 + (i % 60)},${80 + (i % 40)},0.08)`; g.fillRect(x, yy, 20 + (i % 30), 2); }
  g.fillStyle = "#b5583a"; g.beginPath(); g.ellipse(330, 165, 26, 13, 0, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Vector3(...sun).normalize();
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: tex }, sun: { value: s } }, fog: false, depthWrite: false,
    vertexShader: "varying vec2 vUv;varying vec3 vN;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: "uniform sampler2D map;uniform vec3 sun;varying vec2 vUv;varying vec3 vN;void main(){vec3 c=texture2D(map,vUv).rgb;float l=clamp(dot(normalize(vN),sun)*1.2+0.05,0.,1.);gl_FragColor=vec4(c*l*0.95,1.);\n#include <colorspace_fragment>\n}",
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(distance);
  m.position.copy(d);
  m.rotation.z = 0.05;
  m.renderOrder = -1;
  m.frustumCulled = false;
  return m;
}
