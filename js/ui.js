import { BUILT_IN_PRESETS, describePreset } from './presets.js';
import { getDieColor } from './dice-geometry.js';

export class UI {
  constructor(state, diceManager) {
    this.state = state;
    this.diceManager = diceManager;

    this.presetsPanel = document.getElementById('presets-panel');
    this.diceList = document.getElementById('dice-list');
    this.rollBtn = document.getElementById('roll-btn');
    this.resultsPanel = document.getElementById('results');

    this._bindAddButtons();
    this._bindRollButton();
    this.render();
  }

  _bindAddButtons() {
    const buttons = document.querySelectorAll('.dice-buttons button');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        const type = btn.dataset.die;
        const stateDie = this.state.addDie(type);
        this.diceManager.createDie(type);
        this.render();
      });
    }
  }

  _bindRollButton() {
    this.rollBtn.addEventListener('click', () => {
      if (this.diceManager.rolling) return;
      if (this.state.dice.length === 0) return;

      const selectedIds = this.state.getSelectedDice().map((_, i) => {
        // Map state dice to manager dice by index
        return this.diceManager.dice[this.state.dice.indexOf(this.state.getSelectedDice()[i])]?.id;
      }).filter(id => id !== undefined);

      // Actually throw all dice (simpler and more fun)
      this.diceManager.throwDice();
      this.rollBtn.disabled = true;
      this.rollBtn.textContent = 'Rolling...';

      this.resultsPanel.innerHTML = '<div class="empty-state">Rolling...</div>';
    });

    this.diceManager.onSettled = (results) => {
      this.rollBtn.disabled = false;
      this.rollBtn.textContent = 'Roll Dice';
      this.renderResults(results);
    };
  }

  render() {
    this.renderPresets();
    this.renderDiceList();
    this.updateRollButton();
  }

  renderPresets() {
    let html = '<div class="preset-list">';

    // Built-in presets
    for (const preset of BUILT_IN_PRESETS) {
      const desc = describePreset(preset);
      html += `
        <div class="preset-item" data-preset-builtin="${preset.name}">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-desc">${desc}</span>
        </div>`;
    }

    // Custom presets
    for (const preset of this.state.customPresets) {
      const desc = describePreset(preset);
      html += `
        <div class="preset-item" data-preset-custom="${preset.name}">
          <span class="preset-name">${preset.name}</span>
          <span class="preset-desc">${desc}</span>
          <button class="delete-preset" data-delete-preset="${preset.name}">&times;</button>
        </div>`;
    }

    html += '</div>';

    // Save preset row
    html += `
      <div class="save-preset-row">
        <input type="text" id="preset-name-input" placeholder="Preset name..." />
        <button id="save-preset-btn">Save</button>
      </div>`;

    this.presetsPanel.innerHTML = html;

    // Bind events
    this.presetsPanel.querySelectorAll('[data-preset-builtin]').forEach(el => {
      el.addEventListener('click', () => {
        const name = el.dataset.presetBuiltin;
        const preset = BUILT_IN_PRESETS.find(p => p.name === name);
        if (preset) this._loadPreset(preset);
      });
    });

    this.presetsPanel.querySelectorAll('[data-preset-custom]').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('delete-preset')) return;
        const name = el.dataset.presetCustom;
        const preset = this.state.customPresets.find(p => p.name === name);
        if (preset) this._loadPreset(preset);
      });
    });

    this.presetsPanel.querySelectorAll('[data-delete-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.state.deletePreset(btn.dataset.deletePreset);
        this.render();
      });
    });

    const saveBtn = document.getElementById('save-preset-btn');
    const nameInput = document.getElementById('preset-name-input');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (name && this.state.dice.length > 0) {
          this.state.savePreset(name);
          nameInput.value = '';
          this.render();
        }
      });
    }
  }

  _loadPreset(preset) {
    // Clear existing dice from manager
    this.diceManager.clearAll();

    // Load into state
    this.state.loadConfig(preset.dice);

    // Create dice in manager
    for (const d of this.state.dice) {
      this.diceManager.createDie(d.type);
    }

    this.resultsPanel.innerHTML = '<div class="empty-state">Add dice and roll!</div>';
    this.render();
  }

  renderDiceList() {
    if (this.state.dice.length === 0) {
      this.diceList.innerHTML = '<div class="empty-state">No dice added yet</div>';
      return;
    }

    let html = '';
    this.state.dice.forEach((die, i) => {
      const color = getDieColor(die.type);
      const checked = die.selected ? 'checked' : '';
      html += `
        <div class="dice-item">
          <label>
            <input type="checkbox" ${checked} data-toggle-die="${i}" />
            <span class="die-badge" style="background:${color}">${die.type}</span>
          </label>
          <button data-remove-die="${i}">&times;</button>
        </div>`;
    });

    this.diceList.innerHTML = html;

    // Bind toggle
    this.diceList.querySelectorAll('[data-toggle-die]').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.toggleDie);
        this.state.dice[idx].selected = cb.checked;
        this.state._saveLastConfig();
      });
    });

    // Bind remove
    this.diceList.querySelectorAll('[data-remove-die]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.removeDie);
        const managerDie = this.diceManager.dice[idx];
        if (managerDie) {
          this.diceManager.removeDie(managerDie.id);
        }
        this.state.dice.splice(idx, 1);
        this.state._saveLastConfig();
        this.render();
      });
    });
  }

  updateRollButton() {
    this.rollBtn.disabled = this.state.dice.length === 0 || this.diceManager.rolling;
  }

  renderResults(results) {
    if (!results || results.length === 0) {
      this.resultsPanel.innerHTML = '<div class="empty-state">No results yet</div>';
      return;
    }

    let html = '<div>';
    let total = 0;

    for (const r of results) {
      const color = getDieColor(r.type);
      html += `<span class="result-value" style="background:${color}">${r.value}</span>`;
      total += r.value;
    }

    html += '</div>';
    html += `<div id="result-total">Total: ${total}</div>`;

    this.resultsPanel.innerHTML = html;
  }
}
