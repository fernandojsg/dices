import * as CANNON from 'cannon-es';
import { GROUND_SIZE, WALL_HEIGHT } from './scene.js';

export function createPhysicsWorld() {
  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -40, 0),
    allowSleep: true,
  });

  world.broadphase = new CANNON.SAPBroadphase(world);
  world.solver.iterations = 10;

  // Material
  const groundMaterial = new CANNON.Material('ground');
  const diceMaterial = new CANNON.Material('dice');

  const diceGroundContact = new CANNON.ContactMaterial(diceMaterial, groundMaterial, {
    friction: 0.4,
    restitution: 0.3,
  });
  world.addContactMaterial(diceGroundContact);

  const diceDiceContact = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.3,
    restitution: 0.4,
  });
  world.addContactMaterial(diceDiceContact);

  // Ground body
  const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial,
  });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Walls
  const halfSize = GROUND_SIZE * 0.45;
  const wallPositions = [
    { pos: [0, WALL_HEIGHT / 2, -halfSize], rot: [0, 0, 0] },        // back
    { pos: [0, WALL_HEIGHT / 2, halfSize], rot: [0, Math.PI, 0] },    // front
    { pos: [-halfSize, WALL_HEIGHT / 2, 0], rot: [0, Math.PI / 2, 0] }, // left
    { pos: [halfSize, WALL_HEIGHT / 2, 0], rot: [0, -Math.PI / 2, 0] }, // right
  ];

  for (const wall of wallPositions) {
    const wallBody = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    wallBody.position.set(...wall.pos);
    wallBody.quaternion.setFromEuler(...wall.rot);
    world.addBody(wallBody);
  }

  const fixedTimeStep = 1 / 60;
  const maxSubSteps = 3;

  function step(dt) {
    world.step(fixedTimeStep, dt, maxSubSteps);
  }

  return { world, step, diceMaterial };
}
