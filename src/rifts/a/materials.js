// Europa ice materials for scene A: cheap, opaque, flat-shaded.
// Pale water ice (blue-white to cream), rust-brown lineae and hydrated-salt staining
// on fresh faces and along cracks, darker blue-grey ice deep in the rift.
// One world-space lineae field is shared by ground, walls and blocks so bands
// that cross the plain continue down the rift walls.
import * as THREE from "three";

export const PALETTE = {
  ice: "#e2ebf1", cream: "#e9e2d3", blue: "#bcd6e6", deep: "#6f8fa6", rust: "#8c4a2c", salt: "#b07a52", snow: "#f3f2ee",
};

const GLSL = /* glsl */ `
float r_hash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float r_noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(r_hash(i),r_hash(i+vec2(1.,0.)),f.x),mix(r_hash(i+vec2(0.,1.)),r_hash(i+vec2(1.,1.)),f.x),f.y);}
float r_fbm(vec2 p){float v=.5*r_noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+3.1;v+=.27*r_noise(p);p=mat2(.8,-.6,.6,.8)*p*2.01+1.7;v+=.15*r_noise(p);p=mat2(.8,-.6,.6,.8)*p*2.03+5.3;v+=.08*r_noise(p);return v;}
// Lineae: exact mirror of layout.js lineae() (analytic, so CPU ridges and GPU colour agree).
vec2 r_lineae(vec2 p){
 float core=0.,halo=0.;
 for(int i=0;i<3;i++){
  float fi=float(i);
  float a=i==0?.42:(i==1?-1.05:1.9);float per=i==0?520.:(i==1?690.:330.);float W=i==0?17.:(i==1?13.:6.);float ph=i==0?0.:(i==1?.37:.74);
  vec4 k=i==0?vec4(.0031,.0047,.011,.0063):(i==1?vec4(.0026,-.0038,.0092,-.0071):vec4(-.0042,.0029,.0131,.0057));
  vec2 amp=i==0?vec2(70.,26.):(i==1?vec2(80.,22.):vec2(45.,14.));
  float g=p.x*cos(a)+p.y*sin(a)+amp.x*sin(p.x*k.x+p.y*k.y+fi*1.7)+amp.y*sin(p.x*k.z+p.y*k.w+fi*4.1);
  float f=g/per+ph;float c=abs(f-floor(f)-.5)*per;
  float w=W*(.65+.55*sin(p.x*.0021+p.y*.0017+fi*2.3)*sin(p.x*.0007-p.y*.0013+fi));
  float on=clamp(.5+.8*sin((p.x*.6-p.y*.8)*.004+fi*3.3),0.,1.);
  // Europa triple band: a broad diffuse rust band, ridge flanks a little darker, pale median.
  float cr=(1.-smoothstep(w*.2,w*1.1,c))*smoothstep(w*.08,w*.35,c)*on*(i==2?0.:1.);
  float wide=W*(3.+2.*sin(p.x*.0011-p.y*.0019+fi*5.));
  core=max(core,cr);halo=max(halo,(1.-smoothstep(w*.5,wide,c))*(.35+.65*on)*(i==2?.3:1.));
 }
 // break the bands up so they read as stained ice, not painted lines
 float br=smoothstep(.2,.7,r_fbm(p*.006+r_fbm(p*.03)*.6));
 return vec2(core*(.55+.45*br),halo*(.5+.5*br));
}
`;

const U = (p) => ({
  uIce: { value: new THREE.Color(p.ice) }, uCream: { value: new THREE.Color(p.cream) }, uBlue: { value: new THREE.Color(p.blue) },
  uDeep: { value: new THREE.Color(p.deep) }, uRust: { value: new THREE.Color(p.rust) }, uSalt: { value: new THREE.Color(p.salt) }, uSnow: { value: new THREE.Color(p.snow) },
  uDepth: { value: 80 },
});
const DECL = "uniform vec3 uIce;uniform vec3 uCream;uniform vec3 uBlue;uniform vec3 uDeep;uniform vec3 uRust;uniform vec3 uSalt;uniform vec3 uSnow;uniform float uDepth;\n";

// kind: "ground" | "wall" | "block" | "slab"
export function iceMaterial(kind, palette = PALETTE) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: kind === "ground" ? 0.92 : 0.8, metalness: 0, flatShading: true, vertexColors: kind !== "ground" });
  const uniforms = U(palette);
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms);
    const inst = kind !== "ground";
    s.vertexShader = "varying vec3 vWp;\n" + s.vertexShader.replace("#include <begin_vertex>",
      `#include <begin_vertex>\nvWp=(modelMatrix*${inst ? "instanceMatrix*" : ""}vec4(position,1.)).xyz;`);
    s.fragmentShader = "varying vec3 vWp;\n" + DECL + GLSL + s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace("#include <color_fragment>", /* glsl */ `#include <color_fragment>
 vec3 wNc=normalize(cross(dFdx(vWp),dFdy(vWp)));
 float up=abs(wNc.y);
 vec2 p=vWp.xz;
 float depth=clamp(-vWp.y/uDepth,0.,1.2);
 float broad=r_fbm(p*.0035);float fine=r_noise(p*.09+vWp.y*.07);
 vec3 c=mix(uIce,uCream,smoothstep(.5,.8,broad)*.8);
 // steep faces: fresher, bluer ice
 float steep=1.-smoothstep(.45,.8,up);
 c=mix(c,uBlue,steep*.55);
 // lineae: continue across plain and down the walls
 vec2 L=r_lineae(p);
 c=mix(c,mix(c,uSalt,.8),L.y*.7);
 c=mix(c,mix(c,uRust,.7),L.x*.6);
 // salt staining streaks on fresh faces (vertical drips), stronger in joints
 float streak=smoothstep(.62,.86,r_noise(vec2((vWp.x+vWp.z)*.16,vWp.y*.012))+.25*r_noise(vec2((vWp.x-vWp.z)*.5,vWp.y*.05)));
 c=mix(c,uSalt,streak*steep*${kind === "wall" ? ".55" : kind === "ground" ? ".35" : ".25"});
 // darker, bluer ice deep in the rift (sky-shadowed, older ice)
 c=mix(c,uDeep,smoothstep(.25,1.,depth)*${kind === "ground" ? ".6" : kind === "wall" ? ".5" : ".3"});
 // frost on up-facing ledges
 c=mix(c,uSnow,smoothstep(.85,.97,up)*(1.-depth*.6)*${kind === "ground" ? ".25" : ".45"});
 // polygonal fracture network on the plateau (thin dark-blue cracks, partly healed)
 ${kind === "ground" ? `for(int sc=0;sc<2;sc++){float S=sc==0?150.:60.;vec2 q=p/S+float(sc)*17.3;vec2 i0=floor(q),f0=fract(q);float f1=9.,f2=9.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);vec2 r=o+vec2(r_hash(i0+o),r_hash(i0+o+7.1))*.9-f0;float d=dot(r,r);if(d<f1){f2=f1;f1=d;}else if(d<f2)f2=d;}
  float e=sqrt(f2)-sqrt(f1);float px=length(fwidth(p))/S;
  float keep=smoothstep(.55,.7,r_noise(p*(sc==0?.006:.014)+float(sc)*9.))*smoothstep(.35,.55,r_noise(p*.04+float(sc)));
  float crack=(1.-smoothstep(.003,.009+px*1.5,e))*keep*(1.-clamp(depth*3.,0.,1.));
  c=mix(c,mix(uDeep,uSalt,.35),clamp(crack,0.,1.)*(sc==0?.38:.22));}` : ""}
 ${kind === "ground" ? `{// sparse lenticulae: reddish-brown spots with a pale halo (Europa mottled terrain)
  vec2 q=p/340.;vec2 i0=floor(q),f0=fract(q);float sp=0.,ha=0.;
  for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 o=vec2(x,y);float hh=r_hash(i0+o+31.7);if(hh>.16)continue;
   vec2 r=o+vec2(r_hash(i0+o),r_hash(i0+o+4.3))-f0;float rad=.12+.16*r_hash(i0+o+9.1);float d=length(r*vec2(1.,1.4))/rad+1.1*(r_fbm(p*.012+hh*40.)-.5)+.4*(r_noise(p*.06)-.5);
   sp=max(sp,1.-smoothstep(.7,1.,d));ha=max(ha,1.-smoothstep(1.,1.6,d));}
  c=mix(c,uSnow,(ha-sp)*.25*(1.-depth));c=mix(c,mix(uRust,uSalt,.5+.4*fine),sp*.38*(1.-depth));}` : ""}
 c*=.94+.12*fine;
 diffuseColor.rgb=c${kind === "ground" ? "" : "*vColor.rgb"};`);
  };
  m.customProgramCacheKey = () => `rift-a-${kind}`;
  m.userData.uniforms = uniforms;
  return m;
}
