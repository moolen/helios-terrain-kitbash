import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadBinary } from './binary.js';
import { addScanWallDetail } from './scan-wall-material.js';

export async function buildScanWallSeals(base,csm,tex) {
  const [meta,gltf]=await Promise.all([
    fetch(base+'scan-walls/seals.json').then(r=>r.json()),
    loadBinary(base+'scan-walls/cerberus-wall-seals.glb').then(b=>new GLTFLoader().parseAsync(b,'')),
  ]);
  const group=gltf.scene;group.name='scan-wall-seals';const chunks=[];
  group.traverse(o=>{
    if(!o.isMesh)return;
    const material=o.material.clone();material.side=THREE.DoubleSide;
    csm.setupMaterial(material);addScanWallDetail(material,tex);o.material=material;
    o.castShadow=false;o.receiveShadow=true;
    o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
    chunks.push(o);
  });
  return {group,meta,countTriangles(frustum){
    let tris=0,n=0;
    for(const mesh of chunks){
      mesh.visible=frustum.intersectsBox(mesh.geometry.boundingBox);
      if(mesh.visible){tris+=mesh.geometry.index?mesh.geometry.index.count/3:mesh.geometry.attributes.position.count/3;n++;}
    }
    return {tris,n};
  }};
}
