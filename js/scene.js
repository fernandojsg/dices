import * as THREE from 'three';

const GROUND_SIZE = 20;

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0f0f1a);
  scene.fog = new THREE.Fog(0x0f0f1a, 30, 50);

  // Camera — fairly top-down for better die readability
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 22, 10);
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

  // Resize handler — returned for main.js to call (not auto-bound)
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  return { scene, camera, renderer, resize };
}

/**
 * Compute the visible play area on the ground plane (y=0) from the camera
 * frustum. Returns the largest axis-aligned rectangle centered on origin
 * that fits inside the frustum, inset by `margin`.
 */
export function computePlayBounds(camera, margin = 1.5) {
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const target = new THREE.Vector3();

  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  // Cast rays through the four screen corners
  for (const nx of [-1, 1]) {
    for (const ny of [-1, 1]) {
      raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
      if (raycaster.ray.intersectPlane(groundPlane, target)) {
        minX = Math.min(minX, target.x);
        maxX = Math.max(maxX, target.x);
        minZ = Math.min(minZ, target.z);
        maxZ = Math.max(maxZ, target.z);
      }
    }
  }

  // Use the inscribed rectangle (min of absolute extents on each side)
  return {
    halfX: Math.max(Math.min(Math.abs(minX), Math.abs(maxX)) - margin, 2),
    halfZ: Math.max(Math.min(Math.abs(minZ), Math.abs(maxZ)) - margin, 2),
  };
}

export { GROUND_SIZE };
