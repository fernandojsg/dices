import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { getDieData, readFaceValue } from './dice-geometry.js';

export class DiceManager {
  constructor(scene, world, diceMaterial) {
    this.scene = scene;
    this.world = world;
    this.diceMaterial = diceMaterial;
    this.dice = []; // { mesh, body, type, id }
    this.nextId = 0;
    this.rolling = false;
    this.onSettled = null;
  }

  createDie(type) {
    const data = getDieData(type);
    const mesh = new THREE.Mesh(data.geometry, data.materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Position off-screen initially
    mesh.position.set(0, -10, 0);
    this.scene.add(mesh);

    const body = new CANNON.Body({
      mass: 1,
      material: this.diceMaterial,
      sleepTimeLimit: 0.1,
      sleepSpeedLimit: 0.2,
      linearDamping: 0.6,
      angularDamping: 0.6,
    });
    body.position.set(0, -10, 0);
    body.allowSleep = true;
    body.sleep();
    // Store base shape, add scaled version later
    body._baseShape = data.shape;
    this.world.addBody(body);

    const id = this.nextId++;
    const die = { mesh, body, type, id, value: null };
    this.dice.push(die);

    this._applyScale();
    return die;
  }

  removeDie(id) {
    const idx = this.dice.findIndex(d => d.id === id);
    if (idx === -1) return;

    const die = this.dice[idx];
    this.scene.remove(die.mesh);
    this.world.removeBody(die.body);
    this.dice.splice(idx, 1);

    this._applyScale();
  }

  clearAll() {
    for (const die of [...this.dice]) {
      this.scene.remove(die.mesh);
      this.world.removeBody(die.body);
    }
    this.dice.length = 0;
  }

  _getScale() {
    const count = this.dice.length;
    if (count <= 1) return 2;
    if (count <= 2) return 1.5;
    if (count <= 4) return 1.4;
    if (count <= 6) return 1.4;
    if (count <= 10) return 1;
    return 0.65;
  }

  _scaleShape(baseShape, s) {
    if (baseShape instanceof CANNON.Box) {
      return new CANNON.Box(new CANNON.Vec3(
        baseShape.halfExtents.x * s,
        baseShape.halfExtents.y * s,
        baseShape.halfExtents.z * s
      ));
    }
    // ConvexPolyhedron — scale vertices
    const scaledVerts = baseShape.vertices.map(v =>
      new CANNON.Vec3(v.x * s, v.y * s, v.z * s)
    );
    const faces = baseShape.faces.map(f => [...f]);
    return new CANNON.ConvexPolyhedron({ vertices: scaledVerts, faces });
  }

  _applyScale() {
    const s = this._getScale();
    for (const die of this.dice) {
      die.mesh.scale.setScalar(s);
      // Replace physics shape with scaled version
      while (die.body.shapes.length) die.body.removeShape(die.body.shapes[0]);
      die.body.addShape(this._scaleShape(die.body._baseShape, s));
      die.body.mass = s * s * s;
      die.body.updateMassProperties();
    }
    this._currentScale = s;
  }

  throwDice(selectedIds) {
    const toThrow = selectedIds
      ? this.dice.filter(d => selectedIds.includes(d.id))
      : this.dice;

    if (toThrow.length === 0) return;

    this.rolling = true;

    const s = this._currentScale || 1;

    // Wake up all bodies
    for (const die of toThrow) {
      die.value = null;
      die.body.wakeUp();
      die.body.sleepState = CANNON.Body.AWAKE;
    }

    // Arrange dice in starting positions — spread enough to avoid overlap
    const count = toThrow.length;
    const spacing = 1.8 * s;

    for (let i = 0; i < count; i++) {
      const die = toThrow[i];
      const body = die.body;

      const x = (i - (count - 1) / 2) * spacing + (Math.random() - 0.5) * 0.3;
      const y = 2.5 + i * 0.3 + Math.random() * 0.3;
      const z = -1 + Math.random() * 2;

      body.position.set(x, y, z);
      body.velocity.set(
        (Math.random() - 0.5) * 0.5,
        -5,
        (Math.random() - 0.5) * 0.5
      );

      // Random spin
      body.angularVelocity.set(
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8,
        (Math.random() - 0.5) * 8
      );

      // Random initial orientation
      body.quaternion.setFromEuler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    }

    // Check for settling
    this._checkSettled(toThrow);
  }

  _checkSettled(toThrow) {
    const check = () => {
      const allSleeping = toThrow.every(d => d.body.sleepState === CANNON.Body.SLEEPING);

      if (allSleeping) {
        this.rolling = false;
        // Read values
        for (const die of toThrow) {
          die.value = readFaceValue(die.type, die.body.quaternion);
        }
        if (this.onSettled) {
          this.onSettled(this.getResults());
        }
      } else {
        requestAnimationFrame(check);
      }
    };

    // Start checking after a short delay
    setTimeout(() => requestAnimationFrame(check), 150);
  }

  syncMeshes() {
    for (const die of this.dice) {
      die.mesh.position.copy(die.body.position);
      die.mesh.quaternion.copy(die.body.quaternion);
    }
  }

  getResults() {
    return this.dice
      .filter(d => d.value !== null)
      .map(d => ({ id: d.id, type: d.type, value: d.value }));
  }

  getDice() {
    return this.dice.map(d => ({ id: d.id, type: d.type, value: d.value }));
  }
}
