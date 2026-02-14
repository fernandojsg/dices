import * as THREE from 'three';

const GROUND_SIZE = 20;
const WALL_HEIGHT = 5;

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f1a);
  scene.fog = new THREE.Fog(0x0f0f1a, 30, 50);

  // Camera
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 18, 14);
  camera.lookAt(0, 0, 0);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // Lighting
  const ambient = new THREE.AmbientLight(0x404060, 0.6);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(8, 20, 10);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  dirLight.shadow.camera.near = 1;
  dirLight.shadow.camera.far = 40;
  scene.add(dirLight);

  const fillLight = new THREE.DirectionalLight(0x6666aa, 0.3);
  fillLight.position.set(-5, 10, -5);
  scene.add(fillLight);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE * 2, GROUND_SIZE * 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a2e,
    roughness: 0.9,
    metalness: 0.1,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper for visual reference
  const grid = new THREE.GridHelper(GROUND_SIZE * 2, 40, 0x2a2a4a, 0x1f1f3a);
  grid.position.y = 0.01;
  scene.add(grid);

  // Handle resize
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  return { scene, camera, renderer, onResize };
}

export { GROUND_SIZE, WALL_HEIGHT };
