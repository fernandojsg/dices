import * as CANNON from 'cannon-es';

export function createPhysicsWorld(bounds) {
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
    friction: 0.6,
    restitution: 0.05,
  });
  world.addContactMaterial(diceGroundContact);

  const diceDiceContact = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.1,
    restitution: 0.08,
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

  // Dynamic walls — 4 infinite planes aligned with the camera frustum edges
  const wallBodies = [];
  for (let i = 0; i < 4; i++) {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    world.addBody(body);
    wallBodies.push(body);
  }

  // Ceiling — prevent dice from flying above the camera view
  const ceilingBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial,
  });
  ceilingBody.position.set(0, 10, 0);
  ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  world.addBody(ceilingBody);

  // Orient and position walls to match frustum edges
  function updateBounds(b) {
    for (let i = 0; i < 4; i++) {
      const wall = b.walls[i];
      const body = wallBodies[i];
      body.position.set(wall.px, 0, wall.pz);
      // CANNON.Plane default normal is (0,0,1) in local space.
      // Rotate around Y so local +Z aligns with desired inward normal (nx, 0, nz).
      const angle = Math.atan2(wall.nx, wall.nz);
      body.quaternion.setFromEuler(0, angle, 0);
    }
  }

  // Set initial wall positions
  updateBounds(bounds);

  const fixedTimeStep = 1 / 120;
  const maxSubSteps = 8;

  function step(dt) {
    world.step(fixedTimeStep, dt, maxSubSteps);
  }

  return { world, step, diceMaterial, updateBounds };
}
