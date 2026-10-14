import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBinary } from './binary.js';
import { addScanWallDetail } from './scan-wall-material.js';

// Eight fitted authored volumes, plus continuous lower-detail background.
// Every GLB has explicit named LOD nodes and identity placement in the same
// Mars metre frame. Old scan stacks and separate cut-cap seals are retired.
export async function buildHeroWalls(base, csm, tex, hf) {
  const kit = await fetch(base + 'hero-walls/library.json').then(r => r.json());
  const placements = await fetch(base + 'hero-walls/placements.json').then(r => r.json());
  const ground = new THREE.DataTexture(hf.data, hf.n, hf.n, THREE.RedFormat, THREE.FloatType);
  ground.minFilter = ground.magFilter = THREE.LinearFilter; ground.needsUpdate = true;
  const wallTex = {...tex, scanGround: ground, scanGroundN: hf.n};
  const loader = new GLTFLoader();
  const files = [...new Set(kit.modules.map(m => m.glb))];
  const scenes = new Map(await Promise.all(files.map(async file => [file,
    await loader.parseAsync(await loadBinary(base + 'hero-walls/' + file), base + 'hero-walls/')])));
  const group = new THREE.Group(); group.name = 'hero-walls';
  const library = kit.modules.map(module => module.lodObjects.map(name => {
    let source; scenes.get(module.glb).scene.traverse(o => { if (o.isMesh && (o.name === name || o.parent?.name === name)) source = o; });
    if (!source) throw new Error('Missing hero LOD ' + name);
    const geometry = source.geometry.clone();
    // Quantized runtime positions use a uniform node scale; promote before
    // applying it so sub-metre coordinates survive the integer source buffer.
    const positions = geometry.attributes.position;
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(Array.from({length: positions.count}, (_,i) => [positions.getX(i), positions.getY(i), positions.getZ(i)]).flat(), 3));
    source.updateWorldMatrix(true, false); geometry.applyMatrix4(source.matrixWorld);
    if (!geometry.index) geometry.setIndex(Array.from({length: geometry.attributes.position.count}, (_,i) => i));
    const material = module.kind === 'background' ? new THREE.MeshStandardMaterial({color: 0x755139, roughness: .94}) : source.material.clone();
    material.side = THREE.FrontSide;
    if (module.kind === 'background') material.flatShading = true;
    material.normalScale?.set(.32, .32);
    csm.setupMaterial(material); addScanWallDetail(material, wallTex);
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    return {geometry, material};
  }));
  const walls = kit.modules.map((module, i) => {
    const part = library[i][2], mesh = new THREE.Mesh(part.geometry, part.material);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false; mesh.updateMatrix(); group.add(mesh);
    const bounds = new THREE.Box3(new THREE.Vector3().fromArray(module.bounds[0]), new THREE.Vector3().fromArray(module.bounds[1]));
    return {mesh, module, p: {module: i}, sphere: bounds.getBoundingSphere(new THREE.Sphere()), lod: 2};
  });
  const frustum = new THREE.Frustum(), vp = new THREE.Matrix4();
  return {group, kit, library, placements, walls, budget: 110000,
    update(camera) {
      camera.updateMatrixWorld(); vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); frustum.setFromProjectionMatrix(vp);
      const visible = walls.filter(w => frustum.intersectsSphere(w.sphere));
      for (const w of walls) w.mesh.visible = false;
      let triangles = visible.reduce((sum,w) => sum + w.module.triangles[2], 0);
      for (const w of visible) {
        w.lod = 2; w.distance = Math.max(1, w.sphere.center.distanceTo(camera.position) - w.sphere.radius);
      }
      visible.sort((a,b) => a.distance - b.distance);
      const upgrade = (w,lod) => {
        const extra = w.module.triangles[lod] - w.module.triangles[w.lod];
        if (triangles + extra > this.budget) return;
        triangles += extra; w.lod = lod;
      };
      // All silhouettes remain. Mid LOD covers nearby walls before detail is
      // spent on the closest hero. The sum is bounded at every camera.
      for (const w of visible) if (w.distance < 3000) upgrade(w,1);
      for (const w of visible) if (w.module.kind !== 'background' && w.distance < 900) upgrade(w,0);
      for (const w of visible) if (w.module.kind === 'background' && w.distance < 450) upgrade(w,0);
      for (const w of visible) {
        const part = library[w.p.module][w.lod]; w.mesh.geometry = part.geometry; w.mesh.material = part.material; w.mesh.visible = true;
      }
      this.shownTriangles = triangles;
    },
    countTriangles() {return group.visible ? {tris: this.shownTriangles || 0, n: walls.filter(w => w.mesh.visible).length} : {tris:0,n:0};},
  };
}
