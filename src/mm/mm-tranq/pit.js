import { readAssetBinary } from '../../asset-binary.js';
import * as THREE from "three";

// The pit shaft mesh (scripts/mm/mm-tranq/bake_pit.py): caprock lip, overhang ceiling, layered walls with the ~40 m
// recess band, talus apron and floor. LOD0 (544 segments) within 260 m, a mid LOD (300 segments) to 1.2 km, LOD1 (160 segments) beyond.
export async function buildPit(base, mat) {
  const load = async (f) => {
    const b = await fetch(base + "pit/" + f).then((r) => readAssetBinary(r));
    const [nv, ni] = new Uint32Array(b, 0, 2);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(b, 8, nv * 3), 3));
    g.setAttribute("attr", new THREE.BufferAttribute(new Float32Array(b, 8 + nv * 12, nv * 2), 2));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(b, 8 + nv * 20, ni), 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const [l0, lm, l1] = await Promise.all([load("pit_lod0.bin"), load("pit_lodm.bin"), load("pit_lod1.bin")]);
  const group = new THREE.Group();
  group.name = "pit";
  group.add(l0, lm, l1);
  const c = l0.geometry.boundingSphere.center;
  return {
    group,
    update(cam) { const d = cam.position.distanceTo(c); l0.visible = d < 260; lm.visible = d >= 260 && d < 1200; l1.visible = d >= 1200; },
    tris(frustum) { const m = l0.visible ? l0 : lm.visible ? lm : l1; return frustum.intersectsSphere(m.geometry.boundingSphere) ? m.geometry.index.count / 3 : 0; },
  };
}
