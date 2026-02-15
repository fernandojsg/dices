const PRESETS_KEY = 'dice-app-presets';
const LAST_CONFIG_KEY = 'dice-app-last-config';
const MODE_KEY = 'dice-app-mode';

export class AppState {
  constructor() {
    this.dice = []; // { type, selected, id, name, color }
    this.customPresets = this._loadPresets();
    this.simpleMode = localStorage.getItem(MODE_KEY) === 'simple';
    this._restoreLastConfig();
  }

  setSimpleMode(on) {
    this.simpleMode = on;
    localStorage.setItem(MODE_KEY, on ? 'simple' : '3d');
  }

  addDie(type) {
    const die = { type, selected: true, id: Date.now() + Math.random(), name: null, color: null };
    this.dice.push(die);
    this._saveLastConfig();
    return die;
  }

  removeDie(id) {
    this.dice = this.dice.filter(d => d.id !== id);
    this._saveLastConfig();
  }

  updateDie(index, props) {
    const die = this.dice[index];
    if (die) {
      Object.assign(die, props);
      this._saveLastConfig();
    }
  }

  toggleDie(id) {
    const die = this.dice.find(d => d.id === id);
    if (die) {
      die.selected = !die.selected;
      this._saveLastConfig();
    }
  }

  clearDice() {
    this.dice = [];
    this._saveLastConfig();
  }

  getSelectedDice() {
    return this.dice.filter(d => d.selected);
  }

  // --- Config from preset ---
  loadConfig(diceList) {
    this.dice = diceList.map(d => ({
      type: d.type,
      selected: true,
      id: Date.now() + Math.random(),
      name: d.name || null,
      color: d.color || null,
    }));
    this._saveLastConfig();
  }

  getCurrentConfig() {
    return this.dice.map(d => {
      const cfg = { type: d.type };
      if (d.name) cfg.name = d.name;
      if (d.color) cfg.color = d.color;
      return cfg;
    });
  }

  // --- Custom presets ---
  savePreset(name) {
    const preset = {
      name,
      dice: this.getCurrentConfig(),
      createdAt: Date.now(),
    };
    this.customPresets = this.customPresets.filter(p => p.name !== name);
    this.customPresets.push(preset);
    this._savePresets();
    return preset;
  }

  deletePreset(name) {
    this.customPresets = this.customPresets.filter(p => p.name !== name);
    this._savePresets();
  }

  // --- localStorage ---
  _loadPresets() {
    try {
      const data = JSON.parse(localStorage.getItem(PRESETS_KEY));
      if (data?.version === 1 && Array.isArray(data.presets)) {
        return data.presets;
      }
    } catch { /* ignore */ }
    return [];
  }

  _savePresets() {
    localStorage.setItem(PRESETS_KEY, JSON.stringify({
      version: 1,
      presets: this.customPresets,
    }));
  }

  _saveLastConfig() {
    localStorage.setItem(LAST_CONFIG_KEY, JSON.stringify({
      dice: this.dice.map(d => {
        const cfg = { type: d.type, selected: d.selected };
        if (d.name) cfg.name = d.name;
        if (d.color) cfg.color = d.color;
        return cfg;
      }),
    }));
  }

  _restoreLastConfig() {
    try {
      const data = JSON.parse(localStorage.getItem(LAST_CONFIG_KEY));
      if (data?.dice && Array.isArray(data.dice)) {
        this.dice = data.dice.map(d => ({
          type: d.type,
          selected: d.selected !== false,
          id: Date.now() + Math.random(),
          name: d.name || null,
          color: d.color || null,
        }));
      }
    } catch { /* ignore */ }
  }
}
