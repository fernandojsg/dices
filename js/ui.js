import { BUILT_IN_PRESETS, describePreset } from './presets.js';
import { getDieColor } from './dice-geometry.js';

const COLOR_PALETTE = [
  { name: 'Red',     hex: '#c0392b' },
  { name: 'Blue',    hex: '#2980b9' },
  { name: 'Green',   hex: '#27ae60' },
  { name: 'Purple',  hex: '#8e44ad' },
  { name: 'Orange',  hex: '#d35400' },
  { name: 'Gold',    hex: '#c49b1a' },
  { name: 'Pink',    hex: '#e84393' },
  { name: 'Teal',    hex: '#00b894' },
  { name: 'Slate',   hex: '#636e72' },
  { name: 'Crimson', hex: '#e74c3c' },
  { name: 'Indigo',  hex: '#4834d4' },
  { name: 'Lime',    hex: '#6ab04c' },
];

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
    this.customizeOverlay = document.getElementById('customize-overlay');
    this.customizeDialog = document.getElementById('customize-dialog');

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
    const row = this.modeToggle.closest('.mode-toggle');
    const toggle = (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.state.setSimpleMode(!this.state.simpleMode);
      this._applyMode();
    };
    row.addEventListener('pointerup', toggle);
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

      navigator.vibrate?.([80, 40, 80]);

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
          e.target.closest('#bottom-bar') || e.target.closest('#menu-overlay') ||
          e.target.closest('#customize-dialog') || e.target.closest('#customize-overlay')) return;
      e.preventDefault();
      roll();
    }, { passive: false });

    // On desktop: use click on viewport or overlay
    document.addEventListener('click', (e) => {
      if (e.target.closest('#menu') || e.target.closest('#menu-btn') ||
          e.target.closest('#bottom-bar') || e.target.closest('#menu-overlay') ||
          e.target.closest('#customize-dialog') || e.target.closest('#customize-overlay')) return;
      // In 3D mode, only fire on canvas
      if (!this.state.simpleMode && e.target !== this.viewport.querySelector('canvas')) return;
      roll();
    });

    this.diceManager.onSettled = (results) => {
      navigator.vibrate?.(120);
      this.renderResults(results);
    };
  }

  _doSimpleRoll() {
    this._simpleRolling = true;
    this.rollOverlay.classList.add('active');
    this.resultsPanel.innerHTML = '<div class="empty-state">Rolling...</div>';

    const dice = this.state.getSelectedDice();
    if (dice.length === 0) {
      this._simpleRolling = false;
      return;
    }
    const hasMultipleTypes = new Set(dice.map(d => d.type)).size > 1;
    const hasCustomNames = dice.some(d => d.name);

    // Generate random results
    const maxValues = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 };
    const results = dice.map(d => ({
      type: d.type,
      value: Math.floor(Math.random() * (maxValues[d.type] || 6)) + 1
    }));

    // Compute card size to fill the available space (measure overlay after it's visible)
    const count = dice.length;
    const bottomBar = document.getElementById('bottom-bar');
    const barH = bottomBar ? bottomBar.offsetHeight : 64;
    const pad = 16; // matches .roll-cards padding
    const vw = this.rollOverlay.clientWidth - pad * 2;
    const vh = this.rollOverlay.clientHeight - barH - pad * 2;
    const gap = 12;
    const aspect = 0.82; // width / height

    // Try different column counts and pick the one that gives the largest cards
    let bestW = 0;
    for (let cols = 1; cols <= count; cols++) {
      const rows = Math.ceil(count / cols);
      const maxW = (vw - gap * (cols - 1)) / cols;
      const maxH = (vh - gap * (rows - 1)) / rows;
      const w = Math.min(maxW, maxH * aspect);
      if (w > bestW) bestW = w;
    }
    const cardW = Math.min(Math.max(bestW, 40), 200);
    const fontSize = cardW * 0.4;
    const typeSize = cardW * 0.12;

    // Create cards in rolling state
    let cardsHtml = '';
    for (const d of dice) {
      const color = this._getDieColor(d);
      const showLabel = hasMultipleTypes || hasCustomNames;
      const labelText = d.name || d.type;
      const typeLabel = showLabel ? `<span class="card-type" style="font-size:${typeSize}px">${labelText}</span>` : '';
      cardsHtml += `<div class="roll-card rolling" style="background:${color};width:${cardW}px;font-size:${fontSize}px">${typeLabel}<span class="card-value">?</span></div>`;
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
      navigator.vibrate?.(120);
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

  _getDieColor(die) {
    return die.color || getDieColor(die.type);
  }

  renderDiceList() {
    if (this.state.dice.length === 0) {
      this.diceList.innerHTML = '<div class="empty-state">No dice added yet</div>';
      return;
    }

    let html = '';
    this.state.dice.forEach((die, i) => {
      const color = this._getDieColor(die);
      const toggleClass = die.selected ? 'active' : '';
      const inactiveClass = die.selected ? '' : ' inactive';
      const label = die.name || die.type;
      html += `
        <div class="dice-item${inactiveClass}">
          <button class="die-toggle ${toggleClass}" data-toggle-die="${i}"></button>
          <span class="die-badge" style="background:${color}" data-customize-die="${i}">${label}</span>
          <button class="die-remove" data-remove-die="${i}">&times;</button>
        </div>`;
    });

    this.diceList.innerHTML = html;

    // Bind toggle
    this.diceList.querySelectorAll('[data-toggle-die]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.toggleDie);
        const die = this.state.dice[idx];
        die.selected = !die.selected;
        this.state._saveLastConfig();
        this.renderDiceList();
      });
    });

    // Bind badge click → customize dialog
    this.diceList.querySelectorAll('[data-customize-die]').forEach(badge => {
      badge.addEventListener('click', () => {
        const idx = parseInt(badge.dataset.customizeDie);
        this._openCustomizeDialog(idx);
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

  _openCustomizeDialog(idx) {
    const die = this.state.dice[idx];
    if (!die) return;

    const overlay = this.customizeOverlay;
    const nameInput = document.getElementById('customize-name');
    const colorsContainer = document.getElementById('customize-colors');

    nameInput.value = die.name || '';

    // Build color swatches
    let selectedColor = die.color || null;
    let swatchesHtml = `<div class="color-swatch default-swatch${!selectedColor ? ' selected' : ''}" data-color="">&#8635;</div>`;
    for (const c of COLOR_PALETTE) {
      const sel = selectedColor === c.hex ? ' selected' : '';
      swatchesHtml += `<div class="color-swatch${sel}" style="background:${c.hex}" data-color="${c.hex}" title="${c.name}"></div>`;
    }
    colorsContainer.innerHTML = swatchesHtml;

    // Bind swatch clicks
    colorsContainer.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        colorsContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
        selectedColor = swatch.dataset.color || null;
      });
    });

    // Show dialog
    overlay.classList.add('active');
    nameInput.focus();
    nameInput.select();

    // Bind save
    const saveBtn = document.getElementById('customize-save');
    const cancelBtn = document.getElementById('customize-cancel');

    const close = () => {
      overlay.classList.remove('active');
      saveBtn.replaceWith(saveBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    };

    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim() || null;
      const color = selectedColor;
      this.state.updateDie(idx, { name, color });
      this.diceManager.updateDieColor(idx, die.type, color);
      this.renderDiceList();
      close();
    });

    cancelBtn.addEventListener('click', close);

    // Close on overlay click (outside dialog)
    const onOverlayClick = (e) => {
      if (e.target === overlay) {
        close();
        overlay.removeEventListener('click', onOverlayClick);
      }
    };
    overlay.addEventListener('click', onOverlayClick);
  }

  renderResults(results) {
    if (!results || results.length === 0) {
      this.resultsPanel.innerHTML = '<div class="empty-state">No results yet</div>';
      return;
    }

    const hasMultipleTypes = new Set(results.map(r => r.type)).size > 1;
    const hasCustomNames = this.state.dice.some(d => d.name);

    let html = '<div>';
    let total = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const stateDie = this.state.dice[i];
      const color = stateDie ? this._getDieColor(stateDie) : getDieColor(r.type);
      const showLabel = hasMultipleTypes || hasCustomNames;
      const labelText = stateDie?.name || r.type;
      const typeLabel = showLabel ? `<span class="result-type">${labelText}</span>` : '';
      html += `<span class="result-value" style="background:${color}">${typeLabel}${r.value}</span>`;
      total += r.value;
    }

    html += '</div>';
    html += `<span id="result-total">Total: ${total}</span>`;

    this.resultsPanel.innerHTML = html;
  }
}
