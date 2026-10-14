import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { readAssetBinary } from '../asset-binary.js';

// Show the preserved measured base. Native-game grading and dressing are separate.
const region = document.body.dataset.region;
const canvas = document.querySelector('canvas');
const status = document.querySelector('[role="status"]');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color('#101519');
const camera = new THREE.PerspectiveCamera(45, 1, 10, 1000000);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
scene.add(new THREE.HemisphereLight(0xeaf0ff, 0x455264, 2));
const sun = new THREE.DirectionalLight(0xffffff, 3);
sun.position.set(-10000, 9000, -6000);
scene.add(sun);
let terrain;
let boundary;
let levels;
let datum;

function readLevels(buffer) {
  const view = new DataView(buffer);
  if (view.getUint32(0, false) !== 0x4852474e || view.getUint16(4, true) !== 1) {
    throw new Error('Unsupported regional elevation format');
  }
  datum = view.getInt32(22, true) * 0.5;
  let offset = 28;
  const rows = [];
  for (let index = 0; index < view.getUint16(26, true); index++) {
    const size = view.getUint16(offset, true);
    const spacing = view.getFloat64(offset + 2, true);
    offset += 10;
    const heights = new Float32Array(size * size);
    for (let i = 0; i < heights.length; i++) {
      heights[i] = view.getInt16(offset + i * 2, true) * 0.5 - datum;
    }
    rows.push({ size, spacing, heights });
    offset += heights.length * 2;
  }
  if (offset !== buffer.byteLength) throw new Error('Unexpected elevation payload size');
  return rows;
}

function frame() {
  const width = levels[Number(document.querySelector('#extent').value)].size
    * levels[Number(document.querySelector('#extent').value)].spacing;
  camera.position.set(width * 0.35, width * 0.42, width * 0.6);
  controls.target.set(0, 0, 0);
  controls.update();
}

function showLevel() {
  if (terrain) {
    scene.remove(terrain);
    terrain.geometry.dispose();
    terrain.material.dispose();
  }
  if (boundary) {
    scene.remove(boundary);
    boundary.geometry.dispose();
    boundary.material.dispose();
  }
  const { size, spacing, heights } = levels[Number(document.querySelector('#extent').value)];
  const span = (size - 1) * spacing;
  const geometry = new THREE.PlaneGeometry(span, span, size - 1, size - 1);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  const colours = new Float32Array(heights.length * 3);
  let low = Infinity;
  let high = -Infinity;
  for (const h of heights) { low = Math.min(low, h); high = Math.max(high, h); }
  const colour = new THREE.Color();
  for (let i = 0; i < heights.length; i++) {
    positions.setY(i, heights[i]);
    colour.setHSL(0.58 - 0.46 * (heights[i] - low) / (high - low || 1), 0.25, 0.45);
    colour.toArray(colours, i * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  terrain = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide,
    wireframe: document.querySelector('#wireframe').checked,
  }));
  scene.add(terrain);
  const points = [[-6000, -6000], [6000, -6000], [6000, 6000], [-6000, 6000], [-6000, -6000]];
  boundary = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(([x, z]) =>
    new THREE.Vector3(x, high + 50, z))), new THREE.LineBasicMaterial({ color: 0xebb46a }));
  scene.add(boundary);
  applyScale();
  frame();
  status.textContent = `${size} × ${size} samples · ${spacing} m resampling grid · ${(size * spacing / 1000).toFixed(0)} km extent · heights ${low.toFixed(0)} to ${high.toFixed(0)} m relative to datum`;
  document.body.dataset.ready = 'true';
}

function applyScale() {
  if (!terrain) return;
  const scale = Number(document.querySelector('#scale').value);
  terrain.scale.y = scale;
  boundary.scale.y = scale;
  document.querySelector('#scale-value').textContent = `${scale}×`;
}

try {
  levels = readLevels(await readAssetBinary(await fetch(`moon/${region}/lola.bin.gz`)));
  const extent = document.querySelector('#extent');
  for (const [index, level] of levels.entries()) {
    extent.add(new Option(`${level.size * level.spacing / 1000} km / ${level.spacing} m grid`, index));
  }
  extent.addEventListener('change', showLevel);
  document.querySelector('#scale').addEventListener('input', applyScale);
  document.querySelector('#reset').addEventListener('click', frame);
  document.querySelector('#wireframe').addEventListener('change', event => {
    terrain.material.wireframe = event.target.checked;
  });
  showLevel();
  renderer.setAnimationLoop(() => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.round(width * renderer.getPixelRatio())
      || canvas.height !== Math.round(height * renderer.getPixelRatio())) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    controls.update();
    renderer.render(scene, camera);
  });
} catch (error) {
  status.textContent = `The elevation view could not load: ${error.message}`;
  document.body.dataset.ready = 'error';
}
