// src/components/shell.js - App Shell (Sidebar, Tabs, Breadcrumbs, Cover, Header)
'use strict';

class AppShell {
  constructor(options = {}) {
    this.store = options.store;
    this.container = options.container;
    this.onPageSelect = options.onPageSelect || (() => {});
    this.onOpenAI = options.onOpenAI || (() => {});
    this.onOpenPalette = options.onOpenPalette || (() => {});
    this.onOpenSettings = options.onOpenSettings || (() => {});
    this.onExportPage = options.onExportPage || (() => {});
    this.onImportFile = options.onImportFile || (() => {});

    this.activeSpaceId = 'space-personal';
    this.activePageId = 'page-welcome';
    this.openTabs = ['page-welcome', 'page-tasks'];
    this.collapsedNodes = new Set();

    this.store.subscribe(() => this.updateSidebar());
  }

  setActivePage(pageId) {
    this.activePageId = pageId;
    if (!this.openTabs.includes(pageId)) {
      this.openTabs.push(pageId);
    }
    const page = this.store.getPage(pageId);
    if (page && page.spaceId) {
      this.activeSpaceId = page.spaceId;
    }
    this.updateTabs();
    this.updateSidebar();
    this.updateHeader();
  }

  closeTab(pageId) {
    const idx = this.openTabs.indexOf(pageId);
    if (idx !== -1) {
      this.openTabs.splice(idx, 1);
      if (this.activePageId === pageId) {
        const nextId = this.openTabs[Math.max(0, idx - 1)] || Object.keys(this.store.data.pages)[0];
        if (nextId) this.onPageSelect(nextId);
      }
      this.updateTabs();
    }
  }

  // Render initial layout skeleton
  initLayout() {
    this.container.innerHTML = `
      <div class="af-app-layout">
        <aside class="af-sidebar" id="af-sidebar"></aside>
        <main class="af-main-viewport">
          <header class="af-tabs-strip" id="af-tabs-strip"></header>
          <div class="af-breadcrumbs-bar" id="af-breadcrumbs-bar"></div>
          <div class="af-page-scrollable">
            <div class="af-page-header-container" id="af-page-header-container"></div>
            <div class="af-page-view-container" id="af-page-view-container"></div>
          </div>
        </main>
        <aside class="af-ai-drawer" id="af-ai-drawer"></aside>
      </div>
    `;

    this.updateSidebar();
    this.updateTabs();
    this.updateHeader();
  }

  // 1. SIDEBAR
  updateSidebar() {
    const sidebar = document.getElementById('af-sidebar');
    if (!sidebar) return;

    const ws = this.store.getWorkspace();
    const spaces = this.store.getSpaces();
    const favorites = this.store.getFavoritePages();
    const trash = this.store.getTrashPages();

    sidebar.innerHTML = '';

    // Workspace branding header
    const wsHeader = document.createElement('div');
    wsHeader.className = 'sidebar-ws-header';
    wsHeader.innerHTML = `
      <div class="ws-info">
        <span class="ws-logo">⚡</span>
        <span class="ws-name">${ws.name || 'AppFlowy Lean'}</span>
      </div>
      <button class="ws-settings-btn" title="Settings">⚙️</button>
    `;
    wsHeader.querySelector('.ws-settings-btn').onclick = () => this.onOpenSettings();
    sidebar.appendChild(wsHeader);

    // Quick Actions: Search (Cmd+K) & Ask AI
    const quickBar = document.createElement('div');
    quickBar.className = 'sidebar-quick-bar';
    quickBar.innerHTML = `
      <button class="quick-btn" id="sb-search-btn">🔍 Search <kbd>⌘K</kbd></button>
      <button class="quick-btn" id="sb-ai-btn">✨ AppFlowy AI</button>
    `;
    quickBar.querySelector('#sb-search-btn').onclick = () => this.onOpenPalette();
    quickBar.querySelector('#sb-ai-btn').onclick = () => this.onOpenAI();
    sidebar.appendChild(quickBar);

    // Spaces Switcher Tabs (Personal / Work / Private)
    const spaceTabs = document.createElement('div');
    spaceTabs.className = 'sidebar-space-tabs';
    spaces.forEach(sp => {
      const tab = document.createElement('button');
      tab.className = 'space-tab' + (sp.id === this.activeSpaceId ? ' is-active' : '');
      tab.innerHTML = `<span class="sp-icon">${sp.icon || '📁'}</span> <span>${sp.name}</span>`;
      tab.onclick = () => {
        this.activeSpaceId = sp.id;
        this.updateSidebar();
      };
      spaceTabs.appendChild(tab);
    });
    sidebar.appendChild(spaceTabs);

    // Favorites Accordion
    if (favorites.length > 0) {
      const favSection = document.createElement('div');
      favSection.className = 'sidebar-section';
      favSection.innerHTML = '<div class="sidebar-section-title">⭐ Favorites</div>';
      const favList = document.createElement('div');
      favList.className = 'sidebar-tree';

      favorites.forEach(p => {
        const item = document.createElement('div');
        item.className = 'tree-item' + (p.id === this.activePageId ? ' is-active' : '');
        item.innerHTML = `<span class="item-icon">${p.icon || '📄'}</span> <span class="item-title">${p.title}</span>`;
        item.onclick = () => this.onPageSelect(p.id);
        favList.appendChild(item);
      });

      favSection.appendChild(favList);
      sidebar.appendChild(favSection);
    }

    // Pages Tree for Active Space
    const pagesSection = document.createElement('div');
    pagesSection.className = 'sidebar-section sidebar-pages-section';
    pagesSection.innerHTML = `
      <div class="sidebar-section-title">
        <span>Pages</span>
        <button class="section-add-btn" id="btn-add-root-page" title="New Page">+</button>
      </div>
    `;
    pagesSection.querySelector('#btn-add-root-page').onclick = () => {
      const newP = this.store.createPage({ spaceId: this.activeSpaceId, title: 'Untitled Page' });
      this.onPageSelect(newP.id);
    };

    const treeContainer = document.createElement('div');
    treeContainer.className = 'sidebar-tree';

    const treeData = this.store.getPageTree(this.activeSpaceId);
    this.renderTreeNodes(treeContainer, treeData, 0);
    pagesSection.appendChild(treeContainer);
    sidebar.appendChild(pagesSection);

    // Bottom Tools: Trash & Add Page
    const bottomTools = document.createElement('div');
    bottomTools.className = 'sidebar-bottom-tools';
    bottomTools.innerHTML = `
      <button class="sb-tool-btn" id="sb-trash-btn">
        <span>🗑️ Trash</span>
        ${trash.length > 0 ? `<span class="trash-badge">${trash.length}</span>` : ''}
      </button>
      <button class="sb-tool-btn" id="sb-new-doc-btn">+ New Page</button>
    `;

    bottomTools.querySelector('#sb-trash-btn').onclick = () => this.showTrashModal();
    bottomTools.querySelector('#sb-new-doc-btn').onclick = () => {
      const p = this.store.createPage({ spaceId: this.activeSpaceId, title: 'Untitled' });
      this.onPageSelect(p.id);
    };

    sidebar.appendChild(bottomTools);
  }

  renderTreeNodes(container, nodes, depth = 0) {
    nodes.forEach(node => {
      const hasChildren = node.children && node.children.length > 0;
      const isCollapsed = this.collapsedNodes.has(node.id);

      const row = document.createElement('div');
      row.className = 'tree-item' + (node.id === this.activePageId ? ' is-active' : '');
      row.style.paddingLeft = `${12 + depth * 16}px`;

      // Expand arrow
      const arrow = document.createElement('span');
      arrow.className = 'tree-arrow' + (hasChildren ? '' : ' is-invisible');
      arrow.textContent = isCollapsed ? '▶' : '▼';
      arrow.onclick = (e) => {
        e.stopPropagation();
        if (this.collapsedNodes.has(node.id)) this.collapsedNodes.delete(node.id);
        else this.collapsedNodes.add(node.id);
        this.updateSidebar();
      };

      const icon = document.createElement('span');
      icon.className = 'item-icon';
      icon.textContent = node.icon || (node.type === 'database' ? '📊' : '📄');

      const title = document.createElement('span');
      title.className = 'item-title';
      title.textContent = node.title || 'Untitled';

      // Item Actions (+ subpage, ...)
      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const addSubBtn = document.createElement('button');
      addSubBtn.className = 'item-act-btn';
      addSubBtn.innerHTML = '+';
      addSubBtn.title = 'Add sub-page';
      addSubBtn.onclick = (e) => {
        e.stopPropagation();
        const child = this.store.createPage({ spaceId: this.activeSpaceId, parentId: node.id, title: 'Untitled Sub-page' });
        this.collapsedNodes.delete(node.id);
        this.onPageSelect(child.id);
      };

      const moreBtn = document.createElement('button');
      moreBtn.className = 'item-act-btn';
      moreBtn.innerHTML = '⋯';
      moreBtn.title = 'Page options';
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        this.showPageContextMenu(e, node);
      };

      actions.appendChild(addSubBtn);
      actions.appendChild(moreBtn);

      row.appendChild(arrow);
      row.appendChild(icon);
      row.appendChild(title);
      row.appendChild(actions);

      row.onclick = () => this.onPageSelect(node.id);
      container.appendChild(row);

      // Render children if expanded
      if (hasChildren && !isCollapsed) {
        this.renderTreeNodes(container, node.children, depth + 1);
      }
    });
  }

  // 2. MULTI-TAB STRIP
  updateTabs() {
    const strip = document.getElementById('af-tabs-strip');
    if (!strip) return;

    strip.innerHTML = '';
    const tabsList = document.createElement('div');
    tabsList.className = 'tabs-list';

    this.openTabs.forEach(pageId => {
      const page = this.store.getPage(pageId);
      if (!page) return;

      const tab = document.createElement('div');
      tab.className = 'tab-item' + (pageId === this.activePageId ? ' is-active' : '');

      tab.innerHTML = `
        <span class="tab-icon">${page.icon || (page.type === 'database' ? '📊' : '📄')}</span>
        <span class="tab-title">${page.title || 'Untitled'}</span>
        <button class="tab-close-btn" title="Close Tab">✕</button>
      `;

      tab.onclick = () => this.onPageSelect(pageId);
      tab.querySelector('.tab-close-btn').onclick = (e) => {
        e.stopPropagation();
        this.closeTab(pageId);
      };

      tabsList.appendChild(tab);
    });

    const addTabBtn = document.createElement('button');
    addTabBtn.className = 'new-tab-btn';
    addTabBtn.innerHTML = '+';
    addTabBtn.title = 'New Tab';
    addTabBtn.onclick = () => {
      const p = this.store.createPage({ spaceId: this.activeSpaceId, title: 'Untitled' });
      this.onPageSelect(p.id);
    };

    strip.appendChild(tabsList);
    strip.appendChild(addTabBtn);
  }

  // 3. BREADCRUMBS & HEADER
  updateHeader() {
    const page = this.store.getPage(this.activePageId);
    if (!page) return;

    // Breadcrumbs
    const breadcrumbs = document.getElementById('af-breadcrumbs-bar');
    if (breadcrumbs) {
      const trail = [];
      let curr = page;
      while (curr) {
        trail.unshift(curr);
        curr = curr.parentId ? this.store.getPage(curr.parentId) : null;
      }
      breadcrumbs.innerHTML = `
        <span class="bc-space">${this.activeSpaceId.replace('space-', '')}</span>
        ${trail.map((p, idx) => `
          <span class="bc-sep">/</span>
          <span class="bc-item ${idx === trail.length - 1 ? 'is-current' : ''}" data-id="${p.id}">${p.title}</span>
        `).join('')}
      `;
      breadcrumbs.querySelectorAll('.bc-item').forEach(el => {
        el.onclick = () => this.onPageSelect(el.dataset.id);
      });
    }

    // Page Header (Cover + Icon + Title + Actions)
    const headerContainer = document.getElementById('af-page-header-container');
    if (!headerContainer) return;

    headerContainer.innerHTML = '';
    const headerWrap = document.createElement('div');
    headerWrap.className = 'af-page-header';

    // Cover Image Banner
    if (page.cover) {
      const cover = document.createElement('div');
      cover.className = 'page-cover-banner';
      cover.style.background = page.cover;
      const changeCoverBtn = document.createElement('button');
      changeCoverBtn.className = 'change-cover-btn';
      changeCoverBtn.textContent = 'Change Cover';
      changeCoverBtn.onclick = () => this.showCoverPicker(page);
      cover.appendChild(changeCoverBtn);
      headerWrap.appendChild(cover);
    }

    // Page Title Row & Action Buttons
    const metaRow = document.createElement('div');
    metaRow.className = 'page-meta-row';

    // Icon button
    const iconBtn = document.createElement('button');
    iconBtn.className = 'page-icon-btn';
    iconBtn.textContent = page.icon || '📄';
    iconBtn.title = 'Change Icon';
    iconBtn.onclick = () => this.showEmojiPicker(page);

    // Title input
    const titleInput = document.createElement('h1');
    titleInput.className = 'page-title-input';
    titleInput.contentEditable = !page.isLocked ? 'true' : 'false';
    titleInput.textContent = page.title || 'Untitled';
    titleInput.onblur = () => {
      this.store.updatePage(page.id, { title: titleInput.textContent.trim() });
      this.updateSidebar();
      this.updateTabs();
    };

    // Actions
    const actionGroup = document.createElement('div');
    actionGroup.className = 'page-actions-group';

    const favBtn = document.createElement('button');
    favBtn.className = 'page-act-icon-btn' + (page.isFavorite ? ' is-favorite' : '');
    favBtn.innerHTML = page.isFavorite ? '★' : '☆';
    favBtn.title = page.isFavorite ? 'Remove Favorite' : 'Add to Favorites';
    favBtn.onclick = () => {
      this.store.toggleFavorite(page.id);
      this.updateHeader();
    };

    const lockBtn = document.createElement('button');
    lockBtn.className = 'page-act-icon-btn' + (page.isLocked ? ' is-locked' : '');
    lockBtn.innerHTML = page.isLocked ? '🔒' : '🔓';
    lockBtn.title = page.isLocked ? 'Page is locked (Read Only)' : 'Lock page';
    lockBtn.onclick = () => {
      this.store.toggleLock(page.id);
      this.onPageSelect(page.id);
    };

    const exportBtn = document.createElement('button');
    exportBtn.className = 'page-act-icon-btn';
    exportBtn.innerHTML = '📥';
    exportBtn.title = 'Export (Markdown / CSV)';
    exportBtn.onclick = () => this.onExportPage(page);

    const aiBtn = document.createElement('button');
    aiBtn.className = 'page-act-icon-btn';
    aiBtn.innerHTML = '✨';
    aiBtn.title = 'Ask AI about this page';
    aiBtn.onclick = () => this.onOpenAI();

    actionGroup.appendChild(favBtn);
    actionGroup.appendChild(lockBtn);
    actionGroup.appendChild(exportBtn);
    actionGroup.appendChild(aiBtn);

    metaRow.appendChild(iconBtn);
    metaRow.appendChild(titleInput);
    metaRow.appendChild(actionGroup);

    headerWrap.appendChild(metaRow);

    // Cover toggle if not present
    if (!page.cover) {
      const addCoverHint = document.createElement('button');
      addCoverHint.className = 'add-cover-link';
      addCoverHint.textContent = '+ Add Cover';
      addCoverHint.onclick = () => this.showCoverPicker(page);
      headerWrap.appendChild(addCoverHint);
    }

    headerContainer.appendChild(headerWrap);
  }

  showEmojiPicker(page) {
    const emojis = ['📄', '⚡', '📊', '💡', '🚀', '🔥', '🎯', '✨', '📚', '💼', '📌', '🛠️', '🎨', '📝', '🔒', '💻'];
    const chosen = prompt('Choose or enter an emoji icon:\n' + emojis.join(' '), page.icon || '📄');
    if (chosen) {
      this.store.updatePage(page.id, { icon: chosen.trim() });
      this.updateHeader();
      this.updateSidebar();
      this.updateTabs();
    }
  }

  showCoverPicker(page) {
    const presets = [
      'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
      'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
      'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
      'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
    ];
    const pick = prompt('Select cover gradient (1-5) or enter CSS gradient/image URL:\n1: Indigo/Violet\n2: Sky/Emerald\n3: Amber/Red\n4: Rose/Purple\n5: Dark Slate', '1');
    if (pick) {
      const num = parseInt(pick, 10);
      const chosen = (num >= 1 && num <= 5) ? presets[num - 1] : pick;
      this.store.updatePage(page.id, { cover: chosen });
      this.updateHeader();
    }
  }

  showPageContextMenu(e, node) {
    const existing = document.getElementById('af-page-ctx-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'af-context-menu';
    menu.id = 'af-page-ctx-menu';
    menu.style.position = 'fixed';
    menu.style.top = `${e.clientY + 4}px`;
    menu.style.left = `${e.clientX + 4}px`;

    const items = [
      {
        label: node.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
        icon: '⭐',
        action: () => {
          this.store.toggleFavorite(node.id);
          this.updateSidebar();
        }
      },
      {
        label: node.isLocked ? 'Unlock Page' : 'Lock Page',
        icon: '🔒',
        action: () => {
          this.store.toggleLock(node.id);
          this.onPageSelect(node.id);
        }
      },
      {
        label: 'Move to Trash',
        icon: '🗑️',
        action: () => {
          this.store.deletePage(node.id);
          if (this.activePageId === node.id) {
            const next = Object.keys(this.store.data.pages).find(id => !this.store.data.pages[id].inTrash);
            if (next) this.onPageSelect(next);
          }
          this.updateSidebar();
          this.updateTabs();
        }
      }
    ];

    items.forEach(it => {
      const btn = document.createElement('div');
      btn.className = 'ctx-item';
      btn.innerHTML = `<span>${it.icon}</span> <span>${it.label}</span>`;
      btn.onclick = () => {
        menu.remove();
        it.action();
      };
      menu.appendChild(btn);
    });

    document.body.appendChild(menu);
    const dismiss = (ev) => {
      if (!menu.contains(ev.target)) {
        menu.remove();
        document.removeEventListener('click', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('click', dismiss), 50);
  }

  showTrashModal() {
    const existing = document.getElementById('af-trash-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-trash-modal';

    const box = document.createElement('div');
    box.className = 'af-trash-box';

    const head = document.createElement('div');
    head.className = 'trash-head';
    head.innerHTML = `
      <h2>🗑️ Trash & Deleted Pages</h2>
      <button class="modal-close-btn">✕</button>
    `;
    head.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    box.appendChild(head);

    const list = document.createElement('div');
    list.className = 'trash-list';

    const trashPages = this.store.getTrashPages();
    if (trashPages.length === 0) {
      list.innerHTML = '<div class="trash-empty">Trash is empty</div>';
    } else {
      trashPages.forEach(p => {
        const item = document.createElement('div');
        item.className = 'trash-item';
        item.innerHTML = `
          <div class="trash-item-info">
            <span class="trash-icon">${p.icon || '📄'}</span>
            <span class="trash-title">${p.title}</span>
          </div>
          <div class="trash-item-actions">
            <button class="btn-restore" data-id="${p.id}">Restore</button>
            <button class="btn-purge" data-id="${p.id}">Delete Forever</button>
          </div>
        `;

        item.querySelector('.btn-restore').onclick = () => {
          this.store.restorePage(p.id);
          backdrop.remove();
          this.showTrashModal();
          this.updateSidebar();
        };

        item.querySelector('.btn-purge').onclick = () => {
          if (confirm(`Permanently delete "${p.title}"?`)) {
            this.store.permanentlyDeletePage(p.id);
            backdrop.remove();
            this.showTrashModal();
            this.updateSidebar();
          }
        };

        list.appendChild(item);
      });
    }

    box.appendChild(list);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AppShell };
}
