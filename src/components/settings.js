// src/components/settings.js - Settings & Customization Modal for AppFlowy Lean
'use strict';

class SettingsModal {
  constructor(options = {}) {
    this.store = options.store;
    this.onThemeChange = options.onThemeChange || (() => {});
    this.onAccentChange = options.onAccentChange || (() => {});
  }

  show() {
    const existing = document.getElementById('af-settings-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-settings-modal';

    const modal = document.createElement('div');
    modal.className = 'af-settings-box';

    // Header
    const head = document.createElement('div');
    head.className = 'settings-head';
    head.innerHTML = `
      <h2>⚙️ Settings & Customization</h2>
      <button class="modal-close-btn">✕</button>
    `;
    head.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    modal.appendChild(head);

    // Body
    const body = document.createElement('div');
    body.className = 'settings-body';

    // 1. Appearance Section
    const themeSection = document.createElement('div');
    themeSection.className = 'settings-section';
    themeSection.innerHTML = `
      <h3>Appearance</h3>
      <div class="settings-row">
        <div>
          <div class="setting-label">Theme Mode</div>
          <div class="setting-sub">Choose between light, dark, or system match</div>
        </div>
        <div class="theme-button-group">
          <button class="theme-btn" data-theme="dark">🌙 Dark</button>
          <button class="theme-btn" data-theme="light">☀️ Light</button>
        </div>
      </div>
      <div class="settings-row">
        <div>
          <div class="setting-label">Accent Color</div>
          <div class="setting-sub">Select workspace highlight tint</div>
        </div>
        <div class="accent-color-picker">
          <button class="accent-dot" data-color="#6366f1" style="background:#6366f1" title="Indigo (AppFlowy)"></button>
          <button class="accent-dot" data-color="#3b82f6" style="background:#3b82f6" title="Blue"></button>
          <button class="accent-dot" data-color="#10b981" style="background:#10b981" title="Emerald"></button>
          <button class="accent-dot" data-color="#f59e0b" style="background:#f59e0b" title="Amber"></button>
          <button class="accent-dot" data-color="#ec4899" style="background:#ec4899" title="Rose"></button>
        </div>
      </div>
    `;

    themeSection.querySelectorAll('.theme-btn').forEach(btn => {
      btn.onclick = () => this.onThemeChange(btn.dataset.theme);
    });

    themeSection.querySelectorAll('.accent-dot').forEach(dot => {
      dot.onclick = () => this.onAccentChange(dot.dataset.color);
    });

    body.appendChild(themeSection);

    // 2. Keyboard Shortcuts Section
    const shortcutsSection = document.createElement('div');
    shortcutsSection.className = 'settings-section';
    shortcutsSection.innerHTML = `
      <h3>Keyboard Shortcuts</h3>
      <div class="shortcuts-grid">
        <div class="shortcut-item"><kbd>Cmd / Ctrl + K</kbd> <span>Global Command Palette & Search</span></div>
        <div class="shortcut-item"><kbd>/</kbd> <span>Slash Command Block Menu</span></div>
        <div class="shortcut-item"><kbd>Enter</kbd> <span>New block below / Add row</span></div>
        <div class="shortcut-item"><kbd>Backspace</kbd> <span>Delete empty block / Convert</span></div>
        <div class="shortcut-item"><kbd>Esc</kbd> <span>Close popups / dismiss modals</span></div>
      </div>
    `;
    body.appendChild(shortcutsSection);

    // 3. Workspace Diagnostics & Stats
    const statsSection = document.createElement('div');
    statsSection.className = 'settings-section';

    const ws = this.store.getWorkspace();
    const pages = Object.values(this.store.data.pages || {});
    const activePages = pages.filter(p => !p.inTrash);
    const trashPages = pages.filter(p => p.inTrash);
    const totalBlocks = pages.reduce((acc, p) => acc + (p.blocks ? p.blocks.length : 0), 0);
    const dbs = Object.values(this.store.data.databases || {});
    const totalRows = dbs.reduce((acc, db) => acc + (db.rows ? db.rows.length : 0), 0);

    statsSection.innerHTML = `
      <h3>Workspace Diagnostics</h3>
      <div class="stats-cards">
        <div class="stat-card"><span class="stat-num">${activePages.length}</span><span class="stat-label">Active Pages</span></div>
        <div class="stat-card"><span class="stat-num">${totalBlocks}</span><span class="stat-label">Total Blocks</span></div>
        <div class="stat-card"><span class="stat-num">${dbs.length}</span><span class="stat-label">Databases</span></div>
        <div class="stat-card"><span class="stat-num">${totalRows}</span><span class="stat-label">Database Rows</span></div>
        <div class="stat-card"><span class="stat-num">${trashPages.length}</span><span class="stat-label">In Trash</span></div>
      </div>
      <div class="backup-actions">
        <button class="btn-backup-export" id="btn-export-json">💾 Download Full Workspace Backup (JSON)</button>
      </div>
    `;

    statsSection.querySelector('#btn-export-json').onclick = () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(this.store.toJSON());
      const a = document.createElement('a');
      a.setAttribute('href', dataStr);
      a.setAttribute('download', `appflowy-lean-backup-${Date.now()}.json`);
      a.click();
    };

    body.appendChild(statsSection);
    modal.appendChild(body);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsModal };
}
