import { createScene, computePlayBounds } from './scene.js';
import { createPhysicsWorld } from './physics.js';
import { DiceManager } from './dice-manager.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

// Initialize
const container = document.getElementById('viewport');
const { scene, camera, renderer, resize } = createScene(container);
const bounds = computePlayBounds(camera);
const { world, step, diceMaterial, updateBounds } = createPhysicsWorld(bounds);

const diceManager = new DiceManager(scene, world, diceMaterial);
const state = new AppState();

// Restore dice from last config
for (const die of state.dice) {
  diceManager.createDie(die.type);
}

const ui = new UI(state, diceManager);

// Handle resize — update camera/renderer, then reposition walls
window.addEventListener('resize', () => {
  resize();
  updateBounds(computePlayBounds(camera));
});

// Animation loop
let lastTime = performance.now();

function animate(time) {
  requestAnimationFrame(animate);

  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  step(dt);
  diceManager.syncMeshes();
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
