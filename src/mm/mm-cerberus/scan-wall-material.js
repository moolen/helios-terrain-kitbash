import * as THREE from 'three';
// World-metre detail from the already credited CC0 dark_rock_02 atlas.
// Scan colour remains the macro appearance; detail never invents fractures.
const common = /* glsl */ `
uniform sampler2DArray tScanDetail;
uniform sampler2DArray tScanNormal;
uniform float uScanDetailMean;
uniform sampler2D tScanGround;
uniform float uScanGroundN;
uniform vec3 cScanDust;
varying vec3 vScanWorld, vScanGeoWorld, vScanForward;
float scanHash(vec2 p) {
  vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);
  return fract((q.x+q.y)*q.z);
}
float scanNoise(vec2 p) {
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(scanHash(i),scanHash(i+vec2(1,0)),f.x),
    mix(scanHash(i+vec2(0,1)),scanHash(i+vec2(1,1)),f.x),f.y);
}
vec3 scanSample(vec2 p) {
  vec2 uv=p/7.,dx=dFdx(uv),dy=dFdy(uv);
  float k=scanNoise(p*.035)*7.+scanNoise(p*.009+13.)*5.;
  float i=floor(k),f=fract(k),a=i*2.39996,b=(i+1.)*2.39996;
  mat2 A=mat2(cos(a),-sin(a),sin(a),cos(a));
  mat2 B=mat2(cos(b),-sin(b),sin(b),cos(b));
  vec3 ca=textureGrad(tScanDetail,vec3(A*uv+sin(vec2(3,7)*i)*7.31,2),A*dx,A*dy).rgb;
  vec3 cb=textureGrad(tScanDetail,vec3(B*uv+sin(vec2(3,7)*(i+1.))*7.31,2),B*dx,B*dy).rgb;
  return mix(ca,cb,smoothstep(.25,.75,f));
}
float scanDetail() {
  vec3 w=pow(abs(normalize(vScanGeoWorld)),vec3(4.));w/=max(dot(w,vec3(1)),1.e-6);
  vec3 c=scanSample(vScanWorld.zy)*w.x+scanSample(vScanWorld.xz)*w.y+scanSample(vScanWorld.xy)*w.z;
  float relative=clamp(dot(c,vec3(.3,.55,.15))/uScanDetailMean,.55,1.55);
  float footprint=max(length(dFdx(vScanWorld)),length(dFdy(vScanWorld)));
  return 1.+(relative-1.)*.28*(1.-smoothstep(.35,2.5,footprint));
}
vec2 scanNormalSample(vec2 p) {
  vec2 uv=p/7.,dx=dFdx(uv),dy=dFdy(uv);
  float k=scanNoise(p*.035)*7.+scanNoise(p*.009+13.)*5.;
  float i=floor(k),f=fract(k),a=i*2.39996,b=(i+1.)*2.39996;
  mat2 A=mat2(cos(a),-sin(a),sin(a),cos(a));
  mat2 B=mat2(cos(b),-sin(b),sin(b),cos(b));
  vec2 na=textureGrad(tScanNormal,vec3(A*uv+sin(vec2(3,7)*i)*7.31,2),A*dx,A*dy).xy*2.-1.;
  vec2 nb=textureGrad(tScanNormal,vec3(B*uv+sin(vec2(3,7)*(i+1.))*7.31,2),B*dx,B*dy).xy*2.-1.;
  return mix(transpose(A)*na,transpose(B)*nb,smoothstep(.25,.75,f));
}
vec3 scanRockNormal() {
  vec3 n=normalize(vScanGeoWorld),w=pow(abs(n),vec3(4.));w/=max(dot(w,vec3(1)),1.e-6);
  vec2 nx=scanNormalSample(vScanWorld.zy),ny=scanNormalSample(vScanWorld.xz),nz=scanNormalSample(vScanWorld.xy);
  vec3 delta=vec3(0.,nx.y,nx.x)*w.x+vec3(ny.x,0.,-ny.y)*w.y+vec3(nz.x,nz.y,0.)*w.z;
  float footprint=max(length(dFdx(vScanWorld)),length(dFdy(vScanWorld)));
  return delta*.28*(1.-smoothstep(.35,2.5,footprint));
}
`;

export function addScanWallDetail(material, tex) {
  const originalHook=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{
    originalHook(shader,renderer);
    Object.assign(shader.uniforms,{tScanDetail:{value:tex.alb},tScanNormal:{value:tex.nrm},uScanDetailMean:{value:tex.meanL[2]},
      tScanGround:{value:tex.scanGround},uScanGroundN:{value:tex.scanGroundN},
      cScanDust:{value:new THREE.Color(0x8d694e)}});
    shader.vertexShader=shader.vertexShader.replace('#include <common>',
      '#include <common>\nvarying vec3 vScanWorld, vScanGeoWorld, vScanForward;')
      .replace('#include <begin_vertex>',`#include <begin_vertex>
        vScanWorld=(modelMatrix*vec4(transformed,1.)).xyz;
        vScanGeoWorld=inverseTransformDirection(transformedNormal,viewMatrix);
        vScanForward=normalize(normalMatrix*vec3(0.,0.,1.));`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+common)
      .replace('#include <map_fragment>',`#include <map_fragment>
        float scanReliefDetail=scanDetail();
        diffuseColor.rgb *= scanReliefDetail;
        vec2 groundUV=((vScanWorld.xz+6144.)/12288.*(uScanGroundN-1.)+.5)/uScanGroundN;
        float scanAboveGround=vScanWorld.y-texture2D(tScanGround,groundUV).r;
        float scanDustCoat=(1.-smoothstep(3.,32.,scanAboveGround))*.45;
        diffuseColor.rgb=mix(diffuseColor.rgb,cScanDust*scanReliefDetail,scanDustCoat);`)
      .replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        // A front projection cannot describe curled sides or authored caps.
        // Preserve their own geometric normal instead of transferring facade relief.
        float scanFront=smoothstep(.25,.7,dot(nonPerturbedNormal,normalize(vScanForward)));
        normal=normalize(mix(nonPerturbedNormal,normal,scanFront));
        normal=normalize(normal+(viewMatrix*vec4(scanRockNormal(),0.)).xyz);
        // Coherent photographic micro-relief in world metres, including caps.
        // Guard the derivative frame just as the explicit scan tangents are guarded.
        vec3 sx=dFdx(-vViewPosition),sy=dFdy(-vViewPosition);
        vec3 rx=cross(sy,normal),ry=cross(normal,sx);
        float determinant=dot(sx,rx);
        if(abs(determinant)>1.e-8) {
          vec3 gradient=sign(determinant)*(dFdx(scanReliefDetail)*rx+dFdy(scanReliefDetail)*ry);
          normal=normalize(abs(determinant)*normal-.16*gradient);
        }`)
      .replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.directSpecular *= .3;');
  };
  material.customProgramCacheKey=()=> 'mmc-scan-wall-detail-v3';
}
