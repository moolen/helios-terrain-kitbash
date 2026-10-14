import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBinary } from './binary.js';
import { addScanWallDetail } from './scan-wall-material.js';
import { buildScanWallSeals } from './scan-wall-seals.js';

// The library contains true 3D scan meshes, including the backs of protruding
// columns. Explicit placement poses are also the game export contract.
export async function buildScanWalls(base, csm, tex, hf) {
  // The already loaded ground heights locate the dust/contact coat in world
  // space, continuously across all module seams and the recessed joins.
  const ground=new THREE.DataTexture(hf.data,hf.n,hf.n,THREE.RedFormat,THREE.FloatType);
  ground.minFilter=ground.magFilter=THREE.LinearFilter;ground.needsUpdate=true;
  tex={...tex,scanGround:ground,scanGroundN:hf.n};
  const [kit, placements, gltf] = await Promise.all([
    fetch(base + 'scan-walls/kit.json').then(r => r.json()),
    fetch(base + 'scan-walls/placements.json').then(r => r.json()),
    loadBinary(base + 'scan-walls/cerberus-wall-kit.glb').then(buffer =>
      new GLTFLoader().parseAsync(buffer, base + 'scan-walls/')),
  ]);
  const group = new THREE.Group(); group.name = 'scan-walls';
  const seals=await buildScanWallSeals(base,csm,tex);group.add(seals.group);
  const library = kit.modules.map(module => module.lodObjects.map(name => {
    let source;
    gltf.scene.traverse(o => { if (o.isMesh && (o.name === name || o.parent?.name === name)) source = o; });
    if (!source) throw new Error('Missing cliff LOD ' + name);
    if (!source.geometry.index) source.geometry.setIndex(Array.from(
      {length:source.geometry.attributes.position.count},(_,i)=>i));
    if (!source.geometry.attributes.normal) source.geometry.computeVertexNormals();
    if (!source.geometry.attributes.uv) throw new Error('Missing scan UVs '+name);
    // The scan cut/backing has UV-degenerate faces. A derivative tangent
    // frame there normalizes zero, producing NaNs that bloom spreads into
    // black screen tiles. Supply finite, orthogonal tangents for every LOD.
    if (!source.geometry.attributes.tangent) source.geometry.computeTangents();
    const tangent = source.geometry.attributes.tangent;
    const normals = source.geometry.attributes.normal;
    const n = new THREE.Vector3(), t = new THREE.Vector3();
    for (let i = 0; i < tangent.count; i++) {
      n.fromBufferAttribute(normals, i);
      if (!Number.isFinite(n.lengthSq()) || n.lengthSq() < .01) { n.set(0, 0, 1); normals.setXYZ(i, 0, 0, 1); }
      else n.normalize();
      t.fromBufferAttribute(tangent, i);
      if (Number.isFinite(t.lengthSq()) && t.lengthSq() > .01) continue;
      t.set(Math.abs(n.x) < .9 ? 1 : 0, Math.abs(n.x) < .9 ? 0 : 1, 0);
      t.addScaledVector(n, -t.dot(n)).normalize();
      tangent.setXYZW(i, t.x, t.y, t.z, 1);
    }
    const material = source.material.clone();
    material.side = THREE.DoubleSide;
    material.normalScale.set(kit.normalGain ?? .35, kit.normalGain ?? .35);
    // Actual outward normals survive nonuniform module scaling; standard
    // three.js normalMatrix and tangent space handle the transform.
    csm.setupMaterial(material);
    addScanWallDetail(material, tex);
    return { geometry: source.geometry, material };
  }));
  const walls = placements.instances.map(p => {
    const first = library[p.module][3];
    const mesh = new THREE.Mesh(first.geometry, first.material);
    mesh.position.fromArray(p.position);
    mesh.rotation.set(...(p.rotationYXZ || [0,p.yaw,0]), 'YXZ');
    mesh.scale.fromArray(p.scale);
    mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    const moduleBounds = kit.modules[p.module].scanBounds || kit.modules[p.module].bounds;
    const bounds = new THREE.Box3(new THREE.Vector3().fromArray(moduleBounds[0]),
      new THREE.Vector3().fromArray(moduleBounds[1])).applyMatrix4(mesh.matrix);
    return { p, mesh, sphere: bounds.getBoundingSphere(new THREE.Sphere()), lod: 3 };
  });
  const frustum = new THREE.Frustum(), vp = new THREE.Matrix4();
  const api = {
    group, placements, kit, walls, library, seals, budget: 110000,
    update(camera) {
      camera.updateMatrixWorld();
      vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(vp);
      const sealCount=seals.countTriangles(frustum);const budget=this.budget-sealCount.tris;
      const visible = walls.filter(w => frustum.intersectsSphere(w.sphere));
      for (const w of walls) w.mesh.visible = false;
      visible.sort((a, b) => a.sphere.center.distanceToSquared(camera.position) - b.sphere.center.distanceToSquared(camera.position));
      // Keep every visible silhouette at the lowest real-scan LOD. Allocate
      // remaining triangles to nearby panels instead of dropping distant walls.
      let triangles = visible.reduce((n,w) => n + kit.modules[w.p.module].triangles[3], 0);
      for (const w of visible) {
        w.distance=Math.max(1,w.sphere.center.distanceTo(camera.position)-w.sphere.radius);
        w.want=w.distance<450?0:w.distance<1500?1:w.distance<6000?2:3;
        w.lod=3;
      }
      const upgrade=(w,lod,limit)=>{
        if (lod>=w.lod) return false;
        const counts=kit.modules[w.p.module].triangles;
        const extra=counts[lod]-counts[w.lod];
        if (triangles+extra>limit) return false;
        triangles+=extra;w.lod=lod;return true;
      };
      // Reserve close detail, then distribute useful scan silhouettes before
      // spending the remaining budget on fine joints. Greedy 20k-first gave
      // most visible panels only a few dozen triangles and glass-like strips.
      let high=0;
      for (const w of visible) if (w.distance<180&&high<2&&upgrade(w,0,budget*.38)) high++;
      for (const w of visible) if (w.want<=2) upgrade(w,2,budget*.72);
      for (const w of visible) if (w.want<=1) upgrade(w,1,budget*.96);
      for (const w of visible) if (w.want<=2) upgrade(w,2,budget);
      for (const w of visible) {
        const lod=w.lod;
        const part = library[w.p.module][lod];
        w.mesh.geometry = part.geometry; w.mesh.material = part.material;
        w.mesh.visible = true; w.lod = lod;
      }
      this.shownTriangles = triangles+sealCount.tris;this.shownSeals=sealCount.n;
    },
    countTriangles() {
      if (!group.visible) return { tris: 0, n: 0 };
      return { tris: this.shownTriangles || 0, n: walls.filter(w => w.mesh.visible).length,seals:this.shownSeals||0 };
    },
  };
  return api;
}
