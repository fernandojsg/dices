import * as THREE from 'three';

const GROUND_SIZE = 20;

export function createScene(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x252535);
  scene.fog = new THREE.Fog(0x252535, 35, 55);

  // Camera — fairly top-down for better die readability
  const aspect = container.clientWidth / container.clientHeight;
  const camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
  camera.position.set(0, 22, 10);
  camera.lookAt(0, 0, 0);

  // Renderer — tone mapping for realistic light response
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  container.appendChild(renderer.domElement);

  // Lighting — hemisphere for natural ambient sky/ground bounce
  const hemi = new THREE.HemisphereLight(0x8090b0, 0x303040, 0.8);
  scene.add(hemi);

  // Soft ambient fill
  const ambient = new THREE.AmbientLight(0x606070, 0.4);
  scene.add(ambient);

  // Key light — warm overhead, slightly front-right (like a desk lamp)
  const keyLight = new THREE.DirectionalLight(0xfff0e0, 1.8);
  keyLight.position.set(6, 22, 8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.left = -15;
  keyLight.shadow.camera.right = 15;
  keyLight.shadow.camera.top = 15;
  keyLight.shadow.camera.bottom = -15;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.bias = -0.001;
  keyLight.shadow.radius = 3;
  scene.add(keyLight);

  // Fill light — cool, from the opposite side
  const fillLight = new THREE.DirectionalLight(0xb0c0e0, 0.6);
  fillLight.position.set(-6, 12, -4);
  scene.add(fillLight);

  // Rim light — subtle back light for edge definition
  const rimLight = new THREE.DirectionalLight(0x8888cc, 0.3);
  rimLight.position.set(0, 8, -12);
  scene.add(rimLight);

  // Ground plane — dark felt tabletop
  const groundGeo = new THREE.PlaneGeometry(GROUND_SIZE * 2, GROUND_SIZE * 2);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a40,
    roughness: 0.85,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Grid helper for visual reference
  const grid = new THREE.GridHelper(GROUND_SIZE * 2, 40, 0x3a3a55, 0x303048);
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
 * frustum. Returns frustum corners (CCW from above) and wall plane data
 * (position + inward normal) for each edge, inset by `margin`.
 */
export function computePlayBounds(camera, margin = 0.5) {
  camera.updateMatrixWorld();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();

  // Screen corners in CCW order when viewed from above (+Y)
  const screenCorners = [
    new THREE.Vector2(-1, -1), // near-left
    new THREE.Vector2(-1,  1), // far-left
    new THREE.Vector2( 1,  1), // far-right
    new THREE.Vector2( 1, -1), // near-right
  ];

  const corners = [];
  for (const sc of screenCorners) {
    raycaster.setFromCamera(sc, camera);
    const pt = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(groundPlane, pt)) {
      corners.push({ x: pt.x, z: pt.z });
    }
  }

  if (corners.length !== 4) {
    // Fallback — axis-aligned 4x4 box
    corners.length = 0;
    corners.push({ x: -2, z: 2 }, { x: -2, z: -2 }, { x: 2, z: -2 }, { x: 2, z: 2 });
  }

  // For each edge, compute the inward-facing normal and a point on the wall
  // (midpoint of edge, offset inward by margin)
  const walls = [];
  for (let i = 0; i < 4; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % 4];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    // Inward normal for CCW polygon: (-dz, dx) normalized
    const nx = -dz / len;
    const nz = dx / len;
    // Midpoint offset inward by margin
    const px = (a.x + b.x) / 2 + nx * margin;
    const pz = (a.z + b.z) / 2 + nz * margin;
    walls.push({ px, pz, nx, nz });
  }

  return { corners, walls };
}

export { GROUND_SIZE };
