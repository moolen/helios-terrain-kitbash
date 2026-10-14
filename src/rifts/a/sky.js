// Black sky, a sparse star field and Jupiter (~12 deg across from Europa), lit by the sun.
import * as THREE from "three";
import { random } from "../../studio/core/noise.js";

export const JUPITER = { azimuth: 128, elevation: 7.5, size: 11.5 }; // degrees

export function buildSky(light) {
  const group = new THREE.Group();
  const R = 15000;
  const dir = (az, el) => { const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el); return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)); };
  const sunDir = dir(light.azimuth, light.elevation);
  const jd = dir(JUPITER.azimuth, JUPITER.elevation);
  const r = R * Math.tan(THREE.MathUtils.degToRad(JUPITER.size / 2));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uSun: { value: sunDir } }, fog: false,
    vertexShader: "varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normal);vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader: `uniform vec3 uSun;varying vec3 vN;varying vec3 vP;
float h(float n){return fract(sin(n)*43758.5453);}
float n1(float x){float i=floor(x),f=fract(x);return mix(h(i),h(i+1.),f*f*(3.-2.*f));}
void main(){float lat=vN.y;float lon=atan(vN.z,vN.x);
 float b=sin(lat*19.+1.3*n1(lat*40.+lon*.8))*.5+.5;float w=n1(lat*90.+lon*3.)*.25;
 vec3 c=mix(vec3(.80,.68,.55),vec3(.93,.88,.80),b);c=mix(c,vec3(.62,.46,.34),smoothstep(.75,.95,n1(lat*13.+4.))*.6+w*.3);
 float spot=1.-smoothstep(.06,.1,length(vec2((lon-.6)*.55,(lat+.33))));c=mix(c,vec3(.72,.42,.30),spot*.8);
 float l=clamp(dot(vN,uSun),0.,1.);float d=pow(l,.6)*.95+.07;
 gl_FragColor=vec4(c*d*1.15,1.);
 #include <colorspace_fragment>
}`,
  });
  const jup = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32), mat);
  jup.position.copy(jd.multiplyScalar(R));
  jup.rotation.z = 0.05;
  jup.frustumCulled = false;
  group.add(jup);
  const rand = random(5);
  const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = rand() * 2 - 1, a = rand() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    const v = new THREE.Vector3(Math.cos(a) * s, Math.abs(u) * 0.95 + 0.02, Math.sin(a) * s).normalize().multiplyScalar(R * 1.1);
    pos.set([v.x, v.y, v.z], i * 3);
    const b = 0.25 + rand() ** 3 * 0.75;
    col.set([b, b, b * 1.05], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, fog: false, toneMapped: false }));
  stars.frustumCulled = false;
  group.add(stars);
  return group;
}
