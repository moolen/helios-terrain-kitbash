import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

export const LIGHT_DEFAULTS = {
  azimuth: 84, elevation: 18, intensity: 4.5, colour: "#fff6ed",
  fill: 0.9, fillColour: "#e9e6e1", fillAzimuth: 20, fillElevation: 35,
  hemi: 0.5, hemiSky: "#b2bccc", hemiGround: "#6f7480",
  skyBoost: 1, skySpread: 30,
  exposure: 1.02, toneMapping: "aces", ao: 0.5, aoRadius: 3, shadowSoftness: 0.55, shadowIntensity: 0.85,
};

const PAINT_SHADER = {
  uniforms: { tDiffuse: { value: null }, resolution: { value: new THREE.Vector2(1, 1) }, radius: { value: 4 }, sharp: { value: 8 }, mixAmt: { value: 1 } },
  vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: `
uniform sampler2D tDiffuse;uniform vec2 resolution;uniform float radius;uniform float sharp;uniform float mixAmt;varying vec2 vUv;
void main(){
 vec2 px=1./resolution;vec3 m[8];vec3 s2[8];float w[8];
 for(int k=0;k<8;k++){m[k]=vec3(0.);s2[k]=vec3(0.);w[k]=0.;}
 int R=int(radius);
 for(int j=-6;j<=6;j++)for(int i=-6;i<=6;i++){
  if(abs(i)>R||abs(j)>R)continue;
  vec2 o=vec2(float(i),float(j));float d=length(o);if(d>radius)continue;
  vec3 c=texture2D(tDiffuse,vUv+o*px).rgb;
  float a=atan(o.y,o.x);float g=exp(-d*d/(radius*radius));
  for(int k=0;k<8;k++){float ca=float(k)*0.7853982;float da=abs(mod(a-ca+3.1415927,6.2831853)-3.1415927);
   float ww=(d<0.5?1.:max(0.,1.-da/0.7853982))*g;m[k]+=c*ww;s2[k]+=c*c*ww;w[k]+=ww;}
 }
 vec3 acc=vec3(0.);float tw=0.;
 for(int k=0;k<8;k++){vec3 mu=m[k]/max(w[k],1e-4);vec3 v=abs(s2[k]/max(w[k],1e-4)-mu*mu);float sg=dot(v,vec3(1.))*1000.;float wk=1./(1.+pow(sg,sharp*0.5));acc+=mu*wk;tw+=wk;}
 vec3 base=texture2D(tDiffuse,vUv).rgb;gl_FragColor=vec4(mix(base,acc/max(tw,1e-4),mixAmt),1.);
}`,
};

export class Stage {
  constructor(container, { width, height, pixelRatio } = {}) {
    this.container = container;
    this.fixed = width ? [width, height] : null;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 1, 12000);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(pixelRatio ?? Math.min(devicePixelRatio, 1.5));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.addEventListener("change", () => this.invalidate());
    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight();
    this.scene.add(this.hemi, this.sun, this.sun.target, this.fill);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ao = new GTAOPass(this.scene, this.camera, 16, 16);
    this.composer.addPass(this.ao);
    this.composer.addPass(new OutputPass());
    this.fxaa = new ShaderPass(FXAAShader);
    this.composer.addPass(this.fxaa);
    // Optional painterly pass (generalised Kuwahara: 8 sectors, gaussian-weighted), enabled per brief via light.paint.
    this.paint = new ShaderPass(PAINT_SHADER);
    this.paint.enabled = false;
    this.composer.addPass(this.paint);
    this.frames = 0;
    this.dirty = 0;
    this.queued = false;
    this.onFrame = null;
    addEventListener("resize", () => this.resize());
    this.resize();
  }
  size() {
    if (this.fixed) return this.fixed;
    const r = this.container.getBoundingClientRect();
    return [Math.max(64, r.width), Math.max(64, r.height)];
  }
  resize() {
    const [w, h] = this.size();
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, !this.fixed);
    this.composer.setSize(w, h);
    const pr = this.renderer.getPixelRatio();
    this.fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr));
    this.paint.material.uniforms.resolution.value.set(w * pr, h * pr);
    this.invalidate();
  }
  // Light, shadow frustum and post settings from a brief.
  applyLight(light, focus, sky) {
    const L = { ...LIGHT_DEFAULTS, ...light };
    this.paint.enabled = !!L.paint;
    if (L.paint) { const u = this.paint.material.uniforms; u.radius.value = L.paint.radius ?? 4; u.sharp.value = L.paint.sharp ?? 8; u.mixAmt.value = L.paint.mix ?? 1; }
    const a = THREE.MathUtils.degToRad(L.azimuth), e = THREE.MathUtils.degToRad(L.elevation);
    const [x0, z0, x1, z1] = L.shadowBox || focus;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, half = Math.hypot(x1 - x0, z1 - z0) / 2;
    this.sun.color.set(L.colour);
    this.sun.intensity = L.intensity;
    this.sun.position.set(cx + Math.sin(a) * 2000 * Math.cos(e), Math.sin(e) * 2000, cz + Math.cos(a) * 2000 * Math.cos(e));
    this.sun.target.position.set(cx, 0, cz);
    Object.assign(this.sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 4200 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.00002;
    this.sun.shadow.normalBias = L.shadowNormalBias ?? 0.035 * (half / 480);
    this.sun.shadow.radius = L.shadowSoftness;
    this.sun.shadow.intensity = L.shadowIntensity;
    const fa = THREE.MathUtils.degToRad(L.fillAzimuth), fe = THREE.MathUtils.degToRad(L.fillElevation);
    this.fill.color.set(L.fillColour);
    this.fill.intensity = L.fill;
    this.fill.position.set(Math.sin(fa) * 400 * Math.cos(fe), Math.sin(fe) * 400, Math.cos(fa) * 400 * Math.cos(fe));
    this.hemi.color.set(L.hemiSky);
    this.hemi.groundColor.set(L.hemiGround);
    this.hemi.intensity = L.hemi;
    this.renderer.toneMapping = L.toneMapping === "neutral" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = L.exposure;
    this.ao.blendIntensity = L.ao;
    this.ao.updateGtaoMaterial({ radius: L.aoRadius, distanceExponent: 1.4, thickness: 2, distanceFallOff: 0.8, scale: 1, samples: 12 });
    this.ao.updatePdMaterial({ radius: 5, lumaPhi: 8, depthPhi: 2, normalPhi: 4, samples: 8 });
    if (this.scene.background?.dispose) this.scene.background.dispose();
    this.scene.background = new THREE.Color(sky?.[0] || "#000000");
    // Multi-stop skies are a dome graded by elevation (top first, horizon last). The output pass
    // tone-maps the sky too, so skyBoost lifts it to the intended hue (ACES darkens 1.0 to ~0.8).
    if (this.skyDome) { this.scene.remove(this.skyDome); this.skyDome.geometry.dispose(); this.skyDome.material.dispose(); this.skyDome = null; }
    if (sky && sky.length > 1) {
      const stops = sky.slice(0, 6).map((c) => new THREE.Color(c));
      while (stops.length < 6) stops.push(stops[stops.length - 1].clone());
      const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: { stops: { value: stops }, n: { value: Math.min(6, sky.length) }, boost: { value: L.skyBoost }, spread: { value: Math.sin(THREE.MathUtils.degToRad(L.skySpread)) } },
        vertexShader: "varying vec3 vDir;void main(){vDir=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w*.9999;}",
        fragmentShader: "uniform vec3 stops[6];uniform float n;uniform float boost;uniform float spread;varying vec3 vDir;void main(){float t=clamp(1.-vDir.y/spread,0.,1.)*(n-1.);vec3 c=stops[0];for(int i=0;i<5;i++){if(float(i)<n-1.&&t>=float(i))c=mix(stops[i],stops[i+1],clamp(t-float(i),0.,1.));}gl_FragColor=vec4(c*boost,1.);\n#include <colorspace_fragment>\n}",
      });
      this.skyDome = new THREE.Mesh(new THREE.SphereGeometry(9000, 32, 16), mat);
      this.skyDome.frustumCulled = false;
      this.skyDome.renderOrder = -1;
      this.scene.add(this.skyDome);
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.invalidate();
  }
  setView(view) {
    this.camera.fov = view.fov ?? 60;
    this.camera.near = view.near ?? 1;
    this.camera.far = view.far ?? 12000;
    this.camera.position.fromArray(view.position);
    this.controls.target.fromArray(view.target);
    if (view.viewOffset) {
      const { fullWidth, fullHeight, x, y, width, height } = view.viewOffset;
      this.camera.setViewOffset(fullWidth, fullHeight, x, y, width, height);
    } else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    const damping = this.controls.enableDamping;
    this.controls.enableDamping = false;
    this.controls.update();
    this.controls.enableDamping = damping;
    this.invalidate();
  }
  currentView() {
    const r = (v) => v.toArray().map((n) => Math.round(n * 10) / 10);
    return { position: r(this.camera.position), target: r(this.controls.target), fov: this.camera.fov };
  }
  invalidate(frames = 6) {
    this.dirty = Math.max(this.dirty, frames);
    if (!this.queued) { this.queued = true; requestAnimationFrame(() => this.frame()); }
  }
  frame() {
    this.queued = false;
    this.controls.update();
    this.renderer.info.reset();
    this.composer.render();
    this.frames++;
    this.onFrame?.(this);
    if (--this.dirty > 0) { this.queued = true; requestAnimationFrame(() => this.frame()); }
  }
}
