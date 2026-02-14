import { createScene } from './scene.js';
import { createPhysicsWorld } from './physics.js';
import { DiceManager } from './dice-manager.js';
import { AppState } from './state.js';
import { UI } from './ui.js';

// Initialize
const container = document.getElementById('viewport');
const { scene, camera, renderer } = createScene(container);
const { world, step, diceMaterial } = createPhysicsWorld();
const diceManager = new DiceManager(scene, world, diceMaterial);
const state = new AppState();

// Restore dice from last config
for (const die of state.dice) {
  diceManager.createDie(die.type);
}

const ui = new UI(state, diceManager);

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
