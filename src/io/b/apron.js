import * as THREE from "three";

// Context apron: coarse (32 m) real lidar surroundings outside the map square, so the overview and low
// hero cameras see terrain to the horizon instead of a floating tile. Dark basalt with faint, broad
// sulfur-frost patches; no deposits or lava (they belong to the playable map).
export function buildApron(meta, buf, tex, csm, hf) {
  const n = meta.n, st = meta.step, h = new Float32Array(buf);
  const half = 3584;
  const pos = new Float32Array(n * n * 3);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = meta.x0 + c * st, z = meta.z0 + r * st, k = r * n + c;
    let y = h[k];
    if (Math.abs(x) < half && Math.abs(z) < half) y -= 8;   // vertices under the map: tuck below it
    else if (hf && Math.max(Math.abs(x), Math.abs(z)) < half + 96) {
      // just outside the map: never stand above the map's own edge (the 32 m apron would poke through)
      const ex = Math.max(-half, Math.min(half, x)), ez = Math.max(-half, Math.min(half, z));
      y = Math.min(y, hf.at(ex, ez) - 1.5);
    }
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
  }
  const idx = [];
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const x0 = meta.x0 + c * st, z0 = meta.z0 + r * st;
    if (x0 >= -half && x0 + st <= half && z0 >= -half && z0 + st <= half) continue;   // fully inside the map
    const a = r * n + c, b = a + 1, d = a + n, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  const U = { tAlb: { value: tex.alb } };
  const hook = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; varying vec3 vNrmW;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vNrmW = normalize(mat3(modelMatrix) * objectNormal);");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2DArray tAlb; varying vec3 vWP; varying vec3 vNrmW;
      float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }`)
      .replace("#include <map_fragment>", `
        float mB = smoothstep(.35, .65, vn(vWP.xz * .0031 + 2.7) * .55 + vn(vWP.xz * .0062 + 1.) * .45);
        float lA = dot(texture(tAlb, vec3(vWP.xz / 6., 0.)).rgb, vec3(.3, .55, .15));
        float lB = dot(texture(tAlb, vec3(vWP.xz / 7., 1.)).rgb, vec3(.3, .55, .15)) * 2.2;
        float lM = dot(texture(tAlb, vec3(vWP.xz / 28., 0.)).rgb, vec3(.3, .55, .15));
        // same palette as the map at low resolution: dark grey basalt, broad reddish-brown / black scoria,
        // aged sulfur mantle on gentle ground (slope from the mesh normal), thinning on slopes and far out
        float l0 = mix(lA, lM, .3);
        float pR = smoothstep(.5, .72, vn(vWP.xz * .0019 + 11.) * .6 + vn(vWP.xz * .0007 + 3.) * .4);
        float pK = smoothstep(.55, .75, vn(vWP.xz * .0026 + 23.)) * (1. - pR * .7);
        vec3 a = l0 * mix(mix(vec3(.27, .26, .25), vec3(.33, .24, .19), pR * .85), vec3(.12, .11, .11), pK * .8) * 1.15;
        float flat_ = smoothstep(.92, .99, vNrmW.y);
        float mant = flat_ * (.35 + .3 * vn(vWP.xz * .0004 + 7.)) * (1. - smoothstep(6000., 12000., length(vWP.xz)));
        a = mix(a, vec3(.36, .29, .1) * (.8 + .3 * l0 / .35), mant * .25);
        diffuseColor.rgb = a;`);
  };
  csm.setupMaterial(mat);
  const h0 = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { h0(s, r); hook(s); };
  mat.customProgramCacheKey = () => "io-b-apron";
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = "apron";
  return mesh;
}
