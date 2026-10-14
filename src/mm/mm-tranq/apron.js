import * as THREE from "three";
import { shared, LUNAR_GLSL, lunarApply, TRI_GLSL, NOISE_GLSL } from "./material.js";

// Context ring (Kaguya TC, +-16 km, 32 m heights + 16 m normal map: the real wrinkle ridge and craters) and far
// skyline (SLDEM2015, +-64 km, 250 m), as square tiles around the 12 km map, each with a skirt. Outside the map the
// surface drops by the Moon's curvature (d^2 / 2R, ramped in over 3 km from the map edge), so the horizon is real.
const RM = 1737400;

function grid(meta, buf) {
  const n = meta.n, st = meta.step, a = new Float32Array(buf);
  return (x, z) => {
    const c = THREE.MathUtils.clamp((x - meta.x0) / st, 0, n - 1.001), r = THREE.MathUtils.clamp((z - meta.z0) / st, 0, n - 1.001);
    const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0;
    return (a[r0 * n + c0] * (1 - fc) + a[r0 * n + c0 + 1] * fc) * (1 - fr) + (a[(r0 + 1) * n + c0] * (1 - fc) + a[(r0 + 1) * n + c0 + 1] * fc) * fr;
  };
}

export function buildApron(ctxMeta, ctxBuf, farMeta, farBuf, ctxNormal, tex, csm, hf) {
  const ctx = grid(ctxMeta, ctxBuf), far = grid(farMeta, farBuf);
  const HALF = 6000, CH = 16000;
  const height = (x, z) => {
    const ax = Math.abs(x), az = Math.abs(z);
    const dEdge = Math.hypot(Math.max(ax - HALF, 0), Math.max(az - HALF, 0));
    let y;
    const m = Math.max(ax, az);
    if (m <= CH) {
      y = ctx(x, z);
      const wf = THREE.MathUtils.smoothstep(m, CH - 2500, CH);
      if (wf > 0) y = y * (1 - wf) + far(x, z) * wf;
    } else y = far(x, z);
    if (dEdge < 400) {
      const ex = THREE.MathUtils.clamp(x, -HALF, HALF), ez = THREE.MathUtils.clamp(z, -HALF, HALF);
      const w = THREE.MathUtils.smoothstep(dEdge, 0, 400);
      y = (hf.at(ex, ez) - 0.2) * (1 - w) + y * w;
    }
    const s = THREE.MathUtils.smoothstep(dEdge, 0, 3000);
    return y - s * (x * x + z * z) / (2 * RM);
  };
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
  const U = { ...shared, tAlb: { value: tex.alb }, tNrm: { value: tex.nrm }, tRgh: { value: tex.rgh }, uTile: { value: tex.tiles }, tCN: { value: ctxNormal } };
  mat.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, U);
    s.vertexShader = s.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.)).xyz;");
    s.fragmentShader = s.fragmentShader.replace("#include <common>", "#include <common>\nvarying vec3 vWPos; uniform sampler2D tCN;\n" + NOISE_GLSL + TRI_GLSL + LUNAR_GLSL)
      .replace("#include <map_fragment>", `
        vec3 Ng = normalize(cross(dFdx(vWPos), dFdy(vWPos))); if (Ng.y < 0.) Ng = -Ng;
        vec2 cuv = (vWPos.xz + 16000.) / 32000.;
        float inC = step(max(abs(vWPos.x), abs(vWPos.z)), 15800.);
        vec3 cn = texture2D(tCN, cuv).rgb * 2. - 1.;
        vec3 Nm = normalize(mix(Ng, normalize(vec3(cn.r, cn.b, cn.g)), inC));
        // curvature: tilt the map normal with the surface (the normal map is planar)
        Nm = normalize(Nm + vec3(vWPos.x, 0., vWPos.z) / ${RM}.);
        Tri T = triSetup(vWPos, Nm);
        float l = mix(lum(triS(tAlb, T, 0., .05).rgb), lum(triS(tAlb, T, 2., .012).rgb), .5);
        diffuseColor.rgb = vec3(.93, .955, 1.) * .40 * l;
        vec3 sN = Nm;`)
      .replace("#include <normal_fragment_maps>", "normal = normalize((viewMatrix * vec4(sN, 0.)).xyz);")
      .replace("#include <aomap_fragment>", "#include <aomap_fragment>\n" + lunarApply("sN"));
  };
  const own = mat.onBeforeCompile;
  csm.setupMaterial(mat);
  const csmHook = mat.onBeforeCompile;
  mat.onBeforeCompile = (s, r) => { csmHook(s, r); own(s, r); };
  mat.customProgramCacheKey = () => "mm-tranq-apron";

  const group = new THREE.Group();
  group.name = "apron";
  let tris = 0;
  const tile = (x0, z0, size, step) => {
    const n = Math.round(size / step) + 1;
    const pos = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const x = x0 + c * step, z = z0 + r * step; pos.push(x, height(x, z), z); }
    const idx = [];
    for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) { const a = r * n + c, b = a + 1, d = a + n, e = d + 1; idx.push(a, d, b, b, d, e); }
    // skirt
    const ring = [];
    for (let c = 0; c < n; c++) ring.push(c);
    for (let r = 1; r < n; r++) ring.push(r * n + n - 1);
    for (let c = n - 2; c >= 0; c--) ring.push((n - 1) * n + c);
    for (let r = n - 2; r > 0; r--) ring.push(r * n);
    ring.push(0);
    const base = pos.length / 3, drop = Math.max(6, step * 0.15);
    for (const k of ring) pos.push(pos[k * 3], pos[k * 3 + 1] - drop, pos[k * 3 + 2]);
    for (let i = 0; i < ring.length - 1; i++) { const a = ring[i], b = ring[i + 1], a2 = base + i, b2 = base + i + 1; idx.push(a, b, a2, b, b2, a2); }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = true; m.castShadow = false; m.matrixAutoUpdate = false;
    group.add(m);
    tris += idx.length / 3;
  };
  for (let x0 = -CH; x0 < CH; x0 += 2000) for (let z0 = -CH; z0 < CH; z0 += 2000) {
    if (x0 >= -HALF && x0 + 2000 <= HALF && z0 >= -HALF && z0 + 2000 <= HALF) continue;
    const near = Math.max(Math.abs(x0 + 1000), Math.abs(z0 + 1000)) < 11000;
    tile(x0, z0, 2000, near ? 50 : 100);
  }
  const FH = 64000;
  for (let x0 = -FH; x0 < FH; x0 += 8000) for (let z0 = -FH; z0 < FH; z0 += 8000) {
    if (x0 >= -CH && x0 + 8000 <= CH && z0 >= -CH && z0 + 8000 <= CH) continue;
    const near = Math.max(Math.abs(x0 + 4000), Math.abs(z0 + 4000)) < 32000;
    tile(x0, z0, 8000, near ? 250 : 500);
  }
  group.userData.tris = tris;
  return group;
}
