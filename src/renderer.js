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
  const aiAssistant = new AIAssistant();

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

  // 6. View Switcher (Document vs Database)
  function renderPageView(pageId) {
    const page = store.getPage(pageId);
    if (!page) return;

    shell.setActivePage(pageId);
    const viewContainer = document.getElementById('af-page-view-container');
    if (!viewContainer) return;

    viewContainer.innerHTML = '';

    if (page.type === 'database') {
      currentEditor = null;
      currentDbView = new DatabaseView(viewContainer, {
        store,
        pageId,
        onUpdate: () => shell.updateSidebar()
      });
    } else {
      currentDbView = null;
      currentEditor = new BlockEditor(viewContainer, {
        store,
        pageId,
        isReadOnly: Boolean(page.isLocked),
        onUpdate: () => shell.updateSidebar()
      });
    }
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
