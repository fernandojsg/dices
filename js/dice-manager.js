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
      shape: data.shape,
      material: this.diceMaterial,
      sleepTimeLimit: 0.1,
      sleepSpeedLimit: 0.2,
      linearDamping: 0.6,
      angularDamping: 0.6,
    });
    body.position.set(0, -10, 0);
    body.allowSleep = true;
    body.sleep();
    this.world.addBody(body);

    const id = this.nextId++;
    const die = { mesh, body, type, id, value: null };
    this.dice.push(die);
    return die;
  }

  removeDie(id) {
    const idx = this.dice.findIndex(d => d.id === id);
    if (idx === -1) return;

    const die = this.dice[idx];
    this.scene.remove(die.mesh);
    this.world.removeBody(die.body);
    this.dice.splice(idx, 1);
  }

  clearAll() {
    for (const die of [...this.dice]) {
      this.scene.remove(die.mesh);
      this.world.removeBody(die.body);
    }
    this.dice.length = 0;
  }

  throwDice(selectedIds) {
    const toThrow = selectedIds
      ? this.dice.filter(d => selectedIds.includes(d.id))
      : this.dice;

    if (toThrow.length === 0) return;

    this.rolling = true;

    // Wake up all bodies
    for (const die of toThrow) {
      die.value = null;
      die.body.wakeUp();
      die.body.sleepState = CANNON.Body.AWAKE;
    }

    // Arrange dice in starting positions — spread enough to avoid overlap
    const count = toThrow.length;
    const spacing = 2.0;

    for (let i = 0; i < count; i++) {
      const die = toThrow[i];
      const body = die.body;

      const x = (i - (count - 1) / 2) * spacing + (Math.random() - 0.5) * 0.5;
      const y = 2.5 + i * 0.4 + Math.random() * 0.3;
      const z = -1 + Math.random() * 2;

      body.position.set(x, y, z);
      body.velocity.set(
        (Math.random() - 0.5) * 2,
        -3 + Math.random(),
        (Math.random() - 0.5) * 1.5
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
