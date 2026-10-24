// src/components/notepad.js - Classic & Modern Notepad Engine for NoteTrack
'use strict';

class NotepadView {
  constructor(container, options = {}) {
    this.container = container;
    this.store = options.store;
    this.pageId = options.pageId;
    this.onUpdate = options.onUpdate || (() => {});
    this.onModeSwitch = options.onModeSwitch || (() => {});

    // Notepad Preferences
    this.wordWrap = true;
    this.fontFamily = 'Consolas, Monaco, "Courier New", monospace';
    this.fontSize = 14;
    this.fontBold = false;
    this.fontItalic = false;
    this.zoom = 100;
    this.showStatusBar = true;
    this.lineEnding = 'Windows (CRLF)';

    this.saveTimeout = null;
    this.lastFindQuery = '';
    this.lastFindIndex = 0;

    this.init();
  }

  escape(str) {
    if (typeof window !== 'undefined' && window.escapeHTML) {
      return window.escapeHTML(str);
    }
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  init() {
    const page = this.store.getPage(this.pageId);
    if (!page) {
      this.container.innerHTML = '<div class="empty-state">No note selected</div>';
      return;
    }

    // Get plain text from blocks
    let initialText = '';
    if (typeof window !== 'undefined' && window.pageToMarkdown) {
      initialText = window.pageToMarkdown(page);
    } else if (Array.isArray(page.blocks)) {
      initialText = page.blocks.map(b => b.text || b.content || '').join('\n');
    }

    this.container.innerHTML = `
      <div class="notepad-workspace">
        <!-- Classic Notepad Menu Bar -->
        <nav class="notepad-menubar" role="menubar">
          <div class="notepad-menu-group">
            <div class="notepad-menu-item" tabindex="0">
              <span class="menu-label"><u>F</u>ile</span>
              <div class="notepad-dropdown">
                <button class="drop-btn" data-act="new">📄 New <span class="shortcut">Ctrl+N</span></button>
                <button class="drop-btn" data-act="open">📂 Open... <span class="shortcut">Ctrl+O</span></button>
                <button class="drop-btn" data-act="save">💾 Save <span class="shortcut">Ctrl+S</span></button>
                <button class="drop-btn" data-act="save-as">📥 Save As (.txt)...</button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="page-setup">📐 Page Setup...</button>
                <button class="drop-btn" data-act="print">🖨️ Print... <span class="shortcut">Ctrl+P</span></button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="switch-rich">📄 Switch to Block Editor</button>
              </div>
            </div>

            <div class="notepad-menu-item" tabindex="0">
              <span class="menu-label"><u>E</u>dit</span>
              <div class="notepad-dropdown">
                <button class="drop-btn" data-act="undo">↩️ Undo <span class="shortcut">Ctrl+Z</span></button>
                <button class="drop-btn" data-act="redo">↪️ Redo <span class="shortcut">Ctrl+Y</span></button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="cut">✂️ Cut <span class="shortcut">Ctrl+X</span></button>
                <button class="drop-btn" data-act="copy">📋 Copy <span class="shortcut">Ctrl+C</span></button>
                <button class="drop-btn" data-act="paste">📥 Paste <span class="shortcut">Ctrl+V</span></button>
                <button class="drop-btn" data-act="delete">🗑️ Delete <span class="shortcut">Del</span></button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="find">🔍 Find... <span class="shortcut">Ctrl+F</span></button>
                <button class="drop-btn" data-act="find-next">⏩ Find Next <span class="shortcut">F3</span></button>
                <button class="drop-btn" data-act="replace">🔄 Replace... <span class="shortcut">Ctrl+H</span></button>
                <button class="drop-btn" data-act="goto">🎯 Go To... <span class="shortcut">Ctrl+G</span></button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="select-all">☑️ Select All <span class="shortcut">Ctrl+A</span></button>
                <button class="drop-btn" data-act="time-date">🕒 Time/Date <span class="shortcut">F5</span></button>
              </div>
            </div>

            <div class="notepad-menu-item" tabindex="0">
              <span class="menu-label">F<u>o</u>rmat</span>
              <div class="notepad-dropdown">
                <button class="drop-btn" data-act="toggle-wrap">
                  <span class="check-mark" id="np-wrap-check">${this.wordWrap ? '✓' : ''}</span> Word Wrap
                </button>
                <button class="drop-btn" data-act="font">🔤 Font...</button>
              </div>
            </div>

            <div class="notepad-menu-item" tabindex="0">
              <span class="menu-label"><u>V</u>iew</span>
              <div class="notepad-dropdown">
                <button class="drop-btn" data-act="zoom-in">🔍+ Zoom In <span class="shortcut">Ctrl++</span></button>
                <button class="drop-btn" data-act="zoom-out">🔍- Zoom Out <span class="shortcut">Ctrl+-</span></button>
                <button class="drop-btn" data-act="zoom-reset">🔍 Restore Default <span class="shortcut">Ctrl+0</span></button>
                <div class="drop-sep"></div>
                <button class="drop-btn" data-act="toggle-status">
                  <span class="check-mark" id="np-status-check">${this.showStatusBar ? '✓' : ''}</span> Status Bar
                </button>
              </div>
            </div>

            <div class="notepad-menu-item" tabindex="0">
              <span class="menu-label"><u>H</u>elp</span>
              <div class="notepad-dropdown">
                <button class="drop-btn" data-act="about">ℹ️ About Notepad</button>
              </div>
            </div>
          </div>

          <div class="notepad-right-tools">
            <span class="notepad-badge">📝 NOTEPAD MODE</span>
            <button class="notepad-btn-switch" id="np-btn-switch-rich" title="Switch to Rich Document Editor">Switch to Rich Blocks 📄</button>
          </div>
        </nav>

        <!-- Hidden input for file opening -->
        <input type="file" id="np-file-input" accept=".txt,.text,.md,.log,.csv,.json,.js,.py,.html" style="display:none;" />

        <!-- Notepad Main Body with Line Numbers -->
        <div class="notepad-body" id="np-body">
          <div class="notepad-gutter" id="np-gutter">1</div>
          <textarea class="notepad-textarea" id="np-textarea" spellcheck="false" wrap="${this.wordWrap ? 'soft' : 'off'}">${this.escape(initialText)}</textarea>
        </div>

        <!-- Classic Notepad Status Bar -->
        <footer class="notepad-statusbar" id="np-statusbar" style="display:${this.showStatusBar ? 'flex' : 'none'};">
          <div class="status-cell cursor-pos" id="np-stat-cursor">Ln 1, Col 1</div>
          <div class="status-cell doc-stats" id="np-stat-counts">Chars: 0 | Words: 0 | Lines: 1</div>
          <div class="status-cell zoom-level" id="np-stat-zoom">${this.zoom}%</div>
          <div class="status-cell line-ending">${this.lineEnding}</div>
          <div class="status-cell encoding">UTF-8</div>
        </footer>
      </div>
    `;

    this.bindEvents();
    this.updateGutter();
    this.updateStatusBar();
    this.applyFontStyles();
  }

  bindEvents() {
    const textarea = this.container.querySelector('#np-textarea');
    const gutter = this.container.querySelector('#np-gutter');
    const fileInput = this.container.querySelector('#np-file-input');

    if (!textarea) return;

    // Real-time typing & auto-save
    textarea.addEventListener('input', () => {
      this.updateGutter();
      this.updateStatusBar();
      this.scheduleSave();
    });

    // Synchronize gutter scrolling
    textarea.addEventListener('scroll', () => {
      if (gutter) gutter.scrollTop = textarea.scrollTop;
    });

    // Cursor position tracking
    textarea.addEventListener('keyup', () => this.updateStatusBar());
    textarea.addEventListener('click', () => this.updateStatusBar());
    textarea.addEventListener('select', () => this.updateStatusBar());

    // Shortcuts inside textarea
    textarea.addEventListener('keydown', (e) => {
      // F5 - Time / Date
      if (e.key === 'F5') {
        e.preventDefault();
        this.insertTimeDate();
      }
      // Ctrl+S / Cmd+S - Save
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveNow();
      }
      // Ctrl+F / Cmd+F - Find
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.showFindDialog();
      }
      // Ctrl+H / Cmd+H - Replace
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.showReplaceDialog();
      }
      // Ctrl+G / Cmd+G - Go To Line
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        this.showGoToDialog();
      }
      // F3 - Find Next
      else if (e.key === 'F3') {
        e.preventDefault();
        this.findNext(this.lastFindQuery);
      }
      // Tab key indent
      else if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;
        this.scheduleSave();
      }
    });

    // File input handler for "Open..."
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        textarea.value = ev.target.result || '';
        this.store.updatePage(this.pageId, { title: file.name.replace(/\.[^/.]+$/, '') });
        this.updateGutter();
        this.updateStatusBar();
        this.saveNow();
      };
      reader.readAsText(file);
    });

    // Menubar Dropdown Actions
    this.container.querySelectorAll('.notepad-dropdown button[data-act]').forEach(btn => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.act;
        this.handleMenuAction(act);
      });
    });

    // Switch to rich editor
    const switchBtn = this.container.querySelector('#np-btn-switch-rich');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        this.saveNow();
        this.onModeSwitch('document');
      });
    }
  }

  handleMenuAction(act) {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;

    switch (act) {
      case 'new': {
        const newPage = this.store.createPage({
          title: 'Untitled Notepad',
          type: 'notepad',
          icon: '📝'
        });
        if (typeof window !== 'undefined' && window.appShell) {
          window.appShell.setActivePage(newPage.id);
        }
        break;
      }
      case 'open': {
        const fileInput = this.container.querySelector('#np-file-input');
        if (fileInput) fileInput.click();
        break;
      }
      case 'save':
        this.saveNow();
        break;
      case 'save-as':
        this.exportTxt();
        break;
      case 'page-setup':
        this.showPageSetupDialog();
        break;
      case 'print':
        window.print();
        break;
      case 'switch-rich':
        this.saveNow();
        this.onModeSwitch('document');
        break;
      case 'undo':
        document.execCommand('undo');
        break;
      case 'redo':
        document.execCommand('redo');
        break;
      case 'cut':
        document.execCommand('cut');
        break;
      case 'copy':
        document.execCommand('copy');
        break;
      case 'paste':
        navigator.clipboard?.readText().then(text => {
          this.insertTextAtCursor(text);
        }).catch(() => document.execCommand('paste'));
        break;
      case 'delete':
        this.insertTextAtCursor('');
        break;
      case 'find':
        this.showFindDialog();
        break;
      case 'find-next':
        this.findNext(this.lastFindQuery);
        break;
      case 'replace':
        this.showReplaceDialog();
        break;
      case 'goto':
        this.showGoToDialog();
        break;
      case 'select-all':
        textarea.select();
        break;
      case 'time-date':
        this.insertTimeDate();
        break;
      case 'toggle-wrap':
        this.wordWrap = !this.wordWrap;
        textarea.wrap = this.wordWrap ? 'soft' : 'off';
        const wrapCheck = this.container.querySelector('#np-wrap-check');
        if (wrapCheck) wrapCheck.textContent = this.wordWrap ? '✓' : '';
        break;
      case 'font':
        this.showFontDialog();
        break;
      case 'zoom-in':
        this.setZoom(this.zoom + 10);
        break;
      case 'zoom-out':
        this.setZoom(Math.max(50, this.zoom - 10));
        break;
      case 'zoom-reset':
        this.setZoom(100);
        break;
      case 'toggle-status':
        this.showStatusBar = !this.showStatusBar;
        const sb = this.container.querySelector('#np-statusbar');
        if (sb) sb.style.display = this.showStatusBar ? 'flex' : 'none';
        const stCheck = this.container.querySelector('#np-status-check');
        if (stCheck) stCheck.textContent = this.showStatusBar ? '✓' : '';
        break;
      case 'about':
        this.showAboutDialog();
        break;
    }
  }

  insertTextAtCursor(text) {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
    textarea.focus();
    this.updateGutter();
    this.updateStatusBar();
    this.scheduleSave();
  }

  insertTimeDate() {
    const d = new Date();
    const formatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString();
    this.insertTextAtCursor(formatted);
  }

  updateGutter() {
    const textarea = this.container.querySelector('#np-textarea');
    const gutter = this.container.querySelector('#np-gutter');
    if (!textarea || !gutter) return;

    const lines = (textarea.value || '').split('\n').length;
    if (lines === this._lastLineCount) return;
    this._lastLineCount = lines;

    const nums = [];
    for (let i = 1; i <= Math.max(1, lines); i++) {
      nums.push(i);
    }
    gutter.textContent = nums.join('\n');
  }

  updateStatusBar() {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;

    const val = textarea.value || '';
    const selStart = textarea.selectionStart || 0;
    const textUpToCursor = val.substring(0, selStart);
    const lineNum = textUpToCursor.split('\n').length;
    const colNum = selStart - textUpToCursor.lastIndexOf('\n');

    const totalLines = val.split('\n').length;
    const totalChars = val.length;
    const words = val.trim() ? val.trim().split(/\s+/).length : 0;

    const statCursor = this.container.querySelector('#np-stat-cursor');
    if (statCursor) statCursor.textContent = `Ln ${lineNum}, Col ${colNum}`;

    const statCounts = this.container.querySelector('#np-stat-counts');
    if (statCounts) statCounts.textContent = `Chars: ${totalChars} | Words: ${words} | Lines: ${totalLines}`;
  }

  setZoom(val) {
    this.zoom = val;
    const textarea = this.container.querySelector('#np-textarea');
    if (textarea) textarea.style.zoom = `${this.zoom}%`;
    const statZoom = this.container.querySelector('#np-stat-zoom');
    if (statZoom) statZoom.textContent = `${this.zoom}%`;
  }

  applyFontStyles() {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;
    textarea.style.fontFamily = this.fontFamily;
    textarea.style.fontSize = `${this.fontSize}px`;
    textarea.style.fontWeight = this.fontBold ? 'bold' : 'normal';
    textarea.style.fontStyle = this.fontItalic ? 'italic' : 'normal';
  }

  scheduleSave() {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveNow(), 300);
  }

  saveNow() {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;
    const text = textarea.value;

    let blocks = [];
    if (typeof window !== 'undefined' && window.markdownToBlocks) {
      blocks = window.markdownToBlocks(text);
    } else {
      blocks = text.split('\n').map(l => ({
        id: 'b-' + Math.random().toString(36).slice(2, 8),
        type: 'paragraph',
        text: l
      }));
    }

    this.store.updatePage(this.pageId, {
      blocks,
      updatedAt: Date.now()
    });

    this.onUpdate();
  }

  exportTxt() {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;
    const page = this.store.getPage(this.pageId) || { title: 'Untitled' };
    const text = textarea.value;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${page.title || 'Untitled'}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Notepad Modals (Find, Replace, GoTo, Font, About)
  showFindDialog() {
    this.showModal('Find in Document', `
      <div class="notepad-modal-row">
        <label>Find what:</label>
        <input type="text" id="np-find-input" value="${this.escape(this.lastFindQuery)}" />
      </div>
      <div class="notepad-modal-row" style="margin-top:8px;">
        <label><input type="checkbox" id="np-find-case" /> Match case</label>
        <label style="margin-left:12px;"><input type="checkbox" id="np-find-wrap" checked /> Wrap around</label>
      </div>
      <div id="np-find-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    `, [
      {
        label: 'Find Next',
        primary: true,
        action: (modal) => {
          const q = modal.querySelector('#np-find-input').value;
          const matchCase = modal.querySelector('#np-find-case').checked;
          const status = modal.querySelector('#np-find-status');
          const found = this.findNext(q, matchCase);
          if (status) status.textContent = found ? 'Found match' : 'Cannot find "' + q + '"';
        }
      },
      { label: 'Cancel', action: (modal) => modal.remove() }
    ]);
  }

  showReplaceDialog() {
    this.showModal('Replace', `
      <div class="notepad-modal-row">
        <label>Find what:</label>
        <input type="text" id="np-rep-find" value="${this.escape(this.lastFindQuery)}" />
      </div>
      <div class="notepad-modal-row" style="margin-top:8px;">
        <label>Replace with:</label>
        <input type="text" id="np-rep-val" />
      </div>
      <div class="notepad-modal-row" style="margin-top:8px;">
        <label><input type="checkbox" id="np-rep-case" /> Match case</label>
      </div>
      <div id="np-rep-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    `, [
      {
        label: 'Find Next',
        action: (modal) => {
          const q = modal.querySelector('#np-rep-find').value;
          const matchCase = modal.querySelector('#np-rep-case').checked;
          const status = modal.querySelector('#np-rep-status');
          const found = this.findNext(q, matchCase);
          if (status) status.textContent = found ? 'Match found' : 'No match found';
        }
      },
      {
        label: 'Replace',
        primary: true,
        action: (modal) => {
          const q = modal.querySelector('#np-rep-find').value;
          const rep = modal.querySelector('#np-rep-val').value;
          const matchCase = modal.querySelector('#np-rep-case').checked;
          const textarea = this.container.querySelector('#np-textarea');
          if (!textarea) return;

          const sel = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
          if ((matchCase && sel === q) || (!matchCase && sel.toLowerCase() === q.toLowerCase())) {
            this.insertTextAtCursor(rep);
          }
          this.findNext(q, matchCase);
        }
      },
      {
        label: 'Replace All',
        action: (modal) => {
          const q = modal.querySelector('#np-rep-find').value;
          const rep = modal.querySelector('#np-rep-val').value;
          const matchCase = modal.querySelector('#np-rep-case').checked;
          const textarea = this.container.querySelector('#np-textarea');
          if (!textarea || !q) return;

          const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
          const count = (textarea.value.match(regex) || []).length;
          textarea.value = textarea.value.replace(regex, rep);
          this.updateGutter();
          this.updateStatusBar();
          this.saveNow();
          const status = modal.querySelector('#np-rep-status');
          if (status) status.textContent = `Replaced ${count} occurrence(s).`;
        }
      },
      { label: 'Cancel', action: (modal) => modal.remove() }
    ]);
  }

  findNext(query, matchCase = false) {
    if (!query) return false;
    this.lastFindQuery = query;
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return false;

    const val = textarea.value;
    const searchTarget = matchCase ? val : val.toLowerCase();
    const needle = matchCase ? query : query.toLowerCase();

    let startIndex = textarea.selectionEnd || 0;
    let idx = searchTarget.indexOf(needle, startIndex);

    // Wrap around
    if (idx === -1) {
      idx = searchTarget.indexOf(needle, 0);
    }

    if (idx !== -1) {
      textarea.focus();
      textarea.setSelectionRange(idx, idx + needle.length);
      this.updateStatusBar();
      return true;
    }
    return false;
  }

  showGoToDialog() {
    const textarea = this.container.querySelector('#np-textarea');
    const totalLines = textarea ? textarea.value.split('\n').length : 1;

    this.showModal('Go To Line', `
      <div class="notepad-modal-row">
        <label>Line number (1 - ${totalLines}):</label>
        <input type="number" id="np-goto-input" min="1" max="${totalLines}" value="1" />
      </div>
    `, [
      {
        label: 'Go To',
        primary: true,
        action: (modal) => {
          const line = parseInt(modal.querySelector('#np-goto-input').value, 10);
          if (line >= 1 && line <= totalLines) {
            this.goToLine(line);
            modal.remove();
          }
        }
      },
      { label: 'Cancel', action: (modal) => modal.remove() }
    ]);
  }

  goToLine(targetLine) {
    const textarea = this.container.querySelector('#np-textarea');
    if (!textarea) return;
    const lines = textarea.value.split('\n');
    let pos = 0;
    for (let i = 0; i < targetLine - 1; i++) {
      pos += lines[i].length + 1; // +1 for \n
    }
    textarea.focus();
    textarea.setSelectionRange(pos, pos);
    this.updateStatusBar();
  }

  showFontDialog() {
    this.showModal('Font Settings', `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="notepad-modal-row">
          <label>Font Family:</label>
          <select id="np-font-fam">
            <option value='Consolas, Monaco, "Courier New", monospace'>Consolas / Monospace</option>
            <option value='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'>System Sans-Serif</option>
            <option value='"Courier New", Courier, monospace'>Courier New</option>
            <option value='Georgia, serif'>Georgia / Serif</option>
          </select>
        </div>
        <div class="notepad-modal-row">
          <label>Font Size:</label>
          <select id="np-font-size">
            <option value="11">11 px</option>
            <option value="12">12 px</option>
            <option value="14" selected>14 px</option>
            <option value="16">16 px</option>
            <option value="18">18 px</option>
            <option value="20">20 px</option>
            <option value="24">24 px</option>
          </select>
        </div>
      </div>
      <div class="notepad-modal-row" style="margin-top:10px;">
        <label><input type="checkbox" id="np-font-bold" ${this.fontBold ? 'checked' : ''} /> Bold</label>
        <label style="margin-left:14px;"><input type="checkbox" id="np-font-italic" ${this.fontItalic ? 'checked' : ''} /> Italic</label>
      </div>
      <div style="margin-top:14px;border:1px solid var(--border);padding:12px;border-radius:6px;background:var(--bg-secondary);">
        <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">Sample Preview:</div>
        <div id="np-font-sample" style="font-family:${this.fontFamily};font-size:${this.fontSize}px;">AaBbYyZz 1234567890</div>
      </div>
    `, [
      {
        label: 'Apply',
        primary: true,
        action: (modal) => {
          this.fontFamily = modal.querySelector('#np-font-fam').value;
          this.fontSize = parseInt(modal.querySelector('#np-font-size').value, 10);
          this.fontBold = modal.querySelector('#np-font-bold').checked;
          this.fontItalic = modal.querySelector('#np-font-italic').checked;
          this.applyFontStyles();
          modal.remove();
        }
      },
      { label: 'Cancel', action: (modal) => modal.remove() }
    ]);

    // Dynamic live sample update
    setTimeout(() => {
      const famSelect = document.querySelector('#np-font-fam');
      const sizeSelect = document.querySelector('#np-font-size');
      const boldCheck = document.querySelector('#np-font-bold');
      const italicCheck = document.querySelector('#np-font-italic');
      const sample = document.querySelector('#np-font-sample');

      const updateSample = () => {
        if (!sample) return;
        sample.style.fontFamily = famSelect.value;
        sample.style.fontSize = `${sizeSelect.value}px`;
        sample.style.fontWeight = boldCheck.checked ? 'bold' : 'normal';
        sample.style.fontStyle = italicCheck.checked ? 'italic' : 'normal';
      };

      if (famSelect) famSelect.onchange = updateSample;
      if (sizeSelect) sizeSelect.onchange = updateSample;
      if (boldCheck) boldCheck.onchange = updateSample;
      if (italicCheck) italicCheck.onchange = updateSample;
    }, 50);
  }

  showPageSetupDialog() {
    this.showModal('Page Setup', `
      <div style="font-size:13px;line-height:1.6;color:var(--text-secondary);">
        <p><strong>Paper Size:</strong> Letter / A4</p>
        <p><strong>Orientation:</strong> Portrait</p>
        <p><strong>Margins:</strong> Left: 20mm, Right: 20mm, Top: 25mm, Bottom: 25mm</p>
        <p><strong>Headers & Footers:</strong> NoteTrack Document Title & Page Number</p>
      </div>
    `, [
      { label: 'OK', primary: true, action: (modal) => modal.remove() }
    ]);
  }

  showAboutDialog() {
    this.showModal('About Notepad in NoteTrack', `
      <div style="text-align:center;padding:10px 0;">
        <div style="font-size:36px;margin-bottom:8px;">📝</div>
        <h3 style="margin-bottom:4px;color:var(--text-primary);">NoteTrack Notepad Mode</h3>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Version 1.0.0 (Local-First Offline)</p>
        <p style="font-size:13px;color:var(--text-secondary);max-width:320px;margin:0 auto;line-height:1.5;">
          A lightweight, lightning-fast plain text editor with complete classic Windows Notepad features, instant markdown synchronization, and offline persistence.
        </p>
      </div>
    `, [
      { label: 'Close', primary: true, action: (modal) => modal.remove() }
    ]);
  }

  showModal(title, bodyHtml, buttons = []) {
    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';

    const box = document.createElement('div');
    box.className = 'af-notepad-dialog';

    let btnHtml = '';
    buttons.forEach((b, idx) => {
      btnHtml += `<button class="notepad-dlg-btn ${b.primary ? 'is-primary' : ''}" data-idx="${idx}">${this.escape(b.label)}</button>`;
    });

    box.innerHTML = `
      <div class="notepad-dlg-head">
        <span>${this.escape(title)}</span>
        <button class="notepad-dlg-close">✕</button>
      </div>
      <div class="notepad-dlg-body">
        ${bodyHtml}
      </div>
      <div class="notepad-dlg-foot">
        ${btnHtml}
      </div>
    `;

    box.querySelector('.notepad-dlg-close').onclick = () => backdrop.remove();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };

    box.querySelectorAll('.notepad-dlg-foot button').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (buttons[idx] && buttons[idx].action) {
          buttons[idx].action(backdrop);
        }
      };
    });

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    const firstInput = box.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 60);
  }
}

if (typeof window !== 'undefined') {
  window.NotepadView = NotepadView;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NotepadView };
}
