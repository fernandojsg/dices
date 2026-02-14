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
    friction: 0.5,
    restitution: 0.2,
  });
  world.addContactMaterial(diceGroundContact);

  const diceDiceContact = new CANNON.ContactMaterial(diceMaterial, diceMaterial, {
    friction: 0.4,
    restitution: 0.3,
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

  // Dynamic walls — positioned to match the camera's visible area
  // Each wall is an infinite plane facing inward.
  // Config: axis to constrain, sign (-1 = negative side, +1 = positive side)
  const wallConfigs = [
    { axis: 'z', sign: -1, yRot: 0 },              // back
    { axis: 'z', sign:  1, yRot: Math.PI },         // front
    { axis: 'x', sign: -1, yRot: Math.PI / 2 },    // left
    { axis: 'x', sign:  1, yRot: -Math.PI / 2 },   // right
  ];

  const wallBodies = wallConfigs.map(cfg => {
    const body = new CANNON.Body({
      type: CANNON.Body.STATIC,
      shape: new CANNON.Plane(),
      material: groundMaterial,
    });
    body.quaternion.setFromEuler(0, cfg.yRot, 0);
    world.addBody(body);
    return { body, cfg };
  });

  // Ceiling — prevent dice from flying above the camera view
  const ceilingBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
    material: groundMaterial,
  });
  ceilingBody.position.set(0, 10, 0);
  ceilingBody.quaternion.setFromEuler(Math.PI / 2, 0, 0);
  world.addBody(ceilingBody);

  // Position walls to match given play bounds
  function updateBounds(b) {
    for (const { body, cfg } of wallBodies) {
      const half = cfg.axis === 'x' ? b.halfX : b.halfZ;
      if (cfg.axis === 'x') {
        body.position.set(cfg.sign * half, 0, 0);
      } else {
        body.position.set(0, 0, cfg.sign * half);
      }
    }
  }

  // Set initial wall positions
  updateBounds(bounds);

  const fixedTimeStep = 1 / 60;
  const maxSubSteps = 3;

  function step(dt) {
    world.step(fixedTimeStep, dt, maxSubSteps);
  }

  return { world, step, diceMaterial, updateBounds };
}
