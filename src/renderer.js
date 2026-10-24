// src/renderer.js - Frontend Orchestrator for AppFlowy Lean
'use strict';

(function () {
  // 1. Initialize Reactive Store
  const STORAGE_KEY = 'appflowy_lean_data_v1';
  let initialData = null;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) initialData = JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read saved workspace from localStorage:', e);
  }

  const store = new AppFlowyStore(initialData);

  // Auto-save to localStorage on every change
  store.subscribe((data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Auto-save failed:', e);
    }
  });

  // 2. State & Component Instances
  let currentEditor = null;
  let currentDbView = null;
  let currentNotepadView = null;
  const activeEditorModes = {}; // pageId -> 'rich' | 'notepad'
  const aiAssistant = new AIAssistant();

  window.toggleNotepadMode = function(pageId) {
    const targetId = pageId || (shell && shell.activePageId);
    if (!targetId) return;
    activeEditorModes[targetId] = activeEditorModes[targetId] === 'notepad' ? 'rich' : 'notepad';
    renderPageView(targetId);
    if (shell) shell.updateHeader();
  };

  const appRoot = document.getElementById('app');

  // 3. Mount Shell
  const shell = new AppShell({
    container: appRoot,
    store,
    onPageSelect: (pageId) => renderPageView(pageId),
    onOpenAI: () => toggleAIDrawer(),
    onOpenPalette: () => palette.toggle(),
    onOpenSettings: () => settingsModal.show(),
    onExportPage: (page) => handleExport(page)
  });

  shell.initLayout();

  // 4. Command Palette
  const palette = new CommandPalette({
    store,
    onSelectPage: (pageId) => {
      shell.setActivePage(pageId);
      renderPageView(pageId);
    },
    onAction: (act) => {
      switch (act) {
        case 'new-doc': {
          const p = store.createPage({ spaceId: shell.activeSpaceId, title: 'Untitled Document', type: 'document' });
          shell.setActivePage(p.id);
          renderPageView(p.id);
          break;
        }
        case 'new-notepad': {
          const p = store.createPage({ spaceId: shell.activeSpaceId, title: 'Untitled Note', type: 'notepad', icon: '📝' });
          shell.setActivePage(p.id);
          renderPageView(p.id);
          break;
        }
        case 'new-db': {
          const p = store.createPage({ spaceId: shell.activeSpaceId, title: 'Untitled Database', type: 'database', icon: '📊' });
          shell.setActivePage(p.id);
          renderPageView(p.id);
          break;
        }
        case 'open-ai':
          toggleAIDrawer(true);
          break;
        case 'toggle-theme':
          toggleTheme();
          break;
        case 'open-trash':
          shell.showTrashModal();
          break;
        case 'export-md': {
          const curr = store.getPage(shell.activePageId);
          if (curr) handleExport(curr);
          break;
        }
        case 'import-md':
          handleImportMarkdown();
          break;
      }
    }
  });

  // 5. Settings Modal
  const settingsModal = new SettingsModal({
    store,
    onThemeChange: (theme) => applyTheme(theme),
    onAccentChange: (color) => applyAccent(color)
  });

  // 6. View Switcher (Document vs Database vs Folder vs Notepad)
  function renderPageView(pageId) {
    const page = store.getPage(pageId);
    if (!page) return;

    shell.setActivePage(pageId);
    const viewContainer = document.getElementById('af-page-view-container');
    if (!viewContainer) return;

    viewContainer.innerHTML = '';

    if (page.type === 'database') {
      currentEditor = null;
      currentNotepadView = null;
      currentDbView = new DatabaseView(viewContainer, {
        store,
        pageId,
        onUpdate: () => shell.updateSidebar()
      });
    } else if (page.type === 'folder') {
      currentEditor = null;
      currentDbView = null;
      currentNotepadView = null;
      renderFolderView(viewContainer, pageId);
    } else if (page.type === 'notepad' || activeEditorModes[pageId] === 'notepad') {
      currentEditor = null;
      currentDbView = null;
      currentNotepadView = new NotepadView(viewContainer, {
        store,
        pageId,
        onUpdate: () => shell.updateSidebar(),
        onModeSwitch: (mode) => {
          activeEditorModes[pageId] = mode;
          renderPageView(pageId);
          shell.updateHeader();
        }
      });
    } else {
      currentDbView = null;
      currentNotepadView = null;
      currentEditor = new BlockEditor(viewContainer, {
        store,
        pageId,
        isReadOnly: Boolean(page.isLocked),
        onUpdate: () => shell.updateSidebar()
      });
    }
  }

  function renderFolderView(container, pageId) {
    const page = store.getPage(pageId);
    if (!page) return;
    const contents = store.getFolderContents(pageId);
    const esc = (s) => (window.escapeHTML ? window.escapeHTML(s) : (s || ''));

    const folderWrap = document.createElement('div');
    folderWrap.className = 'af-folder-workspace';

    folderWrap.innerHTML = `
      <div class="folder-header-hero">
        <div class="folder-big-icon">${esc(page.icon || '📁')}</div>
        <div class="folder-header-info">
          <h1 class="folder-title" contenteditable="true" spellcheck="false">${esc(page.title || 'Untitled Folder')}</h1>
          <div class="folder-meta-row">
            <span class="folder-pill">📁 FOLDER</span>
            <span class="folder-count">${contents.length} ${contents.length === 1 ? 'item' : 'items'}</span>
            <span class="folder-date">Updated ${new Date(page.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div class="folder-actions-row">
        <button class="btn-folder-action" id="btn-fld-new-doc">+ 📄 Document</button>
        <button class="btn-folder-action" id="btn-fld-new-np">+ 📝 Notepad</button>
        <button class="btn-folder-action" id="btn-fld-new-db">+ 📊 Database</button>
        <button class="btn-folder-action" id="btn-fld-new-sub">+ 📁 Subfolder</button>
        <button class="btn-folder-action" id="btn-fld-upload">+ 📎 Upload File</button>
        <input type="file" id="fld-file-picker" style="display:none;" />
      </div>

      <div class="folder-grid">
        ${contents.length === 0 ? `
          <div class="folder-empty-state">
            <div class="empty-folder-art">📂</div>
            <h3>This folder is currently empty</h3>
            <p>Create documents, plain text notes, databases, subfolders, or upload any file format into this folder.</p>
          </div>
        ` : contents.map(child => `
          <div class="folder-item-card" data-id="${child.id}">
            <div class="folder-item-top">
              <span class="folder-item-icon">${esc(child.icon || (child.type === 'folder' ? '📁' : (child.type === 'database' ? '📊' : (child.type === 'notepad' ? '📝' : '📄'))))}</span>
              <span class="folder-item-badge ${child.type}">${esc(child.type.toUpperCase())}</span>
            </div>
            <div class="folder-item-title">${esc(child.title || 'Untitled')}</div>
            <div class="folder-item-bottom">
              <span class="folder-item-date">${new Date(child.updatedAt).toLocaleDateString()}</span>
              <button class="btn-del-folder-item" data-id="${child.id}" title="Move to Trash">✕</button>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="folder-dropzone" id="folder-dropzone">
        <span class="folder-drop-icon">📥</span>
        <div class="folder-drop-text">
          <strong>Drag & Drop files into this folder</strong>
          <span>Accepts all extensions: PDF, Word, Excel, PowerPoint, ZIP, Code, & media</span>
        </div>
      </div>
    `;

    const titleEl = folderWrap.querySelector('.folder-title');
    titleEl.onblur = () => {
      const newTitle = titleEl.textContent.trim() || 'Untitled Folder';
      store.updatePage(pageId, { title: newTitle });
      shell.updateSidebar();
      shell.updateTabs();
    };

    folderWrap.querySelector('#btn-fld-new-doc').onclick = () => {
      const p = store.createPage({ spaceId: page.spaceId, parentId: pageId, title: 'Untitled Document', type: 'document' });
      renderPageView(p.id);
    };

    folderWrap.querySelector('#btn-fld-new-np').onclick = () => {
      const p = store.createPage({ spaceId: page.spaceId, parentId: pageId, title: 'Untitled Note', type: 'notepad', icon: '📝' });
      renderPageView(p.id);
    };

    folderWrap.querySelector('#btn-fld-new-db').onclick = () => {
      const p = store.createPage({ spaceId: page.spaceId, parentId: pageId, title: 'Untitled Database', type: 'database', icon: '📊' });
      renderPageView(p.id);
    };

    folderWrap.querySelector('#btn-fld-new-sub').onclick = () => {
      const p = store.createFolder({ spaceId: page.spaceId, parentId: pageId, title: 'New Subfolder' });
      renderPageView(p.id);
    };

    const filePicker = folderWrap.querySelector('#fld-file-picker');
    folderWrap.querySelector('#btn-fld-upload').onclick = () => filePicker.click();

    const addFileToFolder = (file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type.includes('pdf');
        const fileBlock = {
          id: 'b-' + Math.random().toString(36).slice(2, 8),
          type: isPdf ? 'pdf' : 'file',
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          url: reader.result,
          updatedAt: Date.now()
        };
        const newDoc = store.createPage({
          spaceId: page.spaceId,
          parentId: pageId,
          title: file.name,
          icon: isPdf ? '📕' : '📎',
          type: 'document'
        });
        store.setBlocks(newDoc.id, [
          { id: 'b-h1', type: 'heading', level: 1, text: file.name },
          fileBlock
        ]);
        renderFolderView(container, pageId);
      };
      reader.readAsDataURL(file);
    };

    filePicker.onchange = (e) => {
      if (e.target.files && e.target.files[0]) addFileToFolder(e.target.files[0]);
    };

    const dropzone = folderWrap.querySelector('#folder-dropzone');
    dropzone.ondragover = (e) => {
      e.preventDefault();
      dropzone.classList.add('is-dragging');
    };
    dropzone.ondragleave = (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragging');
    };
    dropzone.ondrop = (e) => {
      e.preventDefault();
      dropzone.classList.remove('is-dragging');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        addFileToFolder(e.dataTransfer.files[0]);
      }
    };

    folderWrap.querySelectorAll('.folder-item-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.btn-del-folder-item')) return;
        renderPageView(card.dataset.id);
      };
    });

    folderWrap.querySelectorAll('.btn-del-folder-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        store.deletePage(btn.dataset.id);
        renderFolderView(container, pageId);
        shell.updateSidebar();
      };
    });

    container.appendChild(folderWrap);
  }

  // 7. AI Assistant Drawer
  function toggleAIDrawer(forceOpen = null) {
    const drawer = document.getElementById('af-ai-drawer');
    if (!drawer) return;

    const shouldOpen = forceOpen !== null ? forceOpen : !drawer.classList.contains('is-open');
    drawer.classList.toggle('is-open', shouldOpen);

    if (shouldOpen) {
      renderAIDrawerContent();
    }
  }

  function renderAIDrawerContent() {
    const drawer = document.getElementById('af-ai-drawer');
    if (!drawer) return;

    drawer.innerHTML = `
      <div class="ai-drawer-head">
        <span>✨ NoteTrack AI</span>
        <button class="modal-close-btn" id="btn-close-ai">✕</button>
      </div>
      <div class="ai-templates-list" id="ai-templates-strip"></div>
      <div class="ai-chat-stream" id="ai-chat-stream">
        <div class="ai-msg assistant">
          Hello! I am your local AI pair programmer & productivity companion. Pick a built-in template or ask me anything!
        </div>
      </div>
      <div class="ai-input-bar">
        <input type="text" class="ai-text-input" id="ai-user-prompt" placeholder="Ask AI anything..." />
        <button class="ai-send-btn" id="ai-send-btn">Send</button>
      </div>
    `;

    drawer.querySelector('#btn-close-ai').onclick = () => toggleAIDrawer(false);

    // Render 10 AppFlowy prompt templates
    const templatesStrip = drawer.querySelector('#ai-templates-strip');
    aiAssistant.getTemplates().forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'ai-temp-chip';
      chip.innerHTML = `${t.icon} ${t.name}`;
      chip.onclick = () => {
        sendAIMessage(t.example || t.content, t.id);
      };
      templatesStrip.appendChild(chip);
    });

    const input = drawer.querySelector('#ai-user-prompt');
    const sendBtn = drawer.querySelector('#ai-send-btn');

    const handleSend = () => {
      const q = input.value.trim();
      if (!q) return;
      input.value = '';
      sendAIMessage(q);
    };

    sendBtn.onclick = handleSend;
    input.onkeydown = (e) => {
      if (e.key === 'Enter') handleSend();
    };
  }

  async function sendAIMessage(promptText, templateId = null) {
    const stream = document.getElementById('ai-chat-stream');
    if (!stream) return;

    // Append user bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'ai-msg user';
    userBubble.textContent = promptText;
    stream.appendChild(userBubble);
    stream.scrollTop = stream.scrollHeight;

    // Current page context
    const currPage = store.getPage(shell.activePageId);
    let contextText = '';
    if (currPage && currPage.blocks) {
      contextText = currPage.blocks.map(b => b.text || '').join('\n');
    }

    // Call AI Assistant
    const res = await aiAssistant.ask({
      prompt: promptText,
      contextText,
      templateId
    });

    // Append assistant bubble
    const assistantBubble = document.createElement('div');
    assistantBubble.className = 'ai-msg assistant';

    const textDiv = document.createElement('div');
    textDiv.innerHTML = res.text.replace(/\n/g, '<br/>');
    assistantBubble.appendChild(textDiv);

    // Insert to document action
    const insertBtn = document.createElement('button');
    insertBtn.className = 'quick-btn';
    insertBtn.style.marginTop = '8px';
    insertBtn.innerHTML = '+ Insert into current page';
    insertBtn.onclick = () => {
      if (currPage && currPage.type === 'document' && !currPage.isLocked) {
        store.insertBlock(currPage.id, { type: 'callout', icon: '✨', text: res.text });
        renderPageView(currPage.id);
        insertBtn.textContent = '✓ Inserted!';
      }
    };
    assistantBubble.appendChild(insertBtn);

    stream.appendChild(assistantBubble);
    stream.scrollTop = stream.scrollHeight;
  }

  // 8. Import & Export Handlers
  function handleExport(page) {
    if (page.type === 'database') {
      const db = store.getDatabase(page.id);
      const csv = databaseToCSV(db);
      downloadBlob(csv, `${page.title || 'database'}.csv`, 'text/csv');
    } else {
      const md = pageToMarkdown(page);
      downloadBlob(md, `${page.title || 'document'}.md`, 'text/markdown');
    }
  }

  function handleImportMarkdown() {
    const text = prompt('Paste Markdown content to import as a new document:');
    if (!text || !text.trim()) return;

    const blocks = markdownToBlocks(text);
    const newPage = store.createPage({
      spaceId: shell.activeSpaceId,
      title: 'Imported Document',
      type: 'document'
    });
    store.setBlocks(newPage.id, blocks);
    shell.setActivePage(newPage.id);
    renderPageView(newPage.id);
  }

  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 9. Theme Management
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('appflowy_lean_theme', theme);
  }

  function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme') || 'dark';
    applyTheme(curr === 'dark' ? 'light' : 'dark');
  }

  function applyAccent(color) {
    document.documentElement.style.setProperty('--accent-color', color);
    localStorage.setItem('appflowy_lean_accent', color);
  }

  // Restore saved theme
  const savedTheme = localStorage.getItem('appflowy_lean_theme') || 'dark';
  applyTheme(savedTheme);
  const savedAccent = localStorage.getItem('appflowy_lean_accent');
  if (savedAccent) applyAccent(savedAccent);

  // 10. Initial Page Render
  renderPageView('page-welcome');

  // Smoke test hook for automated verification
  window.__APPFLOWY_LEAN__ = {
    store,
    shell,
    aiAssistant,
    palette,
    renderPageView
  };
})();
