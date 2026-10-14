import * as THREE from "three";

// Look defaults. A brief overrides any of these under `look`.
export const LOOK_DEFAULTS = {
  dust: "#77736f", dark: "#55524f", bright: "#b9b5ae", rock: "#8b8680", wall: "#6d6a66", ice: "#e4eef2", sand: "#c98a55",
  strata: ["#8a8580", "#77736e", "#99948d", "#6f6b66"], strataScale: 6, strataWarp: 0.6, strataContrast: 1,
  wallCavity: 0, wallEdge: 0, wallTone: 0, wallStains: 0, wallToneScale: 0.035,
  grain: 1, pocks: 1, ripples: 0, rippleScale: 0.55, rippleAngle: 30,
  broad: 0.35, broadScale: 0.011, patches: 0.2,
  slopeRock: 0.7, slopeA: 0.55, slopeB: 1.1,
  bowlBounce: 0.38, horizonLift: 0, farDarken: 0.28, farStart: 220, farEnd: 950,
  strataY: [],
  haze: "#000000", hazeDensity: 0, hazeStart: 300, hazeBoost: 1,
  rockMottle: 1, rockContrast: 0.24, facet: 0, brightPocks: 1, bigPocks: 1,
};

export const GLSL_NOISE = /* glsl */ `
float s_hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float s_noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(s_hash(i),s_hash(i+vec2(1.,0.)),f.x),mix(s_hash(i+vec2(0.,1.)),s_hash(i+vec2(1.,1.)),f.x),f.y);}
float s_fbm(vec2 p){const mat2 r=mat2(.8,-.6,.6,.8);float v=.5*s_noise(p);p=r*p*2.03+3.1;v+=.27*s_noise(p);p=r*p*2.01+1.7;v+=.15*s_noise(p);p=r*p*2.03+5.3;v+=.08*s_noise(p);return v;}
// Isotropic pocks: cellular bowls with a faint raised rim.
float s_pock(vec2 p,float density){vec2 i=floor(p),f=fract(p);float h=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y),c=i+o;if(s_hash(c+9.7)>density)continue;float d=length(o+vec2(s_hash(c),s_hash(c+17.3))-f)/(.22+.28*s_hash(c+5.1));h+=d<1.?d*d-1.:.22*exp(-(d-1.)*(d-1.)*14.);}return h;}
vec3 s_bumpNormal(vec3 n,vec3 pos,float b){vec3 dp1=dFdx(pos),dp2=dFdy(pos);vec3 r1=cross(dp2,n),r2=cross(n,dp1);float det=dot(dp1,r1);return normalize(abs(det)*n-sign(det)*(dFdx(b)*r1+dFdy(b)*r2));}
`;

const STRATA_MAX = 12;
export const GLSL_STRATA = /* glsl */ `
uniform vec3 uStrata[${STRATA_MAX}];uniform float uStrataCount;uniform float uStrataScale;uniform float uStrataWarp;uniform float uStrataContrast;
// widen scales bands locally (ground strata mask values above 1, tall walls).
uniform float uStrataY[${STRATA_MAX}];uniform float uStrataN;
vec3 s_strataK(vec3 w,float widen){vec3 c=uStrata[0];
 if(uStrataN>0.){
  // Explicit band table: band i spans uStrataY[i]..uStrataY[i+1] (world metres); warp keeps beds near level.
  float y=w.y+uStrataWarp*uStrataScale*((s_noise(w.xz*.012)*2.-1.)+.3*(s_noise(w.xz*.06+3.)-.5));
  float lo=uStrataY[0],hi=lo+1e4;
  for(int i=0;i<${STRATA_MAX};i++){if(float(i)<uStrataN&&y>=uStrataY[i]){c=uStrata[i];lo=uStrataY[i];hi=float(i+1)<uStrataN?uStrataY[min(i+1,${STRATA_MAX - 1})]:lo+1e4;}}
  float below=y-lo,above=hi-y;
  // Darker parting at each bed's base, a lit lip just under its top.
  c*=mix(.8,1.,smoothstep(0.,1.4,below));c*=1.+.07*(1.-smoothstep(.5,2.5,above));
  return mix(vec3(dot(c,vec3(.333))),c,uStrataContrast);
 }
 float y=w.y/(uStrataScale*widen)+uStrataWarp*(s_noise(w.xz*.012)*2.-1.)+.25*uStrataWarp*(s_noise(w.xz*.06+3.)-.5);
 float idx=floor(y),f=fract(y);float k=mod(idx+floor(s_hash(vec2(idx,4.1))*1.999),uStrataCount);
 for(int i=0;i<${STRATA_MAX};i++)if(float(i)==k)c=uStrata[i];
 // Thin darker partings at band boundaries and a lit lip on top of each band.
 float edge=smoothstep(.0,.06,f)*smoothstep(1.,.92,f);c*=mix(.78,1.,edge);c*=1.+.06*smoothstep(.8,.97,f);
 return mix(vec3(dot(c,vec3(.333))),c,uStrataContrast);}
vec3 s_strata(vec3 w){return s_strataK(w,1.);}
`;

export const GLSL_HAZE = /* glsl */ `
uniform vec3 uHaze;uniform float uHazeDensity;uniform float uHazeStart;
vec3 s_haze(vec3 c,float dist){float t=1.-exp(-max(0.,dist-uHazeStart)*uHazeDensity*.001);return mix(c,uHaze,clamp(t,0.,1.));}
`;

function colour(v) { return new THREE.Color(v); }

export function lookUniforms(look) {
  const strata = look.strata.slice(0, STRATA_MAX).map(colour);
  while (strata.length < STRATA_MAX) strata.push(strata[strata.length - 1].clone());
  return {
    uDust: { value: colour(look.dust) }, uDark: { value: colour(look.dark) }, uBright: { value: colour(look.bright) },
    uRock: { value: colour(look.rock) }, uWall: { value: colour(look.wall) }, uIce: { value: colour(look.ice) }, uSand: { value: colour(look.sand) },
    uStrata: { value: strata }, uStrataCount: { value: Math.min(STRATA_MAX, look.strata.length) },
    uStrataScale: { value: look.strataScale }, uStrataWarp: { value: look.strataWarp }, uStrataContrast: { value: look.strataContrast },
    uWallCavity:{value:look.wallCavity},uWallEdge:{value:look.wallEdge},uWallTone:{value:look.wallTone},uWallStains:{value:look.wallStains},uWallToneScale:{value:look.wallToneScale},
    uGrain: { value: look.grain }, uPocks: { value: look.pocks }, uRipples: { value: look.ripples }, uRippleScale: { value: look.rippleScale },
    uRippleDir: { value: new THREE.Vector2(Math.cos((look.rippleAngle * Math.PI) / 180), Math.sin((look.rippleAngle * Math.PI) / 180)) },
    uBroad: { value: look.broad }, uBroadScale: { value: look.broadScale }, uPatches: { value: look.patches },
    uSlopeRock: { value: look.slopeRock }, uSlopeA: { value: look.slopeA }, uSlopeB: { value: look.slopeB },
    uBowlBounce: { value: look.bowlBounce }, uHorizonLift: { value: look.horizonLift }, uFarDarken: { value: look.farDarken }, uFarStart: { value: look.farStart }, uFarEnd: { value: look.farEnd },
    uStrataY: { value: Array.from({ length: STRATA_MAX }, (_, i) => look.strataY?.[i] ?? 1e5) }, uStrataN: { value: Math.min(STRATA_MAX, look.strataY?.length || 0) },
    uHaze: { value: colour(look.haze).multiplyScalar(look.hazeBoost ?? 1) }, uHazeDensity: { value: look.hazeDensity }, uHazeStart: { value: look.hazeStart },
    uRockMottle: { value: look.rockMottle }, uFacet: { value: look.facet }, uBrightPocks: { value: look.brightPocks }, uBigPocks: { value: look.bigPocks },
  };
}

export const UNIFORM_DECL = /* glsl */ `
uniform vec3 uDust;uniform vec3 uDark;uniform vec3 uBright;uniform vec3 uRock;uniform vec3 uWall;uniform vec3 uIce;uniform vec3 uSand;
uniform float uGrain;uniform float uPocks;uniform float uRipples;uniform float uRippleScale;uniform vec2 uRippleDir;
uniform float uBroad;uniform float uBroadScale;uniform float uPatches;uniform float uSlopeRock;uniform float uSlopeA;uniform float uSlopeB;
uniform float uFacet;uniform float uBrightPocks;uniform float uBigPocks;uniform float uBowlBounce;uniform float uHorizonLift;uniform float uFarDarken;uniform float uFarStart;uniform float uFarEnd;uniform float uRockMottle;
`;

// Ground: palette blend from per-vertex masks, slope-exposed strata, procedural bump.
export function groundMaterial(uniforms) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = "attribute vec4 m0;attribute vec4 m1;varying vec4 vM0;varying vec4 vM1;varying vec3 vW;varying vec3 vNW;\n" + s.vertexShader.replace(
      "#include <begin_vertex>", "#include <begin_vertex>\nvM0=m0;vM1=m1;vW=position;vNW=normal;");
    s.fragmentShader = "varying vec4 vM0;varying vec4 vM1;varying vec3 vW;varying vec3 vNW;\n" + UNIFORM_DECL + GLSL_NOISE + GLSL_STRATA + GLSL_HAZE + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
 vec2 p=vW.xz;float bright=vM0.x,dark=vM0.y,bowl=vM0.z,rockM=vM0.w,strataM=vM1.x,ice=vM1.y,sand=vM1.z,apron=vM1.w;
 float broad=smoothstep(.2,.8,s_fbm(mat2(.87,-.5,.5,.87)*p*uBroadScale));float patches=smoothstep(.42,.68,s_fbm(p*.085+7.));
 float toneFade=1.-smoothstep(420.,1200.,length(p));broad=mix(.56,broad,.28+.72*toneFade);
 vec3 base=mix(mix(uDust,uDark,uBroad),uDust*.98,broad);base=mix(base,uDust,patches*uPatches*(.35+.65*toneFade));
 base=mix(base,uSand*mix(.95,1.05,broad),clamp(sand,0.,1.));
 base=mix(base,uDark*mix(.92,1.06,broad),clamp(dark,0.,1.));base=mix(base,uBright*mix(.94,1.04,patches),clamp(bright,0.,1.));
 float slope=1.-clamp(normalize(vNW).y,0.,1.);float cliff=clamp(smoothstep(uSlopeA*.5,uSlopeB*.5,slope)*uSlopeRock+rockM,0.,1.);
 vec3 rockCol=mix(uWall,s_strataK(vW,max(1.,strataM)),clamp(strataM,0.,1.));base=mix(base,rockCol,cliff);
 base=mix(base,uIce,clamp(ice,0.,1.));
 float pixel=max(length(dFdx(p)),length(dFdy(p)));float fade=1.-smoothstep(.6,3.,pixel);
 float chips=smoothstep(.71,.84,s_noise(p*1.5));base*=1.+uGrain*fade*((s_noise(p*3.7)-.5)*.22+chips*.1*(1.-sand));
 base*=mix(1.,.86,bowl);base=mix(base,uDust*1.25,.7*clamp(apron,0.,1.));
 base*=mix(1.,1.-uFarDarken,smoothstep(uFarStart,uFarEnd,length(vViewPosition)));
 base*=1.+uHorizonLift*smoothstep(1300.,2400.,length(vViewPosition))*smoothstep(2.,30.,vW.y);
 diffuseColor.rgb*=base;`);
    s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_maps>", /* glsl */ `#include <normal_fragment_maps>
 // Opt-in crisp facets: flat derivative normals on slopes of bright/rock ground, so planar
 // TIN facets (massifs, peaks) shade as clean planes; flat mare keeps smooth normals.
 if(uFacet>0.){vec3 fN=normalize(cross(dFdx(vViewPosition),dFdy(vViewPosition)));float fw=uFacet*smoothstep(.06,.18,1.-clamp(normalize(vNW).y,0.,1.))*clamp(max(vM0.x,vM0.w),0.,1.);normal=normalize(mix(normal,fN,fw));}
 {vec2 q=mat2(.8,-.6,.6,.8)*vW.xz;float px=max(length(dFdx(vW.xz)),length(dFdy(vW.xz)));
 float nearF=1.-smoothstep(.4,1.5,px),farF=1.-smoothstep(.8,3.5,px),bigF=1.-smoothstep(9.,30.,px);
 float pk=uPocks*(1.-vM1.z)*(1.-vM1.w*.7)*mix(1.,1.-clamp(vM0.x,0.,1.),1.-uBrightPocks);
 float bump=uGrain*nearF*s_noise(q*1.7)*.05+pk*(nearF*s_pock(q*.5,.55)*.09+farF*s_pock(q*.17+3.,.18)*.22+uBigPocks*bigF*s_pock(q*.03+7.,.05)*2.6);
 float rip=uRipples*(.25+.75*vM1.z)*(1.-vM0.w);if(rip>0.){float w=dot(vW.xz,uRippleDir)*uRippleScale+2.2*s_noise(vW.xz*.03)+.6*s_noise(vW.xz*.11);bump+=rip*farF*(.5+.5*sin(w*6.2832))*.18*(.6+.4*s_noise(vW.xz*.05+9.));}
 normal=s_bumpNormal(normal,vW,bump);}`);
    s.fragmentShader = s.fragmentShader.replace("#include <emissivemap_fragment>",
      "#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.95,.88)*uBowlBounce*vM0.z;");
    s.fragmentShader = s.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb=s_haze(gl_FragColor.rgb,length(vViewPosition));");
  };
  m.customProgramCacheKey = () => "s-ground";
  return m;
}

// Rocks: instance tint x palette rock, world mottling and facet grain.
export function rockMaterial(uniforms, { pit = false, strata = false } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 1, metalness: 0 });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = "varying vec3 vRock;\n" + s.vertexShader.replace("#include <begin_vertex>",
      "#include <begin_vertex>\nvRock=(modelMatrix*instanceMatrix*vec4(position,1.)).xyz;");
    s.fragmentShader = "varying vec3 vRock;\n" + UNIFORM_DECL + GLSL_NOISE + GLSL_STRATA + GLSL_HAZE + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
 vec3 q=vRock*.9;float mott=s_fbm(q.xz+q.y*.7)*.6+s_fbm(q.zy*1.3+3.)*.4;float pits=smoothstep(.62,.8,s_noise(q.xy*3.1+q.z*2.));
 diffuseColor.rgb*=${strata ? "s_strata(vRock)" : "uRock"}*(1.+uRockMottle*(.42*mott-.21)-pits*.18*uRockMottle);
 ${pit ? `diffuseColor.rgb*=mix(.02,1.,pow(smoothstep(${pit[0].toFixed(2)},${pit[1].toFixed(2)},vRock.y),1.15));` : ""}`);
    if (pit) s.fragmentShader = s.fragmentShader.replace("#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.93,.84)*.45*smoothstep(${(pit[0] * 0.7 + pit[1] * 0.3).toFixed(2)},${(pit[1] - 1).toFixed(2)},vRock.y);`);
    s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_maps>", /* glsl */ `#include <normal_fragment_maps>
 normal=s_bumpNormal(normal,vRock,(s_noise(vRock.xz*2.2+vRock.y*1.7)+.5*s_noise(vRock.zy*4.1))*.09);`);
    s.fragmentShader = s.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb=s_haze(gl_FragColor.rgb,length(vViewPosition));");
  };
  m.customProgramCacheKey = () => `s-rock-${pit ? pit.join(",") : 0}-${strata}`;
  return m;
}

// Wall meshes (pit columns, scarps, mesa faces): vertex colour x wall or strata,
// optional depth darkening and bounce. `depth` is the floor elevation for the fade.
// shift: read a per-vertex `bandShift` attribute (metres) that offsets the strata height, so beds break between chunks.
// ledgeDust: up-facing faces (benches, ledges) blend toward the dust colour, as if carrying talus.
export function wallMaterial(uniforms, { surface = false, strata = 0, depthFade = null, bounce = 0, bump = 0.35, tint = "#ffffff", useWall = true, shift = false, ledgeDust = 0, widen = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: tint, vertexColors: true, roughness: 1, metalness: 0, flatShading: false });
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    s.vertexShader = (surface ? "attribute float cavity;attribute float edgeLight;attribute vec2 courseTone;varying float vCavity;varying float vEdge;varying vec2 vCourse;\n" : "") + (shift ? "attribute float bandShift;varying float vShift;\n" : "") + "varying vec3 vWall;varying vec3 vWallN;\n" + s.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvWall=(modelMatrix*vec4(position,1.)).xyz;vWallN=mat3(modelMatrix)*objectNormal;" + (shift ? "vShift=bandShift;" : "") + (surface ? "vCavity=cavity;vEdge=edgeLight;vCourse=courseTone;" : ""));
    s.fragmentShader = (surface ? "varying float vCavity;varying float vEdge;varying vec2 vCourse;uniform float uWallCavity;uniform float uWallEdge;uniform float uWallTone;uniform float uWallStains;uniform float uWallToneScale;\n" : "") + (shift ? "varying float vShift;\n" : "") + "varying vec3 vWall;varying vec3 vWallN;\n" + UNIFORM_DECL + GLSL_NOISE + GLSL_STRATA + GLSL_HAZE + s.fragmentShader;
    const fade = depthFade ? `diffuseColor.rgb*=mix(.02,1.,pow(smoothstep(${depthFade[0].toFixed(2)},${depthFade[1].toFixed(2)},vWall.y),1.15));` : "";
    s.fragmentShader = s.fragmentShader.replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
 {vec2 pw=vec2(vWall.x+vWall.z*.57,vWall.y);float bands=s_noise(vec2(pw.x*.03,pw.y*.45+s_noise(pw*.06)*.8));
 vec3 c=${useWall ? "uWall" : "vec3(1.)"}*mix(.88,1.08,bands);c=mix(c,s_strataK(vWall${shift ? "+vec3(0.,vShift,0.)" : ""},${widen.toFixed(3)}),${strata.toFixed(3)});${ledgeDust ? `{float up=normalize(vWallN).y;c=mix(c,uDust*mix(.95,1.08,s_noise(vWall.xz*.08)),${ledgeDust.toFixed(3)}*smoothstep(.45,.8,abs(up)));}` : ""}${surface ? `
 float cloud=(s_noise(vec2((vWall.x+vWall.z*.57)*uWallToneScale,vWall.y*.015))*.65+s_noise(vec2(vWall.x*.016+vWall.z*.009,vWall.y*.027))*.35-.5)*2.;
 float grad=mix(-.10,.08,smoothstep(0.,1.,vCourse.x));
 float stain=smoothstep(.40,.73,s_noise(vec2((vWall.x+vWall.z*.57)*.10+s_noise(vWall.xz*.013)*1.2,vWall.y*.008)))*(1.-smoothstep(5.,100.,vCourse.y));
 c*=clamp(1.+uWallTone*(cloud*.10+grad),.90,1.10);
 c*=mix(vec3(1.),mix(vec3(.94,.91,.88),vec3(1.07,1.035,.97),clamp(vCourse.x*.7+cloud*.2,0.,1.)),min(1.,uWallTone));
 c*=mix(vec3(1.),vec3(.68,.61,.57),stain*uWallStains);
 c*=mix(vec3(1.),vec3(.60,.55,.53),clamp(vCavity*uWallCavity,0.,1.));
 c*=1.+vec3(.18,.145,.10)*max(vEdge*.55,exp(-max(0.,vCourse.y)/1.2)*.65)*uWallEdge;` : ""}diffuseColor.rgb*=c;${fade}}`);
    if (bounce) s.fragmentShader = s.fragmentShader.replace("#include <emissivemap_fragment>",
      `#include <emissivemap_fragment>\ntotalEmissiveRadiance+=diffuseColor.rgb*vec3(1.,.93,.84)*${bounce.toFixed(3)}${depthFade ? `*smoothstep(${(depthFade[0] * 0.7).toFixed(2)},${depthFade[1].toFixed(2)},vWall.y)` : ""};`);
    s.fragmentShader = s.fragmentShader.replace("#include <normal_fragment_maps>", /* glsl */ `#include <normal_fragment_maps>
 normal=s_bumpNormal(normal,vWall,(s_noise(vWall.xz*.9+vWall.y*.8)+.5*s_noise(vWall.zy*2.3+vWall.x))*${bump.toFixed(3)});`);
    s.fragmentShader = s.fragmentShader.replace("#include <dithering_fragment>", "#include <dithering_fragment>\ngl_FragColor.rgb=s_haze(gl_FragColor.rgb,length(vViewPosition));");
  };
  m.customProgramCacheKey = () => `s-wall-${surface}-${strata}-${depthFade}-${bounce}-${bump}-${useWall}-${shift}-${ledgeDust}-${widen}`;
  return m;
}

export function updateLook(uniforms, look) {
  const fresh = lookUniforms(look);
  for (const k in fresh) {
    const u = uniforms[k], v = fresh[k].value;
    if (Array.isArray(v)) { if (typeof v[0] === "number") u.value = v; else v.forEach((c, i) => u.value[i].copy(c)); }
    else if (v && v.isColor) u.value.copy(v);
    else if (v && v.isVector2) u.value.copy(v);
    else u.value = v;
  }
}
