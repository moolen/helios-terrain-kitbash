import * as THREE from "three";

// Context apron: the CTX 20 m mosaic (averaged to 32 m, aligned to HiRISE) outside the map square, so the
// overview and low hero cameras see real terrain into the haze instead of a floating tile. Dusty Mars
// regolith in the measured soil colour; flat beyond the 16 km mosaic (hidden by the distance haze).
export function buildApron(meta, buf, tex, csm, hf, size) {
  // resample the 32 m apron onto a grid aligned with the map edge (+-3584 m) so the seam vertices sit
  // exactly on the map border; border vertices take the map's own height there
  const n0 = meta.n, st0 = meta.step, hA = new Float32Array(buf);
  const src = (x, z) => {
    const c = THREE.MathUtils.clamp((x - meta.x0) / st0, 0, n0 - 1.001), r = THREE.MathUtils.clamp((z - meta.z0) / st0, 0, n0 - 1.001);
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0;
    const a = hA[r0 * n0 + c0], b = hA[r0 * n0 + c0 + 1], d = hA[(r0 + 1) * n0 + c0], e = hA[(r0 + 1) * n0 + c0 + 1];
    return (a * (1 - fc) + b * fc) * (1 - fr) + (d * (1 - fc) + e * fc) * fr;
  };
  const half = size / 2, st = 32, K = 260, hb = half / st;   // 6144 = 192 * 32; grid spans +-(6144 + 32 * 260) ~ +-14.5 km
  const n = 2 * (hb + K) + 1, x0 = -(half + st * K);
  const pos = new Float32Array(n * n * 3);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const x = x0 + c * st, z = x0 + r * st, k = r * n + c;
    const ax = Math.abs(x), az = Math.abs(z);
    let y;
    if (ax < half && az < half) y = hf.at(x, z) - 6;                     // hidden under the map
    else if (ax <= half && az <= half) y = hf.at(x, z) - 0.3;            // on the border: meet the map edge
    else {
      // blend from the map edge height into the coarse lidar over 300 m
      const ex = THREE.MathUtils.clamp(x, -half, half), ez = THREE.MathUtils.clamp(z, -half, half);
      const dd = Math.hypot(x - ex, z - ez), w = THREE.MathUtils.smoothstep(dd, 0, 300);
      y = (hf.at(ex, ez) - 0.3) * (1 - w) + src(x, z) * w;
    }
    pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z;
  }
  const idx = [];
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const xa = x0 + c * st, za = x0 + r * st;
    if (xa >= -half && xa + st <= half && za >= -half && za + st <= half) continue;   // inside the map
    const a = r * n + c, b = a + 1, d = a + n, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.97, metalness: 0 });
  const U = { tAlb: { value: tex.alb } };
  const hook = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.)).xyz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", `#include <common>
      uniform sampler2DArray tAlb; varying vec3 vWP;
      float h21(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }`)
      .replace("#include <map_fragment>", `
        // the map's plain colour: regolith texture luminance on the measured soil colour, a little dust
        float lA = dot(texture(tAlb, vec3(vWP.xz / 3., 0.)).rgb, vec3(.3, .55, .15));
        float lM = dot(texture(tAlb, vec3(vWP.xz / 16., 1.)).rgb, vec3(.3, .55, .15));
        float nC = vn(vWP.xz * .0023 + 7.) * .5 + vn(vWP.xz * .0046) * .25 + .125;
        vec3 soil = vec3(.209, .111, .058);   // #7e5e44 linear
        vec3 a = soil * clamp(mix(lA, lM, .5) / .147, .5, 1.8) * (.92 + .16 * nC) * .86;
        diffuseColor.rgb = a;`)
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\nreflectedLight.directSpecular *= .3; reflectedLight.indirectDiffuse *= .8;")
      .replace("#include <normal_fragment_maps>", `#include <normal_fragment_maps>
        { // procedural bump so the apron's lighting texture is closer to the 1 m map
          vec2 q = vWP.xz * .05; float e = .5;
          float h0 = vn(q) + .5 * vn(q * 2.7), hx = vn(q + vec2(e, 0.)) + .5 * vn((q + vec2(e, 0.)) * 2.7), hz = vn(q + vec2(0., e)) + .5 * vn((q + vec2(0., e)) * 2.7);
          vec3 dw = vec3(-(hx - h0) * .18, 0., -(hz - h0) * .18);
          normal = normalize(normal + (viewMatrix * vec4(dw, 0.)).xyz);
        }`);
  };
  csm.setupMaterial(mat);
  const h0 = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { h0(s, r); hook(s); };
  mat.customProgramCacheKey = () => "mmc-apron";
  const group = new THREE.Group(); group.name = "apron";
  const chunks = new Map();
  for (let i = 0; i < idx.length; i += 3) {
    const vertex = idx[i], x = pos[vertex * 3], z = pos[vertex * 3 + 2];
    const key = `${Math.floor(x / 512)},${Math.floor(z / 512)}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(idx[i], idx[i + 1], idx[i + 2]);
  }
  const point = new THREE.Vector3();
  for (const indices of chunks.values()) {
    const chunk = new THREE.BufferGeometry();
    chunk.setAttribute("position", g.attributes.position);
    chunk.setAttribute("normal", g.attributes.normal);
    chunk.setIndex(indices);
    const bounds = new THREE.Box3();
    for (const vertex of indices) bounds.expandByPoint(point.fromBufferAttribute(g.attributes.position, vertex));
    chunk.boundingBox = bounds; chunk.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    const mesh = new THREE.Mesh(chunk, mat);
    mesh.receiveShadow = true; mesh.castShadow = false;
    group.add(mesh);
  }
  group.userData.countTriangles = (frustum) => group.children.reduce((count, mesh) =>
    count + (frustum.intersectsSphere(mesh.geometry.boundingSphere) ? mesh.geometry.index.count / 3 : 0), 0);
  return group;
}
