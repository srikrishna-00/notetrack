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

    this.initShortcuts();
    this.store.subscribe((data, event) => {
      if (event && (event.type === 'block' || event.type === 'cell')) return;
      this.scheduleSidebarUpdate();
    });
  }

  scheduleSidebarUpdate() {
    if (this._sidebarRaf) return;
    this._sidebarRaf = requestAnimationFrame(() => {
      this._sidebarRaf = null;
      this.updateSidebar();
    });
  }

  escape(str) {
    if (typeof window !== 'undefined' && window.escapeHTML) {
      return window.escapeHTML(str);
    }
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  createModal({ id, className = '', title = '', bodyHtml = '', onInit = null }) {
    if (id) {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    }
    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    if (id) backdrop.id = id;

    const box = document.createElement('div');
    box.className = className;
    box.innerHTML = `
      <div class="modal-head">
        <h2>${this.escape(title)}</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      ${bodyHtml}
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    if (onInit) onInit(box, backdrop);
    return { backdrop, box };
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
    const sidebar = document.getElementById('af-sidebar');
    if (sidebar && typeof window !== 'undefined' && window.innerWidth <= 768) {
      sidebar.classList.remove('is-mobile-open');
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
  // Render initial layout skeleton
  initLayout() {
    this.container.innerHTML = `
      <div class="af-app-layout">
        <!-- Mobile Sidebar Backdrop Overlay -->
        <div class="mobile-sidebar-backdrop" id="mobile-sidebar-backdrop"></div>

        <!-- Android Material Top App Bar (Visible <= 768px) -->
        <header class="mobile-appbar" id="mobile-appbar" style="display:none;"></header>

        <aside class="af-sidebar" id="af-sidebar"></aside>
        <main class="af-main-viewport">
          <!-- Sleek Unified Top Navigation Bar -->
          <header class="af-topbar" id="af-topbar">
            <div class="topbar-left">
              <button class="topbar-btn" id="btn-toggle-sidebar" title="Toggle Sidebar">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
              </button>
              <div class="af-breadcrumbs-bar" id="af-breadcrumbs-bar"></div>
            </div>
            <div class="topbar-center" id="af-tabs-strip" style="display:none;"></div>
            <div class="topbar-right" id="topbar-actions"></div>
          </header>
          <div class="af-page-scrollable" id="af-page-scrollable">
            <div class="af-page-header-container" id="af-page-header-container"></div>
            <div class="af-page-view-container" id="af-page-view-container"></div>
          </div>
          <!-- Mobile Floating Editing Accessory Toolbar -->
          <div class="mobile-editor-toolbar" id="mobile-editor-toolbar" style="display:none;"></div>
        </main>
        <aside class="af-ai-drawer" id="af-ai-drawer"></aside>
        <nav class="mobile-bottom-nav" id="mobile-bottom-nav" style="display:none;"></nav>
      </div>
    `;

    const toggleSidebarBtn = document.getElementById('btn-toggle-sidebar');
    if (toggleSidebarBtn) {
      toggleSidebarBtn.onclick = () => {
        const sb = document.getElementById('af-sidebar');
        if (sb) sb.classList.toggle('is-collapsed');
      };
    }

    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (backdrop) backdrop.onclick = () => this.closeMobileSidebar();

    this.updateSidebar();
    this.updateTabs();
    this.updateHeader();
    this.renderMobileBottomBar();
  }

  toggleMobileSidebar() {
    const sidebar = document.getElementById('af-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (sidebar) sidebar.classList.toggle('is-mobile-open');
    if (backdrop) backdrop.classList.toggle('is-active');
  }

  closeMobileSidebar() {
    const sidebar = document.getElementById('af-sidebar');
    const backdrop = document.getElementById('mobile-sidebar-backdrop');
    if (sidebar) sidebar.classList.remove('is-mobile-open');
    if (backdrop) backdrop.classList.remove('is-active');
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
      <div class="ws-info" id="ws-info-btn">
        <span class="ws-logo">⚡</span>
        <span class="ws-name">${this.escape(ws.name || 'NoteTrack')}</span>
        <span class="ws-chevron">▾</span>
      </div>
      <div class="ws-header-actions">
        <button class="ws-settings-btn" title="Settings">⚙️</button>
        <button class="m-sidebar-close-btn" id="m-sidebar-close-btn" title="Close Drawer">✕</button>
      </div>
    `;
    wsHeader.querySelector('.ws-settings-btn').onclick = () => this.onOpenSettings();
    wsHeader.querySelector('#ws-info-btn').onclick = () => this.onOpenSettings();
    const closeBtn = wsHeader.querySelector('#m-sidebar-close-btn');
    if (closeBtn) closeBtn.onclick = () => this.closeMobileSidebar();
    sidebar.appendChild(wsHeader);

    // Search bar (styled like modern Notion search pill)
    const searchBox = document.createElement('div');
    searchBox.className = 'sidebar-search-box';
    searchBox.id = 'sb-search-btn';
    searchBox.innerHTML = `
      <span class="sb-search-icon">🔍</span>
      <span class="sb-search-label">Search notes...</span>
      <kbd class="sb-kbd">⌘K</kbd>
    `;
    searchBox.onclick = () => this.onOpenPalette();
    sidebar.appendChild(searchBox);

    // Core Quick Navigation
    const navList = document.createElement('div');
    navList.className = 'sidebar-nav-list';
    navList.innerHTML = `
      <button class="sidebar-nav-item" id="sb-ai-btn">
        <span class="nav-item-icon">✨</span>
        <span class="nav-item-label">AI Assistant</span>
      </button>
      <button class="sidebar-nav-item" id="sb-scratch-btn">
        <span class="nav-item-icon">📝</span>
        <span class="nav-item-label">Quick Scratchpad</span>
        <kbd class="sb-kbd">⇧⌘N</kbd>
      </button>
      <button class="sidebar-nav-item" id="sb-remind-btn">
        <span class="nav-item-icon">⏰</span>
        <span class="nav-item-label">Reminders</span>
        <kbd class="sb-kbd">⇧⌘R</kbd>
      </button>
    `;
    navList.querySelector('#sb-ai-btn').onclick = () => this.onOpenAI();
    navList.querySelector('#sb-scratch-btn').onclick = () => this.showScratchpadModal();
    navList.querySelector('#sb-remind-btn').onclick = () => this.showRemindersModal();
    sidebar.appendChild(navList);

    // Spaces Switcher Tabs (Personal / Work / Private)
    const spaceTabs = document.createElement('div');
    spaceTabs.className = 'sidebar-space-tabs';
    spaces.forEach(sp => {
      const tab = document.createElement('button');
      tab.className = 'space-tab' + (sp.id === this.activeSpaceId ? ' is-active' : '');
      tab.innerHTML = `<span>${this.escape(sp.name)}</span>`;
      tab.onclick = () => {
        this.activeSpaceId = sp.id;
        this.updateSidebar();
      };
      spaceTabs.appendChild(tab);
    });
    sidebar.appendChild(spaceTabs);

    // WhatsApp & Telegram Feature: Pinned Notes
    const pinned = Object.values(this.store.data.pages).filter(p => !p.inTrash && p.isPinned);
    if (pinned.length > 0) {
      const pinSection = document.createElement('div');
      pinSection.className = 'sidebar-section sidebar-pinned-section';
      pinSection.innerHTML = '<div class="sidebar-section-title"><span>📌 Pinned</span></div>';
      const pinList = document.createElement('div');
      pinList.className = 'sidebar-tree';
      pinned.forEach(p => {
        const item = document.createElement('div');
        item.className = 'tree-item' + (p.id === this.activePageId ? ' is-active' : '');
        item.innerHTML = `<span class="item-icon">${this.escape(p.icon || '📄')}</span> <span class="item-title">${this.escape(p.title)}</span>`;
        item.onclick = () => this.onPageSelect(p.id);
        pinList.appendChild(item);
      });
      pinSection.appendChild(pinList);
      sidebar.appendChild(pinSection);
    }

    // Favorites Accordion
    if (favorites.length > 0) {
      const favSection = document.createElement('div');
      favSection.className = 'sidebar-section';
      favSection.innerHTML = '<div class="sidebar-section-title"><span>⭐ Favorites</span></div>';
      const favList = document.createElement('div');
      favList.className = 'sidebar-tree';

      favorites.forEach(p => {
        const item = document.createElement('div');
        item.className = 'tree-item' + (p.id === this.activePageId ? ' is-active' : '');
        item.innerHTML = `<span class="item-icon">${this.escape(p.icon || '📄')}</span> <span class="item-title">${this.escape(p.title)}</span>`;
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
        <div class="section-actions" style="display:flex;gap:4px;">
          <button class="section-add-btn" id="btn-add-folder" title="New Folder">📁+</button>
          <button class="section-add-btn" id="btn-add-root-page" title="New Page">+</button>
        </div>
      </div>
    `;
    pagesSection.querySelector('#btn-add-folder').onclick = () => {
      const fld = this.store.createFolder({ spaceId: this.activeSpaceId, title: 'New Folder' });
      this.onPageSelect(fld.id);
    };
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

    // Evernote Feature: Global Tags Section in Sidebar
    const allTags = this.store.getAllTags ? this.store.getAllTags() : [];
    if (allTags.length > 0) {
      const tagsSection = document.createElement('div');
      tagsSection.className = 'sidebar-section sidebar-tags-section';
      tagsSection.innerHTML = '<div class="sidebar-section-title"><span>🏷️ Tags</span></div>';
      const tagsList = document.createElement('div');
      tagsList.className = 'sidebar-tree';
      allTags.forEach(({ tag, count }) => {
        const tagItem = document.createElement('div');
        tagItem.className = 'tree-item tag-item';
        tagItem.innerHTML = `<span class="tag-hash">#</span><span class="item-title">${this.escape(tag.replace(/^#/, ''))}</span><span class="tag-badge">${count}</span>`;
        tagItem.onclick = () => this.showTagFilterModal(tag);
        tagsList.appendChild(tagItem);
      });
      tagsSection.appendChild(tagsList);
      sidebar.appendChild(tagsSection);
    }

    // Bottom Tools: Clean 2-row footer
    const bottomTools = document.createElement('div');
    bottomTools.className = 'sidebar-bottom-tools';
    bottomTools.innerHTML = `
      <div class="sidebar-footer-row">
        <button class="sb-tool-btn" id="sb-templates-btn">📋 Templates</button>
        <button class="sb-tool-btn" id="sb-saved-msg-btn">💬 Saved</button>
      </div>
      <div class="sidebar-footer-row">
        <button class="sb-tool-btn" id="sb-clip-btn">📎 Web Clip</button>
        <button class="sb-tool-btn" id="sb-trash-btn">
          <span>🗑️ Trash</span>
          ${trash.length > 0 ? `<span class="trash-badge">${trash.length}</span>` : ''}
        </button>
      </div>
    `;

    bottomTools.querySelector('#sb-trash-btn').onclick = () => this.showTrashModal();
    bottomTools.querySelector('#sb-saved-msg-btn').onclick = () => {
      let savedMsgPage = Object.values(this.store.data.pages).find(p => !p.inTrash && p.type === 'chat');
      if (!savedMsgPage) {
        savedMsgPage = this.store.createPage({
          spaceId: this.activeSpaceId,
          title: 'Saved Messages',
          type: 'chat',
          icon: '💬',
          isPinned: true
        });
      }
      this.onPageSelect(savedMsgPage.id);
    };
    bottomTools.querySelector('#sb-clip-btn').onclick = () => this.showWebClipperModal();
    bottomTools.querySelector('#sb-templates-btn').onclick = () => this.showTemplatesModal();

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

  // 3. BREADCRUMBS & TOPBAR ACTIONS & HEADER
  updateHeader() {
    const page = this.store.getPage(this.activePageId);
    if (!page) return;

    this.updateMobileAppbar();
    this.renderMobileEditorToolbar();

    // 1. Breadcrumbs in Top Bar
    const breadcrumbs = document.getElementById('af-breadcrumbs-bar');
    if (breadcrumbs) {
      const trail = [];
      let curr = page;
      while (curr) {
        trail.unshift(curr);
        curr = curr.parentId ? this.store.getPage(curr.parentId) : null;
      }
      breadcrumbs.innerHTML = `
        <span class="bc-space">${this.escape(this.activeSpaceId.replace('space-', ''))}</span>
        ${trail.map((p, idx) => `
          <span class="bc-sep">/</span>
          <span class="bc-item ${idx === trail.length - 1 ? 'is-current' : ''}" data-id="${p.id}">${this.escape(p.title || 'Untitled')}</span>
        `).join('')}
      `;
      breadcrumbs.querySelectorAll('.bc-item').forEach(el => {
        el.onclick = () => this.onPageSelect(el.dataset.id);
      });
    }

    // 2. Minimalist Actions Cluster in Topbar Right
    const topbarActions = document.getElementById('topbar-actions');
    if (topbarActions) {
      topbarActions.innerHTML = '';

      // Notepad toggle button
      if (page.type !== 'database' && page.type !== 'folder') {
        const isNp = page.type === 'notepad';
        const npBtn = document.createElement('button');
        npBtn.className = 'topbar-action-pill' + (isNp ? ' is-active' : '');
        npBtn.innerHTML = `<span>${isNp ? '📑 Rich Text' : '📝 Notepad'}</span>`;
        npBtn.title = isNp ? 'Switch to Rich Block Editor' : 'Switch to Plain Text Notepad';
        npBtn.onclick = () => {
          if (typeof window !== 'undefined' && window.toggleNotepadMode) {
            window.toggleNotepadMode(page.id);
          }
        };
        topbarActions.appendChild(npBtn);
      }

      // Ask AI button
      const aiBtn = document.createElement('button');
      aiBtn.className = 'topbar-action-pill';
      aiBtn.innerHTML = '<span>✨ AI</span>';
      aiBtn.title = 'Ask AI Assistant';
      aiBtn.onclick = () => this.onOpenAI();
      topbarActions.appendChild(aiBtn);

      // Favorite toggle button
      const favBtn = document.createElement('button');
      favBtn.className = 'topbar-icon-btn' + (page.isFavorite ? ' is-favorite' : '');
      favBtn.innerHTML = page.isFavorite ? '★' : '☆';
      favBtn.title = page.isFavorite ? 'Remove from Favorites' : 'Add to Favorites';
      favBtn.onclick = () => {
        this.store.toggleFavorite(page.id);
        this.updateHeader();
      };
      topbarActions.appendChild(favBtn);

      // More Options (⋯)
      const moreBtn = document.createElement('button');
      moreBtn.className = 'topbar-icon-btn';
      moreBtn.innerHTML = '⋯';
      moreBtn.title = 'Page options (Lock, Export, Style, Delete)';
      moreBtn.onclick = (e) => this.showPageOptionsMenu(e, page);
      topbarActions.appendChild(moreBtn);

      // + New Note button
      const newBtn = document.createElement('button');
      newBtn.className = 'topbar-btn-primary';
      newBtn.innerHTML = '<span>+</span> New';
      newBtn.title = 'Create new page';
      newBtn.onclick = () => {
        const p = this.store.createPage({ spaceId: this.activeSpaceId, title: 'Untitled' });
        this.onPageSelect(p.id);
      };
      topbarActions.appendChild(newBtn);
    }

    // 3. Document Header (Cover + Icon + Clean Title + Tags)
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

    // Clean Document Title Row: Icon + Large Title
    const metaRow = document.createElement('div');
    metaRow.className = 'page-meta-row';

    const iconBtn = document.createElement('button');
    iconBtn.className = 'page-icon-btn';
    iconBtn.textContent = page.icon || '📄';
    iconBtn.title = 'Change Icon';
    iconBtn.onclick = () => this.showEmojiPicker(page);

    const titleInput = document.createElement('h1');
    titleInput.className = 'page-title-input';
    titleInput.contentEditable = !page.isLocked ? 'true' : 'false';
    titleInput.textContent = page.title || 'Untitled';
    titleInput.onblur = () => {
      this.store.updatePage(page.id, { title: titleInput.textContent.trim() });
      this.updateSidebar();
      this.updateTabs();
    };

    metaRow.appendChild(iconBtn);
    metaRow.appendChild(titleInput);
    headerWrap.appendChild(metaRow);

    // Tags Bar
    const tagsRow = document.createElement('div');
    tagsRow.className = 'page-tags-bar';
    const currentTags = Array.isArray(page.tags) ? page.tags : [];
    
    tagsRow.innerHTML = `
      <div class="page-tags-list">
        ${currentTags.map(t => `<span class="page-tag-chip" data-tag="${t}">${this.escape(t)} <span class="tag-del-btn" title="Remove tag">✕</span></span>`).join('')}
        <button class="add-tag-chip-btn">+ Tag</button>
      </div>
      ${page.reminderDate ? `
        <div class="page-reminder-pill ${page.reminderDone ? 'is-done' : ''}" title="Click to view reminders">
          ⏰ ${new Date(page.reminderDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ${page.reminderDone ? '(Done)' : ''}
        </div>
      ` : ''}
    `;

    tagsRow.querySelectorAll('.page-tag-chip').forEach(chip => {
      const delBtn = chip.querySelector('.tag-del-btn');
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.store.removeTagFromPage(page.id, chip.dataset.tag);
        this.updateHeader();
        this.updateSidebar();
      };
      chip.onclick = () => this.showTagFilterModal(chip.dataset.tag);
    });

    const addTagBtn = tagsRow.querySelector('.add-tag-chip-btn');
    addTagBtn.onclick = () => {
      const newTag = prompt('Enter new tag (e.g. #work, #urgent):');
      if (newTag) {
        this.store.addTagToPage(page.id, newTag);
        this.updateHeader();
        this.updateSidebar();
      }
    };

    const reminderPill = tagsRow.querySelector('.page-reminder-pill');
    if (reminderPill) {
      reminderPill.onclick = () => this.showRemindersModal();
    }

    headerWrap.appendChild(tagsRow);

    // Notion Feature: Incoming Backlinks Section
    const backlinks = this.store.getBacklinks ? this.store.getBacklinks(page.id) : [];
    if (backlinks.length > 0) {
      const blWrap = document.createElement('div');
      blWrap.className = 'af-backlinks-bar';
      blWrap.innerHTML = `
        <span class="bl-label">🔗 ${backlinks.length} Backlink${backlinks.length > 1 ? 's' : ''}:</span>
        <div class="bl-chips-list">
          ${backlinks.map(b => `<span class="bl-chip" data-id="${b.pageId}">${b.icon} ${b.title}</span>`).join('')}
        </div>
      `;
      blWrap.querySelectorAll('.bl-chip').forEach(c => {
        c.onclick = () => this.onPageSelect(c.dataset.id);
      });
      headerWrap.appendChild(blWrap);
    }

    // Cover toggle if not present
    if (!page.cover) {
      const addCoverHint = document.createElement('button');
      addCoverHint.className = 'add-cover-link';
      addCoverHint.textContent = '+ Add Cover';
      addCoverHint.onclick = () => this.showCoverPicker(page);
      headerWrap.appendChild(addCoverHint);
    }

    // Apply Notion page style (Font, Small text, Full width)
    const viewContainer = document.getElementById('af-page-view-container');
    if (viewContainer) {
      viewContainer.className = 'af-page-view-container' +
        (page.fontFamily ? ` font-${page.fontFamily}` : '') +
        (page.smallText ? ' is-small-text' : '') +
        (page.fullWidth ? ' is-full-width' : '');
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
        label: node.isPinned ? 'Unpin from Top' : 'Pin to Top (📌)',
        icon: '📌',
        action: () => {
          this.store.togglePin(node.id);
          this.updateSidebar();
        }
      },
      {
        label: node.isStarred ? 'Unstar Note' : 'Star Note (⭐)',
        icon: '⭐',
        action: () => {
          this.store.toggleStar(node.id);
          this.updateSidebar();
        }
      },
      {
        label: 'Open in Notepad Mode (📝)',
        icon: '📝',
        action: () => {
          if (typeof window !== 'undefined' && window.toggleNotepadMode) {
            window.toggleNotepadMode(node.id);
          }
        }
      },
      {
        label: 'Add Page Inside',
        icon: '📄',
        action: () => {
          const child = this.store.createPage({ spaceId: node.spaceId, parentId: node.id, title: 'Untitled Page' });
          this.onPageSelect(child.id);
        }
      },
      {
        label: 'Add Subfolder Inside',
        icon: '📁',
        action: () => {
          const fld = this.store.createFolder({ spaceId: node.spaceId, parentId: node.id, title: 'New Subfolder' });
          this.onPageSelect(fld.id);
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

  // Notion Feature: Page Options (⋯ Menu)
  showPageOptionsMenu(e, page) {
    const existing = document.getElementById('af-notion-page-menu');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'af-notion-page-menu';
    popup.id = 'af-notion-page-menu';
    popup.style.position = 'fixed';
    popup.style.top = `${e.clientY + 6}px`;
    popup.style.right = `${Math.max(16, window.innerWidth - e.clientX)}px`;

    // Compute word & character counts
    let words = 0;
    let chars = 0;
    if (page.blocks) {
      page.blocks.forEach(b => {
        const txt = b.text || b.content || '';
        chars += txt.length;
        words += txt.trim().split(/\s+/).filter(Boolean).length;
      });
    }
    const readTimeMin = Math.max(1, Math.ceil(words / 200));

    popup.innerHTML = `
      <div class="notion-menu-section">
        <div class="notion-section-title">STYLE</div>
        <div class="font-switcher-group">
          <button class="btn-font-switch ${page.fontFamily === 'sans' || !page.fontFamily ? 'is-selected' : ''}" data-font="sans">Default</button>
          <button class="btn-font-switch ${page.fontFamily === 'serif' ? 'is-selected' : ''}" data-font="serif" style="font-family: Georgia, serif;">Serif</button>
          <button class="btn-font-switch ${page.fontFamily === 'mono' ? 'is-selected' : ''}" data-font="mono" style="font-family: monospace;">Mono</button>
        </div>
      </div>
      <div class="notion-menu-section">
        <label class="notion-toggle-item">
          <span>Small text</span>
          <input type="checkbox" id="chk-small-text" ${page.smallText ? 'checked' : ''} />
        </label>
        <label class="notion-toggle-item">
          <span>Full width</span>
          <input type="checkbox" id="chk-full-width" ${page.fullWidth ? 'checked' : ''} />
        </label>
        <label class="notion-toggle-item">
          <span>Lock page</span>
          <input type="checkbox" id="chk-lock-page" ${page.isLocked ? 'checked' : ''} />
        </label>
      </div>
      <div class="notion-menu-divider"></div>
      <div class="notion-menu-section writing-stats">
        <div>Words: <strong>${words}</strong></div>
        <div>Characters: <strong>${chars}</strong></div>
        <div>Read time: <strong>~${readTimeMin} min</strong></div>
      </div>
      <div class="notion-menu-divider"></div>
      <div class="notion-menu-section">
        <div class="notion-section-title">PAGE BACKGROUND COLOR</div>
        <div class="page-bg-palette" style="display:flex;gap:6px;padding:4px 0;">
          <button class="bg-color-dot" data-val="" style="background:var(--bg-primary);border:1px solid var(--border-color);" title="Default Theme"></button>
          <button class="bg-color-dot" data-val="#2a241a" style="background:#2a241a;" title="Sepia Warm"></button>
          <button class="bg-color-dot" data-val="#2b2713" style="background:#2b2713;" title="Pastel Yellow"></button>
          <button class="bg-color-dot" data-val="#11291f" style="background:#11291f;" title="Mint Green"></button>
          <button class="bg-color-dot" data-val="#122338" style="background:#122338;" title="Ocean Blue"></button>
          <button class="bg-color-dot" data-val="#241433" style="background:#241433;" title="Lavender"></button>
          <button class="bg-color-dot" data-val="#2e1318" style="background:#2e1318;" title="Rose Pink"></button>
          <button class="bg-color-dot" data-val="#000000" style="background:#000000;border:1px solid #333;" title="AMOLED Black"></button>
        </div>
      </div>
      <div class="notion-menu-divider"></div>
      <div class="notion-menu-section">
        <div class="notion-section-title">WHATSAPP & TELEGRAM FEATURES</div>
        <button class="menu-action-item" id="btn-menu-pin">${page.isPinned ? '📌 Unpin from Top' : '📌 Pin to Top'}</button>
        <button class="menu-action-item" id="btn-menu-star">${page.isStarred ? '⭐ Unstar Note' : '⭐ Star Note'}</button>
        <button class="menu-action-item" id="btn-menu-share-wa">💬 Share via WhatsApp</button>
        <button class="menu-action-item" id="btn-menu-share-tg">✈️ Share via Telegram</button>
        <button class="menu-action-item" id="btn-menu-np-toggle">📝 Toggle Notepad Mode</button>
      </div>
      <div class="notion-menu-divider"></div>
      <div class="notion-menu-section evernote-menu-actions">
        <button class="menu-action-item" id="btn-menu-reminder">⏰ Set Note Reminder</button>
        <button class="menu-action-item" id="btn-menu-info">ℹ️ Note Info & Details</button>
        <button class="menu-action-item" id="btn-menu-history">🕒 Page Version History</button>
        <button class="menu-action-item" id="btn-menu-enex">🐘 Export to Evernote (.enex)</button>
      </div>
      <div class="notion-menu-divider"></div>
      <div class="notion-menu-section delete-menu-section">
        <div class="notion-section-title" style="color:#ef4444;">DELETE & CLEANUP OPTIONS</div>
        <button class="menu-action-item text-danger" id="btn-menu-del-doc">🗑️ Delete Document (Move to Trash)</button>
        <button class="menu-action-item" id="btn-menu-del-voice">🎙️ Remove Voice Memos (${(page.blocks || []).filter(b => b.type === 'audio').length})</button>
        <button class="menu-action-item" id="btn-menu-del-images">🖼️ Remove Images (${(page.blocks || []).filter(b => b.type === 'image').length})</button>
        <button class="menu-action-item" id="btn-menu-del-files">📎 Remove Files & PDFs (${(page.blocks || []).filter(b => b.type === 'file' || b.type === 'pdf').length})</button>
        <button class="menu-action-item" id="btn-menu-clear-doc">📄 Clear Document Content</button>
        <button class="menu-action-item" id="btn-menu-cleanup-modal">🧹 Manage & Delete Media...</button>
      </div>
    `;

    popup.querySelectorAll('.btn-font-switch').forEach(btn => {
      btn.onclick = () => {
        this.store.updatePage(page.id, { fontFamily: btn.dataset.font });
        this.updateHeader();
        popup.remove();
      };
    });

    popup.querySelector('#chk-small-text').onchange = (ev) => {
      this.store.updatePage(page.id, { smallText: ev.target.checked });
      this.updateHeader();
    };

    popup.querySelector('#chk-full-width').onchange = (ev) => {
      this.store.updatePage(page.id, { fullWidth: ev.target.checked });
      this.updateHeader();
    };

    popup.querySelector('#chk-lock-page').onchange = (ev) => {
      this.store.updatePage(page.id, { isLocked: ev.target.checked });
      this.onPageSelect(page.id);
      popup.remove();
    };

    popup.querySelector('#btn-menu-reminder').onclick = () => {
      popup.remove();
      this.showSetReminderModal(page);
    };

    popup.querySelector('#btn-menu-info').onclick = () => {
      popup.remove();
      this.showNoteInfoModal(page);
    };

    popup.querySelector('#btn-menu-history').onclick = () => {
      popup.remove();
      this.showVersionHistoryModal(page);
    };

    popup.querySelector('#btn-menu-enex').onclick = () => {
      popup.remove();
      this.exportPageToENEX(page);
    };

    popup.querySelector('#btn-menu-del-doc').onclick = () => {
      popup.remove();
      if (confirm(`Move document "${page.title}" to Trash?`)) {
        this.store.deletePage(page.id);
        const next = Object.keys(this.store.data.pages).find(id => !this.store.data.pages[id].inTrash);
        if (next) this.onPageSelect(next);
        this.updateSidebar();
        this.updateTabs();
      }
    };

    popup.querySelectorAll('.bg-color-dot').forEach(dot => {
      dot.onclick = () => {
        const bgVal = dot.dataset.val;
        this.store.updatePage(page.id, { bgColor: bgVal });
        const ed = document.querySelector('.af-editor');
        if (ed) ed.style.backgroundColor = bgVal || '';
        popup.remove();
      };
    });

    popup.querySelector('#btn-menu-pin').onclick = () => {
      this.store.togglePin(page.id);
      this.updateSidebar();
      popup.remove();
    };

    popup.querySelector('#btn-menu-star').onclick = () => {
      this.store.toggleStar(page.id);
      this.updateSidebar();
      popup.remove();
    };

    popup.querySelector('#btn-menu-share-wa').onclick = () => {
      const text = encodeURIComponent(`*${page.title}*\n\nRead more in NoteTrack.`);
      window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
      popup.remove();
    };

    popup.querySelector('#btn-menu-share-tg').onclick = () => {
      const text = encodeURIComponent(page.title);
      window.open(`https://t.me/share/url?url=https://notetrack.app&text=${text}`, '_blank');
      popup.remove();
    };

    const npToggleBtn = popup.querySelector('#btn-menu-np-toggle');
    if (npToggleBtn) {
      npToggleBtn.onclick = () => {
        popup.remove();
        if (typeof window !== 'undefined' && window.toggleNotepadMode) {
          window.toggleNotepadMode(page.id);
        }
      };
    }

    popup.querySelector('#btn-menu-del-voice').onclick = () => {
      popup.remove();
      const removed = this.store.removeBlocksByType(page.id, 'audio');
      this.onPageSelect(page.id);
      alert(`Removed ${removed} voice memo(s) from "${page.title}".`);
    };

    popup.querySelector('#btn-menu-del-images').onclick = () => {
      popup.remove();
      const removed = this.store.removeBlocksByType(page.id, 'image');
      this.onPageSelect(page.id);
      alert(`Removed ${removed} image(s) from "${page.title}".`);
    };

    popup.querySelector('#btn-menu-del-files').onclick = () => {
      popup.remove();
      const removed = this.store.removeBlocksByType(page.id, ['file', 'pdf']);
      this.onPageSelect(page.id);
      alert(`Removed ${removed} attached file(s) and PDF(s) from "${page.title}".`);
    };

    popup.querySelector('#btn-menu-clear-doc').onclick = () => {
      popup.remove();
      if (confirm(`Clear all block content inside "${page.title}"?`)) {
        this.store.clearPageBlocks(page.id);
        this.onPageSelect(page.id);
      }
    };

    popup.querySelector('#btn-menu-cleanup-modal').onclick = () => {
      popup.remove();
      this.showMediaCleanupModal(page);
    };

    document.body.appendChild(popup);
    const dismiss = (ev) => {
      if (!popup.contains(ev.target) && ev.target !== e.target) {
        popup.remove();
        document.removeEventListener('click', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('click', dismiss), 50);
  }

  // Notion Feature: Templates Gallery Modal
  showTemplatesModal() {
    const existing = document.getElementById('af-templates-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-templates-modal';

    const box = document.createElement('div');
    box.className = 'af-templates-box';

    box.innerHTML = `
      <div class="templates-head">
        <h2>📋 Notion Starter Templates</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="templates-grid">
        <div class="template-card" data-tmpl="meeting-notes">
          <div class="tmpl-icon">🤝</div>
          <div class="tmpl-title">Meeting Notes</div>
          <div class="tmpl-desc">Attendees, discussion agenda, action items checklist, and owner tags.</div>
          <button class="btn-use-tmpl">Use Template</button>
        </div>
        <div class="template-card" data-tmpl="daily-journal">
          <div class="tmpl-icon">📔</div>
          <div class="tmpl-title">Daily Journal & Reflection</div>
          <div class="tmpl-desc">Morning top 3 priorities, gratitude thoughts, and evening review.</div>
          <button class="btn-use-tmpl">Use Template</button>
        </div>
        <div class="template-card" data-tmpl="reading-list">
          <div class="tmpl-icon">📚</div>
          <div class="tmpl-title">Reading List & Tracker</div>
          <div class="tmpl-desc">Interactive database tracking books, ratings, genres, and status.</div>
          <button class="btn-use-tmpl">Use Template</button>
        </div>
      </div>
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();

    box.querySelectorAll('.btn-use-tmpl').forEach(btn => {
      btn.onclick = () => {
        const tmplName = btn.closest('.template-card').dataset.tmpl;
        const page = this.store.createFromTemplate(tmplName, this.activeSpaceId);
        backdrop.remove();
        this.onPageSelect(page.id);
      };
    });

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Notion Feature: Keyboard Writing Shortcuts
  initShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Focus Mode: Cmd+Shift+F
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        this.toggleFocusMode();
      }
      // Typewriter Mode: Cmd+Shift+T
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        this.toggleTypewriterMode();
      }
      // Document Outline: Cmd+Shift+O
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        this.toggleOutlineDrawer();
      }
      // Today Journal Note: Cmd+Shift+D
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const note = this.store.createFromTemplate('daily-journal', this.activeSpaceId);
        this.onPageSelect(note.id);
      }
      // Evernote Quick Scratchpad: Cmd+Shift+N
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        this.showScratchpadModal();
      }
      // Evernote Web Clipper: Cmd+Shift+C
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.showWebClipperModal();
      }
      // Evernote Reminders: Cmd+Shift+R
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        this.showRemindersModal();
      }
    });
  }

  toggleFocusMode() {
    const layout = document.querySelector('.af-app-layout');
    if (layout) layout.classList.toggle('is-focus-mode');
  }

  toggleTypewriterMode() {
    const main = document.querySelector('.af-main-viewport');
    if (main) main.classList.toggle('is-typewriter-mode');
  }

  toggleOutlineDrawer() {
    const drawer = document.getElementById('af-ai-drawer');
    if (!drawer) return;
    drawer.classList.toggle('is-open');

    const page = this.store.getPage(this.activePageId);
    const headings = page && page.blocks ? page.blocks.filter(b => b.type === 'heading') : [];

    drawer.innerHTML = `
      <div class="ai-drawer-head">
        <span>📑 Document Outline</span>
        <button class="modal-close-btn" id="btn-close-outline">✕</button>
      </div>
      <div class="outline-drawer-body">
        ${headings.length === 0 ? '<div class="empty-state">No headings found on this page.</div>' : ''}
        ${headings.map(h => `
          <div class="outline-item outline-level-${h.level || 1}" data-id="${h.id}">
            ${h.text || 'Untitled'}
          </div>
        `).join('')}
      </div>
    `;

    const closeBtn = drawer.querySelector('#btn-close-outline');
    if (closeBtn) closeBtn.onclick = () => drawer.classList.remove('is-open');

    drawer.querySelectorAll('.outline-item').forEach(item => {
      item.onclick = () => {
        const el = document.querySelector(`[data-block-id="${item.dataset.id}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
    });
  }

  // =========================================================================
  // EVERNOTE FEATURE MODALS & TOOLS
  // =========================================================================

  // Evernote Feature: Export Page as .enex XML
  exportPageToENEX(page) {
    const exporter = (typeof window !== 'undefined' && window.pagesToENEX) || null;
    if (!exporter) {
      alert('ENEX exporter is initializing...');
      return;
    }
    const xml = exporter([page]);
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(page.title || 'Note').replace(/[/\\?%*:|"<>]/g, '_')}.enex`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 100);
  }

  // Evernote Feature: Quick Scratchpad Modal
  showScratchpadModal() {
    const existing = document.getElementById('af-scratchpad-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-scratchpad-modal';

    const box = document.createElement('div');
    box.className = 'af-scratchpad-box';

    box.innerHTML = `
      <div class="scratchpad-head">
        <h2>📝 Quick Scratchpad</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <p class="scratchpad-desc">Capture quick thoughts, links, and snippets. Auto-saves continuously.</p>
      <textarea class="scratchpad-textarea" placeholder="Start typing thoughts here...">${this.store.getScratchpad()}</textarea>
      <div class="scratchpad-actions">
        <span class="scratchpad-saved-hint">✓ Auto-saved locally</span>
        <button class="btn-convert-note">Convert to Note →</button>
      </div>
    `;

    const textarea = box.querySelector('.scratchpad-textarea');
    textarea.oninput = () => {
      this.store.setScratchpad(textarea.value);
    };

    box.querySelector('.btn-convert-note').onclick = () => {
      const newPage = this.store.convertScratchpadToNote(this.activeSpaceId);
      if (newPage) {
        backdrop.remove();
        this.onPageSelect(newPage.id);
      } else {
        alert('Type something in the scratchpad first!');
      }
    };

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
    setTimeout(() => textarea.focus(), 50);
  }

  // Evernote Feature: Reminders Manager Modal
  showRemindersModal() {
    const existing = document.getElementById('af-reminders-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-reminders-modal';

    const box = document.createElement('div');
    box.className = 'af-reminders-box';

    const { overdue, upcoming, completed } = this.store.getReminders();

    const renderList = (items, label, badgeClass) => {
      if (items.length === 0) return '';
      return `
        <div class="reminders-group">
          <div class="reminders-group-title ${badgeClass}">${label} (${items.length})</div>
          <div class="reminders-items-list">
            ${items.map(p => `
              <div class="reminder-item-row" data-id="${p.id}">
                <input type="checkbox" class="chk-reminder-done" data-id="${p.id}" ${p.reminderDone ? 'checked' : ''} />
                <span class="reminder-note-icon">${p.icon || '📄'}</span>
                <span class="reminder-note-title">${p.title}</span>
                <span class="reminder-due-date">${new Date(p.reminderDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    };

    box.innerHTML = `
      <div class="reminders-head">
        <h2>⏰ Note Reminders & Deadlines</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="reminders-body">
        ${overdue.length === 0 && upcoming.length === 0 && completed.length === 0 ? '<div class="empty-state">No active reminders. Open any note and select ⋯ → "Set Note Reminder".</div>' : ''}
        ${renderList(overdue, '⚠️ Overdue', 'badge-overdue')}
        ${renderList(upcoming, '📅 Upcoming', 'badge-upcoming')}
        ${renderList(completed, '✓ Completed', 'badge-completed')}
      </div>
    `;

    box.querySelectorAll('.chk-reminder-done').forEach(chk => {
      chk.onclick = (e) => {
        e.stopPropagation();
        this.store.toggleReminderDone(chk.dataset.id);
        backdrop.remove();
        this.showRemindersModal();
        this.updateHeader();
      };
    });

    box.querySelectorAll('.reminder-item-row').forEach(row => {
      row.onclick = () => {
        backdrop.remove();
        this.onPageSelect(row.dataset.id);
      };
    });

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Evernote Feature: Set Reminder for current note
  showSetReminderModal(page) {
    const existing = document.getElementById('af-set-reminder-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-set-reminder-modal';

    const box = document.createElement('div');
    box.className = 'af-dialog-box';

    const currentIso = page.reminderDate ? new Date(page.reminderDate).toISOString().slice(0, 16) : '';

    box.innerHTML = `
      <div class="dialog-head">
        <h3>⏰ Set Reminder for "${page.title}"</h3>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="dialog-body">
        <label class="dialog-label">Select Date & Time:</label>
        <input type="datetime-local" class="dialog-input" id="reminder-datetime" value="${currentIso}" />
        <div class="dialog-actions">
          ${page.reminderDate ? '<button class="btn-danger" id="btn-clear-reminder">Clear Reminder</button>' : ''}
          <button class="btn-primary" id="btn-save-reminder">Save Reminder</button>
        </div>
      </div>
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    box.querySelector('#btn-save-reminder').onclick = () => {
      const dt = box.querySelector('#reminder-datetime').value;
      if (dt) {
        this.store.setReminder(page.id, dt);
      }
      backdrop.remove();
      this.updateHeader();
    };

    const clearBtn = box.querySelector('#btn-clear-reminder');
    if (clearBtn) {
      clearBtn.onclick = () => {
        this.store.setReminder(page.id, null);
        backdrop.remove();
        this.updateHeader();
      };
    }

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Evernote Feature: Web Clipper / Quick Capture Dialog
  showWebClipperModal() {
    const existing = document.getElementById('af-clipper-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-clipper-modal';

    const box = document.createElement('div');
    box.className = 'af-clipper-box';

    box.innerHTML = `
      <div class="clipper-head">
        <h2>📎 Evernote Web Clipper</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <p class="clipper-desc">Clip articles, snippets, or bookmarks directly into your workspace.</p>
      <div class="clipper-form">
        <label class="clipper-label">Page or Article Title:</label>
        <input type="text" class="clipper-input" id="clip-title" placeholder="e.g. Clean Architecture in 2026" />

        <label class="clipper-label">Source URL:</label>
        <input type="url" class="clipper-input" id="clip-url" placeholder="https://example.com/article" />

        <label class="clipper-label">Clipped Excerpt / Highlight:</label>
        <textarea class="clipper-textarea" id="clip-text" placeholder="Paste article snippet or notes here..."></textarea>

        <label class="clipper-label">Tags (comma-separated):</label>
        <input type="text" class="clipper-input" id="clip-tags" value="#webclip, #readlater" />

        <div class="clipper-actions">
          <button class="modal-cancel-btn">Cancel</button>
          <button class="btn-primary" id="btn-save-clip">Save Clipped Note</button>
        </div>
      </div>
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    box.querySelector('.modal-cancel-btn').onclick = () => backdrop.remove();

    box.querySelector('#btn-save-clip').onclick = () => {
      const title = box.querySelector('#clip-title').value.trim() || 'Clipped Web Article';
      const url = box.querySelector('#clip-url').value.trim() || 'https://example.com';
      const text = box.querySelector('#clip-text').value.trim() || 'No excerpt provided.';
      const rawTags = box.querySelector('#clip-tags').value.split(',').map(t => t.trim()).filter(Boolean);

      const page = this.store.createPage({
        spaceId: this.activeSpaceId,
        title,
        icon: '📎',
        tags: rawTags,
        sourceUrl: url
      });

      this.store.setBlocks(page.id, [
        { id: 'b1', type: 'heading', level: 1, text: title },
        { id: 'b2', type: 'clip', url, title, text, date: new Date().toLocaleDateString() },
        { id: 'b3', type: 'heading', level: 2, text: 'Notes & Takeaways' },
        { id: 'b4', type: 'paragraph', text: 'Write your thoughts on this clip here...' }
      ]);

      backdrop.remove();
      this.onPageSelect(page.id);
    };

    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
    setTimeout(() => box.querySelector('#clip-title').focus(), 50);
  }

  // Evernote Feature: Tag Filter Modal (Browse notes by tag)
  showTagFilterModal(tag) {
    const existing = document.getElementById('af-tag-filter-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-tag-filter-modal';

    const box = document.createElement('div');
    box.className = 'af-dialog-box';

    const matching = this.store.getPagesByTag(tag);

    box.innerHTML = `
      <div class="dialog-head">
        <h2>🏷️ Notes Tagged "${tag}" (${matching.length})</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="dialog-body">
        ${matching.length === 0 ? '<div class="empty-state">No active notes with this tag.</div>' : ''}
        <div class="tag-notes-list">
          ${matching.map(p => `
            <div class="tag-note-item" data-id="${p.id}">
              <span class="note-icon">${p.icon || '📄'}</span>
              <span class="note-title">${p.title}</span>
              <span class="note-date">${new Date(p.updatedAt).toLocaleDateString()}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    box.querySelectorAll('.tag-note-item').forEach(item => {
      item.onclick = () => {
        backdrop.remove();
        this.onPageSelect(item.dataset.id);
      };
    });

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Evernote Feature: Note Info & Metadata Inspector
  showNoteInfoModal(page) {
    const existing = document.getElementById('af-note-info-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-note-info-modal';

    const box = document.createElement('div');
    box.className = 'af-dialog-box';

    let words = 0;
    let chars = 0;
    if (page.blocks) {
      page.blocks.forEach(b => {
        const txt = b.text || b.content || '';
        chars += txt.length;
        words += txt.trim().split(/\s+/).filter(Boolean).length;
      });
    }
    const approxSizeKb = ((JSON.stringify(page).length) / 1024).toFixed(1);

    box.innerHTML = `
      <div class="dialog-head">
        <h2>ℹ️ Note Details: "${page.title}"</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="dialog-body">
        <table class="info-table">
          <tr><th>Notebook / Space:</th><td>${page.spaceId.replace('space-', '').toUpperCase()}</td></tr>
          <tr><th>Created:</th><td>${new Date(page.createdAt).toLocaleString()}</td></tr>
          <tr><th>Last Modified:</th><td>${new Date(page.updatedAt).toLocaleString()}</td></tr>
          <tr><th>Word Count:</th><td>${words} words</td></tr>
          <tr><th>Character Count:</th><td>${chars} characters</td></tr>
          <tr><th>Note Size:</th><td>~${approxSizeKb} KB</td></tr>
          <tr><th>Tags:</th><td>${Array.isArray(page.tags) && page.tags.length > 0 ? page.tags.join(', ') : 'None'}</td></tr>
          <tr><th>Reminder:</th><td>${page.reminderDate ? `${new Date(page.reminderDate).toLocaleString()} ${page.reminderDone ? '(Done)' : ''}` : 'None'}</td></tr>
          ${page.sourceUrl ? `<tr><th>Source URL:</th><td><a href="${page.sourceUrl}" target="_blank">${page.sourceUrl}</a></td></tr>` : ''}
        </table>
      </div>
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Advanced Feature: Page Version History & Rollback Modal
  showVersionHistoryModal(page) {
    const existing = document.getElementById('af-version-history-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-version-history-modal';

    const modal = document.createElement('div');
    modal.className = 'version-history-modal';

    const history = this.store.getVersionHistory(page.id);
    let selectedSnap = history[0] || null;

    const listPane = document.createElement('div');
    listPane.className = 'version-list-pane';
    listPane.innerHTML = `
      <div class="version-list-header">
        <span>🕒 Version History</span>
        <button class="btn-snap-manual" style="float:right;background:none;border:none;color:var(--accent-color);cursor:pointer;font-weight:600;font-size:11px;">+ Snapshot</button>
      </div>
      <div class="version-items-scroll"></div>
    `;

    const previewPane = document.createElement('div');
    previewPane.className = 'version-preview-pane';

    const renderList = () => {
      const scroll = listPane.querySelector('.version-items-scroll');
      scroll.innerHTML = '';
      if (history.length === 0) {
        scroll.innerHTML = '<div style="padding:16px;font-size:12px;color:var(--text-muted);text-align:center;">No history snapshots saved yet. Creating snapshots on page edits.</div>';
      }
      history.forEach((snap, idx) => {
        const item = document.createElement('div');
        item.className = 'version-item' + (snap === selectedSnap ? ' is-active' : '');
        const dateStr = new Date(snap.timestamp).toLocaleString();
        item.innerHTML = `
          <div class="version-item-label">${snap.label || 'Snapshot ' + (history.length - idx)}</div>
          <div class="version-item-time">${dateStr}</div>
        `;
        item.onclick = () => {
          selectedSnap = snap;
          renderList();
          renderPreview();
        };
        scroll.appendChild(item);
      });
    };

    const renderPreview = () => {
      previewPane.innerHTML = '';
      const head = document.createElement('div');
      head.className = 'version-preview-header';

      if (!selectedSnap) {
        head.innerHTML = '<span>Current Version</span><button class="modal-close-btn">✕</button>';
        head.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
        previewPane.appendChild(head);

        const body = document.createElement('div');
        body.className = 'version-preview-body';
        body.innerHTML = `<h2>${page.title}</h2><p>Select a prior snapshot from the timeline on the left to preview differences or restore.</p>`;
        previewPane.appendChild(body);
        return;
      }

      head.innerHTML = `
        <div>
          <strong>${selectedSnap.label || 'Revision'}</strong>
          <span style="font-size:11px;color:var(--text-muted);margin-left:8px;">${new Date(selectedSnap.timestamp).toLocaleString()}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <button class="btn-restore-version">Restore This Version</button>
          <button class="modal-close-btn">✕</button>
        </div>
      `;

      head.querySelector('.modal-close-btn').onclick = () => backdrop.remove();
      head.querySelector('.btn-restore-version').onclick = () => {
        if (confirm(`Restore version from ${new Date(selectedSnap.timestamp).toLocaleString()}?`)) {
          this.store.restoreSnapshot(page.id, selectedSnap.id);
          backdrop.remove();
          this.onPageSelect(page.id);
        }
      };

      const body = document.createElement('div');
      body.className = 'version-preview-body';
      const h2 = document.createElement('h2');
      h2.textContent = selectedSnap.title || page.title;
      body.appendChild(h2);

      (selectedSnap.blocks || []).forEach(b => {
        const p = document.createElement('p');
        p.textContent = b.text || b.content || (b.data && b.data.text) || `[${b.type}]`;
        body.appendChild(p);
      });

      previewPane.appendChild(head);
      previewPane.appendChild(body);
    };

    listPane.querySelector('.btn-snap-manual').onclick = () => {
      const label = prompt('Snapshot label / comment:', 'Manual Backup');
      if (label) {
        const s = this.store.createSnapshot(page.id, label);
        if (s) {
          selectedSnap = s;
          renderList();
          renderPreview();
        }
      }
    };

    renderList();
    renderPreview();

    modal.appendChild(listPane);
    modal.appendChild(previewPane);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  // Cross-Platform Android Material Bottom Navigation Bar
  renderMobileBottomBar() {
    const nav = document.getElementById('mobile-bottom-nav');
    if (!nav) return;

    nav.innerHTML = `
      <button class="nav-btn" id="m-btn-sidebar" title="Notes">
        <span class="nav-icon">📂</span>
        <span class="nav-label">Notes</span>
      </button>
      <button class="nav-btn" id="m-btn-search" title="Search">
        <span class="nav-icon">🔍</span>
        <span class="nav-label">Search</span>
      </button>
      <button class="nav-btn btn-nav-fab" id="m-btn-new" title="New Note">
        <span class="fab-circle">+</span>
      </button>
      <button class="nav-btn" id="m-btn-scratch" title="Scratchpad">
        <span class="nav-icon">⚡</span>
        <span class="nav-label">Quick</span>
      </button>
      <button class="nav-btn" id="m-btn-settings" title="Settings">
        <span class="nav-icon">⚙️</span>
        <span class="nav-label">Settings</span>
      </button>
    `;

    nav.querySelector('#m-btn-sidebar').onclick = () => this.toggleMobileSidebar();
    nav.querySelector('#m-btn-search').onclick = () => {
      if (typeof PaletteModal !== 'undefined') new PaletteModal({ store: this.store, onSelect: (id) => this.onPageSelect(id) }).show();
    };
    nav.querySelector('#m-btn-new').onclick = () => {
      const p = this.store.createPage({ spaceId: this.activeSpaceId, title: 'Untitled Note' });
      this.onPageSelect(p.id);
    };
    nav.querySelector('#m-btn-scratch').onclick = () => this.showScratchpadModal();
    nav.querySelector('#m-btn-settings').onclick = () => {
      if (typeof SettingsModal !== 'undefined') new SettingsModal({ store: this.store }).show();
    };
  }

  updateMobileAppbar() {
    const bar = document.getElementById('mobile-appbar');
    if (!bar) return;
    const page = this.store.getPage(this.activePageId);
    if (!page) return;

    bar.innerHTML = `
      <div class="m-appbar-left">
        <button class="m-appbar-btn" id="m-appbar-drawer-btn" title="Open Navigation Drawer">☰</button>
        <span class="m-appbar-icon" id="m-appbar-icon-btn" title="Change Icon">${page.icon || '📄'}</span>
        <span class="m-appbar-title" title="${page.title}">${page.title || 'Untitled'}</span>
      </div>
      <div class="m-appbar-right">
        <button class="m-appbar-btn" id="m-appbar-ai-btn" title="AI Companion">✨</button>
        <button class="m-appbar-btn" id="m-appbar-search-btn" title="Search">🔍</button>
        <button class="m-appbar-btn" id="m-appbar-more-btn" title="Page Options">⋮</button>
      </div>
    `;

    bar.querySelector('#m-appbar-drawer-btn').onclick = () => this.toggleMobileSidebar();
    bar.querySelector('#m-appbar-icon-btn').onclick = () => this.showEmojiPicker(page);
    bar.querySelector('#m-appbar-ai-btn').onclick = () => this.onOpenAI();
    bar.querySelector('#m-appbar-search-btn').onclick = () => this.onOpenPalette();
    bar.querySelector('#m-appbar-more-btn').onclick = (e) => this.showPageOptionsMenu(e, page);
  }

  renderMobileEditorToolbar() {
    const toolbar = document.getElementById('mobile-editor-toolbar');
    if (!toolbar) return;
    const page = this.store.getPage(this.activePageId);
    if (!page || page.type !== 'document') {
      toolbar.style.display = 'none';
      return;
    }
    toolbar.style.display = '';
    toolbar.innerHTML = `
      <button class="m-tool-pill" data-type="paragraph" title="Add Paragraph">+ Text</button>
      <button class="m-tool-pill" data-type="heading" title="Heading 2">H2</button>
      <button class="m-tool-pill" data-type="todo" title="Todo Checklist">☑ Todo</button>
      <button class="m-tool-pill" data-type="file" title="Attach Document / PDF">📎 File</button>
      <button class="m-tool-pill" data-type="pdf" title="PDF Reader">📕 PDF</button>
      <button class="m-tool-pill" data-type="diagram" title="Flowchart / Diagram">📊 Diagram</button>
      <button class="m-tool-pill" data-type="sticky" title="Sticky Note">📌 Sticky</button>
      <button class="m-tool-pill" data-type="chat" title="Saved Message">💬 Chat</button>
      <button class="m-tool-pill" data-type="audio" title="Voice Memo">🎙️ Voice</button>
      <button class="m-tool-pill" data-type="image" title="Photo / Image">📷 Photo</button>
      <button class="m-tool-pill" data-type="bullet" title="Bullet List">• Bullet</button>
      <button class="m-tool-pill" data-type="code" title="Code Block">&lt;&gt; Code</button>
      <button class="m-tool-pill" data-type="slash" title="Commands">/ Menu</button>
    `;

    toolbar.querySelectorAll('.m-tool-pill').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const type = btn.dataset.type;
        if (type === 'slash') {
          this.onOpenPalette();
          return;
        }
        let newBlock = { type, text: '' };
        if (type === 'heading') newBlock = { type: 'heading', level: 2, text: '' };
        if (type === 'todo') newBlock = { type: 'todo', text: '', checked: false };
        if (type === 'audio') newBlock = { type: 'audio', audioData: null, duration: 0, title: 'Voice Memo' };
        if (type === 'image') newBlock = { type: 'image', url: '', caption: '' };
        if (type === 'code') newBlock = { type: 'code', text: '', language: 'javascript' };
        if (type === 'file') newBlock = { type: 'file', fileName: '', fileSize: 0, fileType: '', url: '' };
        if (type === 'pdf') newBlock = { type: 'pdf', fileName: '', fileSize: 0, fileType: 'application/pdf', url: '' };
        if (type === 'diagram') newBlock = { type: 'diagram', diagramType: 'flowchart', title: 'Flowchart', steps: [{ label: 'Start', color: '#3b82f6' }, { label: 'Process', color: '#8b5cf6' }, { label: 'Complete', color: '#10b981' }] };
        if (type === 'sticky') newBlock = { type: 'sticky', color: '#fef08a', text: 'Quick sticky note...' };
        if (type === 'chat') newBlock = { type: 'chat', sender: 'me', text: 'Saved thought...', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        this.store.insertBlock(this.activePageId, newBlock);
        this.onPageSelect(this.activePageId);
      };
    });
  }

  // Dedicated Selective Media & Content Cleanup Modal
  showMediaCleanupModal(page) {
    const existing = document.getElementById('af-media-cleanup-modal');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-media-cleanup-modal';

    const box = document.createElement('div');
    box.className = 'af-cleanup-modal-box';

    const blocks = Array.isArray(page.blocks) ? page.blocks : [];
    const voiceBlocks = blocks.filter(b => b.type === 'audio');
    const imageBlocks = blocks.filter(b => b.type === 'image');
    const fileBlocks = blocks.filter(b => b.type === 'file' || b.type === 'pdf');

    box.innerHTML = `
      <div class="cleanup-modal-head">
        <h2>🗑️ Delete Options: "${page.title}"</h2>
        <button class="modal-close-btn">✕</button>
      </div>
      <div class="cleanup-modal-body">
        <p class="cleanup-sub">Granularly remove voice memos, images, attached files, or page content.</p>

        <!-- 1. Voice Memos Section -->
        <div class="cleanup-card">
          <div class="cleanup-card-header">
            <span class="cleanup-icon">🎙️</span>
            <div>
              <div class="cleanup-title">Voice Memos (${voiceBlocks.length})</div>
              <div class="cleanup-desc">Audio tracks and recorded voice memos in this note.</div>
            </div>
            ${voiceBlocks.length > 0 ? `<button class="btn-cleanup-act danger" id="btn-del-all-voice">🗑️ Remove All Voice Memos</button>` : `<span class="badge-none">None</span>`}
          </div>
          ${voiceBlocks.length > 0 ? `
            <div class="cleanup-items-list">
              ${voiceBlocks.map((vb, idx) => `
                <div class="cleanup-item-row" data-id="${vb.id}">
                  <span>🎙️ ${vb.title || 'Voice Memo ' + (idx + 1)}</span>
                  <button class="btn-del-item" data-id="${vb.id}">Delete</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 2. Images Section -->
        <div class="cleanup-card">
          <div class="cleanup-card-header">
            <span class="cleanup-icon">🖼️</span>
            <div>
              <div class="cleanup-title">Images (${imageBlocks.length})</div>
              <div class="cleanup-desc">Embedded pictures, diagrams, and visual cards.</div>
            </div>
            ${imageBlocks.length > 0 ? `<button class="btn-cleanup-act danger" id="btn-del-all-images">🗑️ Remove All Images</button>` : `<span class="badge-none">None</span>`}
          </div>
          ${imageBlocks.length > 0 ? `
            <div class="cleanup-items-list">
              ${imageBlocks.map((ib, idx) => `
                <div class="cleanup-item-row" data-id="${ib.id}">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;">🖼️ ${ib.url || 'Image ' + (idx + 1)}</span>
                  <button class="btn-del-item" data-id="${ib.id}">Delete</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 3. Files & Documents Section -->
        <div class="cleanup-card">
          <div class="cleanup-card-header">
            <span class="cleanup-icon">📎</span>
            <div>
              <div class="cleanup-title">Attached Files & Documents (${fileBlocks.length})</div>
              <div class="cleanup-desc">Attached PDFs, DOCX, XLSX, ZIP, and other documents.</div>
            </div>
            ${fileBlocks.length > 0 ? `<button class="btn-cleanup-act danger" id="btn-del-all-files">🗑️ Remove All Files</button>` : `<span class="badge-none">None</span>`}
          </div>
          ${fileBlocks.length > 0 ? `
            <div class="cleanup-items-list">
              ${fileBlocks.map((fb, idx) => `
                <div class="cleanup-item-row" data-id="${fb.id}">
                  <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:280px;">📎 ${fb.fileName || 'File ' + (idx + 1)}</span>
                  <button class="btn-del-item" data-id="${fb.id}">Delete</button>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- 4. Document / Page Content Section -->
        <div class="cleanup-card">
          <div class="cleanup-card-header">
            <span class="cleanup-icon">📄</span>
            <div>
              <div class="cleanup-title">Document & Page Deletion</div>
              <div class="cleanup-desc">Clear document body text or move the whole document to Trash.</div>
            </div>
          </div>
          <div class="cleanup-actions-group">
            <button class="btn-cleanup-act" id="btn-act-clear-blocks">📄 Clear Document Content (${blocks.length} blocks)</button>
            <button class="btn-cleanup-act danger" id="btn-act-delete-doc">🗑️ Move Document to Trash</button>
          </div>
        </div>
      </div>
    `;

    box.querySelector('.modal-close-btn').onclick = () => backdrop.remove();

    const delAllVoice = box.querySelector('#btn-del-all-voice');
    if (delAllVoice) {
      delAllVoice.onclick = () => {
        this.store.removeBlocksByType(page.id, 'audio');
        backdrop.remove();
        this.onPageSelect(page.id);
      };
    }

    const delAllImages = box.querySelector('#btn-del-all-images');
    if (delAllImages) {
      delAllImages.onclick = () => {
        this.store.removeBlocksByType(page.id, 'image');
        backdrop.remove();
        this.onPageSelect(page.id);
      };
    }

    const delAllFiles = box.querySelector('#btn-del-all-files');
    if (delAllFiles) {
      delAllFiles.onclick = () => {
        this.store.removeBlocksByType(page.id, ['file', 'pdf']);
        backdrop.remove();
        this.onPageSelect(page.id);
      };
    }

    box.querySelectorAll('.btn-del-item').forEach(btn => {
      btn.onclick = () => {
        this.store.removeBlock(page.id, btn.dataset.id);
        backdrop.remove();
        this.showMediaCleanupModal(this.store.getPage(page.id));
        this.onPageSelect(page.id);
      };
    });

    box.querySelector('#btn-act-clear-blocks').onclick = () => {
      if (confirm(`Clear all block content inside "${page.title}"?`)) {
        this.store.clearPageBlocks(page.id);
        backdrop.remove();
        this.onPageSelect(page.id);
      }
    };

    box.querySelector('#btn-act-delete-doc').onclick = () => {
      if (confirm(`Move document "${page.title}" to Trash?`)) {
        this.store.deletePage(page.id);
        backdrop.remove();
        const next = Object.keys(this.store.data.pages).find(id => !this.store.data.pages[id].inTrash);
        if (next) this.onPageSelect(next);
        this.updateSidebar();
        this.updateTabs();
      }
    };

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
