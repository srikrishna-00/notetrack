// src/components/palette.js - Command Palette (Cmd+K) & Global Search for AppFlowy Lean
'use strict';

class CommandPalette {
  constructor(options = {}) {
    this.store = options.store;
    this.onSelectPage = options.onSelectPage || (() => {});
    this.onAction = options.onAction || (() => {});
    this.isOpen = false;
    this.selectedIndex = 0;
    this.results = [];

    this.initKeyboardListener();
  }

  initKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.selectedIndex = 0;
    this.render();
  }

  close() {
    this.isOpen = false;
    const modal = document.getElementById('af-command-palette-modal');
    if (modal) modal.remove();
  }

  render() {
    const existing = document.getElementById('af-command-palette-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-palette-backdrop';
    backdrop.id = 'af-command-palette-modal';

    const box = document.createElement('div');
    box.className = 'af-palette-box';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'palette-input-wrap';
    inputWrap.innerHTML = '<span class="palette-search-icon">🔍</span>';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'palette-input';
    input.placeholder = 'Search pages, blocks, or type a command...';
    input.autofocus = true;

    inputWrap.appendChild(input);
    box.appendChild(inputWrap);

    const list = document.createElement('div');
    list.className = 'palette-results-list';
    box.appendChild(list);

    const hint = document.createElement('div');
    hint.className = 'palette-hint';
    hint.innerHTML = '<span>↑↓ to navigate</span> <span>↵ to select</span> <span>esc to close</span>';
    box.appendChild(hint);

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    input.focus();

    const updateResults = () => {
      const q = input.value.trim();
      this.results = this.getMatches(q);
      this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.results.length - 1));
      this.renderList(list);
    };

    input.oninput = updateResults;

    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex + 1) % Math.max(1, this.results.length);
        this.renderList(list);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % Math.max(1, this.results.length);
        this.renderList(list);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeSelected();
      }
    };

    backdrop.onclick = (e) => {
      if (e.target === backdrop) this.close();
    };

    updateResults();
  }

  getMatches(query) {
    const defaultActions = [
      { id: 'act-new-doc', title: 'New Document Page', icon: '📝', type: 'action', action: 'new-doc' },
      { id: 'act-new-db', title: 'New Multi-View Database', icon: '📊', type: 'action', action: 'new-db' },
      { id: 'act-ai', title: 'Open AI Assistant', icon: '✨', type: 'action', action: 'open-ai' },
      { id: 'act-theme', title: 'Toggle Theme (Dark / Light)', icon: '🌓', type: 'action', action: 'toggle-theme' },
      { id: 'act-trash', title: 'Open Trash & Deleted Pages', icon: '🗑️', type: 'action', action: 'open-trash' },
      { id: 'act-export', title: 'Export Current Page to Markdown', icon: '📥', type: 'action', action: 'export-md' },
      { id: 'act-import', title: 'Import Markdown File', icon: '📤', type: 'action', action: 'import-md' }
    ];

    if (!query) return defaultActions;

    // Search pages in store
    const pageMatches = this.store.search(query).map(p => ({
      id: p.pageId,
      title: p.title,
      icon: p.icon || '📄',
      type: 'page',
      snippet: p.snippet
    }));

    // Filter actions
    const filteredActions = defaultActions.filter(a =>
      a.title.toLowerCase().includes(query.toLowerCase())
    );

    return [...filteredActions, ...pageMatches];
  }

  renderList(listEl) {
    listEl.innerHTML = '';
    if (this.results.length === 0) {
      listEl.innerHTML = '<div class="palette-empty">No matching pages or commands found</div>';
      return;
    }

    this.results.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'palette-item' + (idx === this.selectedIndex ? ' is-selected' : '');

      const icon = document.createElement('span');
      icon.className = 'item-icon';
      icon.textContent = item.icon || '📄';

      const info = document.createElement('div');
      info.className = 'item-info';
      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = item.title;

      info.appendChild(title);
      if (item.snippet && item.snippet !== item.title) {
        const snippet = document.createElement('div');
        snippet.className = 'item-snippet';
        snippet.textContent = item.snippet.slice(0, 70);
        info.appendChild(snippet);
      }

      const badge = document.createElement('span');
      badge.className = 'item-badge';
      badge.textContent = item.type === 'action' ? 'Command' : 'Page';

      row.appendChild(icon);
      row.appendChild(info);
      row.appendChild(badge);

      row.onclick = () => {
        this.selectedIndex = idx;
        this.executeSelected();
      };

      listEl.appendChild(row);
    });

    const selectedEl = listEl.querySelectorAll('.palette-item')[this.selectedIndex];
    if (selectedEl) selectedEl.scrollIntoView({ block: 'nearest' });
  }

  executeSelected() {
    const item = this.results[this.selectedIndex];
    if (!item) return;

    this.close();
    if (item.type === 'page') {
      this.onSelectPage(item.id);
    } else if (item.type === 'action') {
      this.onAction(item.action);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommandPalette };
}
