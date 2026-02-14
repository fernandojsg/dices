const PRESETS_KEY = 'dice-app-presets';
const LAST_CONFIG_KEY = 'dice-app-last-config';

export class AppState {
  constructor() {
    this.dice = []; // { type, selected, id }
    this.customPresets = this._loadPresets();
    this._restoreLastConfig();
  }

  addDie(type) {
    const die = { type, selected: true, id: Date.now() + Math.random() };
    this.dice.push(die);
    this._saveLastConfig();
    return die;
  }

  removeDie(id) {
    this.dice = this.dice.filter(d => d.id !== id);
    this._saveLastConfig();
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
    }));
    this._saveLastConfig();
  }

  getCurrentConfig() {
    return this.dice.map(d => ({ type: d.type }));
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
      dice: this.dice.map(d => ({ type: d.type, selected: d.selected })),
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
        }));
      }
    } catch { /* ignore */ }
  }
}
