// Screen-space heat shimmer: air above hot (red-dominant, bright) pixels wobbles slightly.
// Heat is gathered from a few pixels below each fragment so the distortion rises above the lava.
export const HeatShimmerShader = {
  name: "HeatShimmer",
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uStrength: { value: 0.0016 } },
  vertexShader: "varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uTime, uStrength; varying vec2 vUv;
    float heat(vec2 uv) { vec3 c = texture2D(tDiffuse, uv).rgb; return clamp((c.r - 1.6 * c.g - 0.15) * 0.6, 0., 1.) * step(0.35, c.r); }
    void main() {
      float h = 0.;
      for (int i = 1; i <= 5; i++) h += heat(vUv - vec2(0., float(i) * 0.006)) * (1. - float(i) * 0.15);
      h = clamp(h * 0.5, 0., 1.);
      vec2 o = vec2(sin(vUv.y * 380. + uTime * 7.) + sin(vUv.x * 210. - uTime * 5.3), cos(vUv.y * 290. - uTime * 6.1)) * uStrength * h;
      gl_FragColor = texture2D(tDiffuse, vUv + o);
    }`,
};
