import { BUILT_IN_PRESETS, describePreset } from './presets.js';
import { getDieColor } from './dice-geometry.js';

export class UI {
  constructor(state, diceManager) {
    this.state = state;
    this.diceManager = diceManager;

    this.menuBtn = document.getElementById('menu-btn');
    this.menuOverlay = document.getElementById('menu-overlay');
    this.presetsPanel = document.getElementById('presets-panel');
    this.diceList = document.getElementById('dice-list');
    this.resultsPanel = document.getElementById('results');
    this.viewport = document.getElementById('viewport');
    this.rollOverlay = document.getElementById('roll-overlay');
    this.rollCards = document.getElementById('roll-cards');
    this.modeToggle = document.getElementById('mode-toggle');

    this._simpleRolling = false;

    this._bindMenuToggle();
    this._bindTabs();
    this._bindModeToggle();
    this._bindAddButtons();
    this._bindCanvasRoll();
    this._applyMode();
    this.render();
  }

  _bindMenuToggle() {
    this.menuBtn.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
    });

    this.menuOverlay.addEventListener('click', () => {
      document.body.classList.remove('menu-open');
    });
  }

  _closeMenu() {
    document.body.classList.remove('menu-open');
  }

  _bindTabs() {
    const tabs = document.querySelectorAll('.menu-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
      });
    });
  }

  _bindModeToggle() {
    // Make the whole row tappable
    const row = this.modeToggle.closest('.mode-toggle');
    const toggle = () => {
      this.state.setSimpleMode(!this.state.simpleMode);
      this._applyMode();
    };
    row.addEventListener('click', toggle);
    row.addEventListener('touchend', (e) => {
      e.preventDefault();
      toggle();
    });
  }

  _applyMode() {
    if (this.state.simpleMode) {
      this.modeToggle.classList.add('active');
      this.viewport.style.display = 'none';
    } else {
      this.modeToggle.classList.remove('active');
      this.viewport.style.display = '';
      this.rollOverlay.classList.remove('active');
    }
  }

  _bindAddButtons() {
    const buttons = document.querySelectorAll('.dice-buttons button');
    for (const btn of buttons) {
      btn.addEventListener('click', () => {
        const type = btn.dataset.die;
        this.state.addDie(type);
        this.diceManager.createDie(type);
        this.render();
      });
    }
  }

  _bindCanvasRoll() {
    const roll = () => {
      if (this.state.dice.length === 0) return;

      if (this.state.simpleMode) {
        if (this._simpleRolling) return;
        this._doSimpleRoll();
      } else {
        if (this.diceManager.rolling) return;
        this.diceManager.throwDice();
        this.resultsPanel.innerHTML = '<div class="empty-state">Rolling...</div>';
      }
    };

    // On touch devices: use touchend to both roll and prevent double-tap zoom
    document.addEventListener('touchend', (e) => {
      // Don't roll if tapping on menu, buttons, or other UI
      if (e.target.closest('#menu') || e.target.closest('#menu-btn') ||
          e.target.closest('#bottom-bar') || e.target.closest('#menu-overlay')) return;
      e.preventDefault();
      roll();
    }, { passive: false });

    // On desktop: use click on viewport or overlay
    document.addEventListener('click', (e) => {
      if (e.target.closest('#menu') || e.target.closest('#menu-btn') ||
          e.target.closest('#bottom-bar') || e.target.closest('#menu-overlay')) return;
      // In 3D mode, only fire on canvas
      if (!this.state.simpleMode && e.target !== this.viewport.querySelector('canvas')) return;
      roll();
    });

    this.diceManager.onSettled = (results) => {
      this.renderResults(results);
    };
  }

  _doSimpleRoll() {
    this._simpleRolling = true;
    this.rollOverlay.classList.add('active');
    this.resultsPanel.innerHTML = '<div class="empty-state">Rolling...</div>';

    const dice = this.state.dice;
    const hasMultipleTypes = new Set(dice.map(d => d.type)).size > 1;

    // Generate random results
    const maxValues = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
    const results = dice.map(d => ({
      type: d.type,
      value: Math.floor(Math.random() * (maxValues[d.type] || 6)) + 1
    }));

    // Create cards in rolling state
    let cardsHtml = '';
    for (const d of dice) {
      const color = getDieColor(d.type);
      const typeLabel = hasMultipleTypes ? `<span class="card-type">${d.type}</span>` : '';
      cardsHtml += `<div class="roll-card rolling" style="background:${color}">${typeLabel}<span class="card-value">?</span></div>`;
    }
    this.rollCards.innerHTML = cardsHtml;

    const cards = this.rollCards.querySelectorAll('.roll-card');
    const values = this.rollCards.querySelectorAll('.card-value');

    // Cycle random numbers during animation
    const interval = setInterval(() => {
      values.forEach((el, i) => {
        const max = maxValues[dice[i].type] || 6;
        el.textContent = Math.floor(Math.random() * max) + 1;
      });
    }, 50);

    // Settle after delay
    setTimeout(() => {
      clearInterval(interval);
      cards.forEach((card, i) => {
        card.classList.remove('rolling');
        card.classList.add('settled');
        values[i].textContent = results[i].value;
      });

      // Show only total in bottom bar for simple mode
      const total = results.reduce((sum, r) => sum + r.value, 0);
      this.resultsPanel.innerHTML = `<span id="result-total">Total: ${total}</span>`;

      this._simpleRolling = false;
    }, 600);
  }

  render() {
    this.renderPresets();
    this.renderDiceList();
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

    this.resultsPanel.innerHTML = '<div class="empty-state">Add dice and tap to roll!</div>';
    this.render();

    // Close menu after loading a preset
    this._closeMenu();
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

  renderResults(results) {
    if (!results || results.length === 0) {
      this.resultsPanel.innerHTML = '<div class="empty-state">No results yet</div>';
      return;
    }

    const hasMultipleTypes = new Set(results.map(r => r.type)).size > 1;

    let html = '<div>';
    let total = 0;

    for (const r of results) {
      const color = getDieColor(r.type);
      const typeLabel = hasMultipleTypes ? `<span class="result-type">${r.type}</span>` : '';
      html += `<span class="result-value" style="background:${color}">${typeLabel}${r.value}</span>`;
      total += r.value;
    }

    html += '</div>';
    html += `<span id="result-total">Total: ${total}</span>`;

    this.resultsPanel.innerHTML = html;
  }
}
