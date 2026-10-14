import * as THREE from "three";

// Context apron: coarse (32 m) real lidar surroundings outside the map square, so the overview and low
// hero cameras see terrain to the horizon instead of a floating tile. Dark basalt with faint, broad
// sulfur-frost patches; no deposits or lava (they belong to the playable map).
export function buildApron(meta, buf, tex, csm, depBuf) {
  const n = meta.n, st = meta.step, h = new Float32Array(buf);
  const half = 3584;
  const pos = new Float32Array(n * n * 3);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = meta.x0 + c * st, z = meta.z0 + r * st, k = r * n + c;
    let y = h[k];
    if (Math.abs(x) < half && Math.abs(z) < half) y -= 8;   // vertices under the map: tuck below it
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
  // round 2: per-vertex deposit (amount, hotness) extrapolated past the map edge in the bake
  g.setAttribute("aDep", new THREE.BufferAttribute(depBuf ? new Uint8Array(depBuf) : new Uint8Array(n * n * 2), 2, true));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 });
  const U = { tAlb: { value: tex.alb }, tMB: { value: tex.mb } };
  const hook = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP; attribute vec2 aDep; varying vec2 vDep;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz; vDep = aDep;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2DArray tAlb; uniform sampler2D tMB; varying vec3 vWP; varying vec2 vDep;
      vec3 dalA(float h) {
        vec3 c = mix(vec3(.86, .85, .80), vec3(.88, .82, .45), smoothstep(.0, .22, h));
        c = mix(c, vec3(.84, .70, .12), smoothstep(.22, .42, h));
        c = mix(c, vec3(.84, .3, .045), smoothstep(.42, .6, h));
        return mix(c, vec3(.6, .1, .03), smoothstep(.62, .9, h));
      }
      float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }`)
      .replace("#include <map_fragment>", `
        vec3 a = vec3(dot(mix(texture(tAlb, vec3(vWP.xz / 40., 0.)).rgb, texture(tAlb, vec3(vWP.xz / 160., 14.)).rgb, .5), vec3(.3, .55, .15))) * .4 * vec3(1., .96, .92);


        // scene C: the plume deposit continues past the map edge and fades out over ~2 km (the edge's own
        // blurred deposit, so there is no square seam), patchy on the coarse apron relief
        float cov = smoothstep(.02, .25, vDep.x + (vn(vWP.xz * .0015) - .5) * .06);
        vec3 dc = dalA(vDep.y) * (.75 + .3 * texture(tAlb, vec3(vWP.xz / 60., 7.)).r) * .9;
        a = mix(a, dc, cov * .95);
        diffuseColor.rgb = a;`);
  };
  csm.setupMaterial(mat);
  const h0 = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { h0(s, r); hook(s); };
  mat.customProgramCacheKey = () => "io-c-apron";
  const mesh = new THREE.Mesh(g, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  mesh.name = "apron";
  return mesh;
}
