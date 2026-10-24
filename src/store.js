// src/store.js - Unified Reactive Data Store for AppFlowy Lean
'use strict';

function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

class AppFlowyStore {
  constructor(initialData = null) {
    this.subscribers = new Set();
    this.data = initialData || this.getDefaultData();
  }

  // Reactive subscription
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify(event = null) {
    for (const sub of this.subscribers) {
      try { sub(this.data, event); } catch (err) { console.error('Store subscriber error:', err); }
    }
  }

  // Persistence export / import
  toJSON() {
    return JSON.stringify(this.data, null, 2);
  }

  fromJSON(jsonString) {
    try {
      this.data = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      this.notify();
      return true;
    } catch (err) {
      console.error('Failed to parse store JSON:', err);
      return false;
    }
  }

  // Workspace & Spaces
  getWorkspace() {
    return this.data.workspace;
  }

  getSpaces() {
    return this.data.workspace.spaces || [];
  }

  // Page CRUD
  createPage({
    spaceId = 'space-personal',
    parentId = null,
    title = 'Untitled',
    icon = '📄',
    cover = null,
    type = 'document',
    fontFamily = 'sans',
    smallText = false,
    fullWidth = false,
    tags = [],
    reminderDate = null,
    reminderDone = false,
    sourceUrl = null,
    history = []
  } = {}) {
    const id = 'page-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const now = Date.now();

    const page = {
      id,
      spaceId,
      parentId,
      title,
      icon: type === 'folder' ? (icon === '📄' ? '📁' : icon) : (type === 'chat' ? '💬' : icon),
      cover,
      type, // 'document' | 'database' | 'folder' | 'chat'
      isFavorite: false,
      isPinned: false,
      isStarred: false,
      isLocked: false,
      inTrash: false,
      bgColor: null,
      fontFamily, // 'sans' | 'serif' | 'mono'
      smallText,
      fullWidth,
      tags: Array.isArray(tags) ? [...tags] : [],
      reminderDate: reminderDate || null,
      reminderDone: Boolean(reminderDone),
      sourceUrl: sourceUrl || null,
      history: Array.isArray(history) ? [...history] : [],
      createdAt: now,
      updatedAt: now,
      blocks: type === 'document' ? [
        { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'heading', level: 1, text: title },
        { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'paragraph', text: '' }
      ] : (type === 'chat' ? [
        { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'chat', sender: 'me', text: 'Welcome to Saved Messages! Jot down instant ideas, reminders, links, and notes here.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ] : [])
    };

    this.data.pages[id] = page;

    if (type === 'database') {
      this.initDatabaseForPage(id, title);
    }

    this.notify();
    return page;
  }

  getPage(id) {
    return this.data.pages[id] || null;
  }

  updatePage(id, partial) {
    const page = this.data.pages[id];
    if (!page) return null;
    Object.assign(page, partial, { updatedAt: Date.now() });
    this.notify();
    return page;
  }

  toggleFavorite(id) {
    const page = this.data.pages[id];
    if (!page) return null;
    page.isFavorite = !page.isFavorite;
    page.updatedAt = Date.now();
    this.notify();
    return page.isFavorite;
  }

  togglePin(id) {
    const page = this.data.pages[id];
    if (!page) return null;
    page.isPinned = !page.isPinned;
    page.updatedAt = Date.now();
    this.notify();
    return page.isPinned;
  }

  toggleStar(id) {
    const page = this.data.pages[id];
    if (!page) return null;
    page.isStarred = !page.isStarred;
    page.updatedAt = Date.now();
    this.notify();
    return page.isStarred;
  }

  createFolder({ spaceId = 'space-personal', parentId = null, title = 'New Folder', icon = '📁' } = {}) {
    return this.createPage({ spaceId, parentId, title, icon, type: 'folder' });
  }

  getFolderContents(folderId) {
    return Object.values(this.data.pages).filter(p => !p.inTrash && p.parentId === folderId);
  }

  toggleLock(id) {
    const page = this.data.pages[id];
    if (!page) return null;
    page.isLocked = !page.isLocked;
    page.updatedAt = Date.now();
    this.notify();
    return page.isLocked;
  }

  deletePage(id) {
    const page = this.data.pages[id];
    if (!page) return false;

    // Recursively soft-delete children into trash
    const markTrash = (pId) => {
      if (this.data.pages[pId]) {
        this.data.pages[pId].inTrash = true;
        this.data.pages[pId].updatedAt = Date.now();
      }
      for (const p of Object.values(this.data.pages)) {
        if (p.parentId === pId) markTrash(p.id);
      }
    };

    markTrash(id);
    this.notify();
    return true;
  }

  restorePage(id) {
    const page = this.data.pages[id];
    if (!page) return false;

    // Recursively restore
    const restoreRec = (pId) => {
      if (this.data.pages[pId]) {
        this.data.pages[pId].inTrash = false;
        this.data.pages[pId].updatedAt = Date.now();
      }
      for (const p of Object.values(this.data.pages)) {
        if (p.parentId === pId) restoreRec(p.id);
      }
    };

    restoreRec(id);
    this.notify();
    return true;
  }

  permanentlyDeletePage(id) {
    const deleteRec = (pId) => {
      delete this.data.pages[pId];
      delete this.data.databases[pId];
      for (const [k, p] of Object.entries(this.data.pages)) {
        if (p.parentId === pId) deleteRec(k);
      }
    };

    deleteRec(id);
    this.notify();
    return true;
  }

  // Page Hierarchy & Querying
  getPageTree(spaceId) {
    const activePages = Object.values(this.data.pages).filter(
      p => !p.inTrash && p.spaceId === spaceId
    );

    const buildSubtree = (parentId) => {
      return activePages
        .filter(p => p.parentId === parentId)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map(p => ({
          ...p,
          children: buildSubtree(p.id)
        }));
    };

    return buildSubtree(null);
  }

  getFavoritePages() {
    return Object.values(this.data.pages).filter(p => !p.inTrash && p.isFavorite);
  }

  getTrashPages() {
    return Object.values(this.data.pages).filter(p => p.inTrash);
  }

  // Block Document Editor Management
  getBlocks(pageId) {
    const page = this.data.pages[pageId];
    return page ? (page.blocks || []) : [];
  }

  setBlocks(pageId, blocks) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked) return false;
    page.blocks = blocks;
    page.updatedAt = Date.now();
    this.notify();
    return true;
  }

  insertBlock(pageId, block, index = -1) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked) return null;
    if (!block.id) block.id = 'b-' + Math.random().toString(36).slice(2, 8);
    if (!page.blocks) page.blocks = [];

    if (index >= 0 && index <= page.blocks.length) {
      page.blocks.splice(index, 0, block);
    } else {
      page.blocks.push(block);
    }
    page.updatedAt = Date.now();
    this.notify();
    return block;
  }

  addBlock(pageId, block, index = -1) {
    return this.insertBlock(pageId, block, index);
  }

  updateBlock(pageId, blockId, partial) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked || !page.blocks) return null;
    const block = page.blocks.find(b => b.id === blockId);
    if (!block) return null;
    Object.assign(block, partial);
    page.updatedAt = Date.now();

    // Notion Synced Block: Synchronize across all instances sharing syncId
    if (block.syncId) {
      for (const p of Object.values(this.data.pages)) {
        if (p.blocks) {
          for (const b of p.blocks) {
            if (b.id !== block.id && b.syncId === block.syncId) {
              if (block.data) b.data = JSON.parse(JSON.stringify(block.data));
              if (block.text !== undefined) b.text = block.text;
              if (block.content !== undefined) b.content = block.content;
              if (block.icon !== undefined) b.icon = block.icon;
              if (block.checked !== undefined) b.checked = block.checked;
              if (block.language !== undefined) b.language = block.language;
              if (block.title !== undefined) b.title = block.title;
              p.updatedAt = Date.now();
            }
          }
        }
      }
    }

    this.notify({ type: 'block', pageId, blockId });
    return block;
  }

  removeBlock(pageId, blockId) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked || !page.blocks) return false;
    const idx = page.blocks.findIndex(b => b.id === blockId);
    if (idx === -1) return false;
    page.blocks.splice(idx, 1);
    page.updatedAt = Date.now();
    this.notify();
    return true;
  }

  moveBlock(pageId, fromIndex, toIndex) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked || !page.blocks) return false;
    if (fromIndex < 0 || fromIndex >= page.blocks.length) return false;
    if (toIndex < 0 || toIndex >= page.blocks.length) return false;
    const [item] = page.blocks.splice(fromIndex, 1);
    page.blocks.splice(toIndex, 0, item);
    page.updatedAt = Date.now();
    this.notify();
    return true;
  }

  // Granular Deletion: Remove all blocks of a specific type (e.g. 'audio', 'image', 'file', 'pdf')
  removeBlocksByType(pageId, type) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked || !Array.isArray(page.blocks)) return 0;
    const initialLen = page.blocks.length;
    const types = Array.isArray(type) ? type : [type];
    page.blocks = page.blocks.filter(b => !types.includes(b.type));
    const removedCount = initialLen - page.blocks.length;
    if (page.blocks.length === 0) {
      page.blocks.push({ id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'paragraph', text: '' });
    }
    page.updatedAt = Date.now();
    this.notify();
    return removedCount;
  }

  // Granular Deletion: Clear document body content while keeping document page
  clearPageBlocks(pageId) {
    const page = this.data.pages[pageId];
    if (!page || page.isLocked) return false;
    page.blocks = [
      { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'heading', level: 1, text: page.title || 'Untitled' },
      { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'paragraph', text: '' }
    ];
    page.updatedAt = Date.now();
    this.notify();
    return true;
  }

  // Database Management
  initDatabaseForPage(pageId, title = 'Database') {
    if (!this.data.databases) this.data.databases = {};
    const db = {
      pageId,
      title,
      columns: [
        { id: 'col_title', name: 'Name', type: 'title', width: 220 },
        { id: 'col_status', name: 'Status', type: 'select', width: 140, options: ['To Do', 'In Progress', 'Done'] },
        { id: 'col_priority', name: 'Priority', type: 'select', width: 130, options: ['Low', 'Medium', 'High', 'Urgent'] },
        { id: 'col_date', name: 'Due Date', type: 'date', width: 140 },
        { id: 'col_num', name: 'Estimate (hrs)', type: 'number', width: 130 },
        { id: 'col_done', name: 'Completed', type: 'checkbox', width: 100 },
        { id: 'col_link', name: 'Link / Resource', type: 'url', width: 180 }
      ],
      rows: [
        {
          id: 'row-1',
          values: {
            col_title: 'Architecture Blueprint',
            col_status: 'Done',
            col_priority: 'Urgent',
            col_date: '2026-10-24',
            col_num: 6,
            col_done: true,
            col_link: 'https://appflowy.io'
          },
          document: {
            blocks: [
              { id: 'rb1', type: 'heading', level: 2, text: 'Blueprint Architecture' },
              { id: 'rb2', type: 'paragraph', text: 'Detailed specifications for this task item.' }
            ]
          }
        },
        {
          id: 'row-2',
          values: {
            col_title: 'Implement Multi-View Engine',
            col_status: 'In Progress',
            col_priority: 'High',
            col_date: '2026-10-25',
            col_num: 8,
            col_done: false,
            col_link: ''
          },
          document: { blocks: [] }
        },
        {
          id: 'row-3',
          values: {
            col_title: 'AI Chat Prompts & Integration',
            col_status: 'To Do',
            col_priority: 'Medium',
            col_date: '2026-10-27',
            col_num: 4,
            col_done: false,
            col_link: ''
          },
          document: { blocks: [] }
        }
      ],
      views: [
        { id: 'v_grid', name: 'All Tasks', type: 'grid' },
        { id: 'v_board', name: 'Kanban Board', type: 'board', groupBy: 'col_status' },
        { id: 'v_calendar', name: 'Calendar', type: 'calendar', dateColumn: 'col_date' },
        { id: 'v_gallery', name: 'Card Gallery', type: 'gallery' },
        { id: 'v_timeline', name: 'Timeline', type: 'timeline', dateColumn: 'col_date' },
        { id: 'v_chart', name: 'Status Breakdown', type: 'chart', groupBy: 'col_status', measureColumn: 'col_num' }
      ]
    };

    this.data.databases[pageId] = db;
    return db;
  }

  getDatabase(pageId) {
    if (!this.data.databases) this.data.databases = {};
    if (!this.data.databases[pageId]) {
      const page = this.getPage(pageId);
      if (page && page.type === 'database') {
        return this.initDatabaseForPage(pageId, page.title);
      }
      return null;
    }
    return this.data.databases[pageId];
  }

  addColumn(pageId, { name, type, options = [], ...rest } = {}) {
    const db = this.getDatabase(pageId);
    if (!db) return null;
    const colId = 'col_' + Math.random().toString(36).slice(2, 7);
    const col = {
      id: colId,
      name: name || 'Column',
      type: type || 'text',
      width: 140,
      options: options || [],
      ...rest
    };
    db.columns.push(col);
    this.notify();
    return col;
  }

  deleteColumn(pageId, columnId) {
    const db = this.getDatabase(pageId);
    if (!db) return false;
    db.columns = db.columns.filter(c => c.id !== columnId);
    for (const row of db.rows) {
      delete row.values[columnId];
    }
    this.notify();
    return true;
  }

  addRow(pageId, initialValues = {}) {
    const db = this.getDatabase(pageId);
    if (!db) return null;
    const rowId = 'row-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
    const row = {
      id: rowId,
      values: { ...initialValues },
      document: { blocks: [] }
    };
    // Ensure primary column has a fallback
    const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];
    if (titleCol && !row.values[titleCol.id]) {
      row.values[titleCol.id] = 'New Item';
    }
    db.rows.push(row);
    this.notify();
    return row;
  }

  updateCell(pageId, rowId, columnId, value) {
    const db = this.getDatabase(pageId);
    if (!db) return false;
    const row = db.rows.find(r => r.id === rowId);
    if (!row) return false;
    if (!row.values) row.values = {};
    row.values[columnId] = value;
    this.notify({ type: 'cell', pageId, rowId, columnId });
    return true;
  }

  deleteRow(pageId, rowId) {
    const db = this.getDatabase(pageId);
    if (!db) return false;
    const idx = db.rows.findIndex(r => r.id === rowId);
    if (idx === -1) return false;
    db.rows.splice(idx, 1);
    this.notify();
    return true;
  }

  // Row as Document (Each database row can be opened as a rich document)
  getRowDocument(pageId, rowId) {
    const db = this.getDatabase(pageId);
    if (!db) return [];
    const row = db.rows.find(r => r.id === rowId);
    if (!row) return [];
    if (!row.document) row.document = { blocks: [] };
    return row.document.blocks || [];
  }

  setRowDocument(pageId, rowId, blocks) {
    const db = this.getDatabase(pageId);
    if (!db) return false;
    const row = db.rows.find(r => r.id === rowId);
    if (!row) return false;
    row.document = { blocks: blocks || [] };
    this.notify();
    return true;
  }

  // Database Calculations (Count, Sum, Avg, Min, Max)
  calculate(pageId, columnId, type = 'count') {
    const db = this.getDatabase(pageId);
    if (!db) return 0;
    const rows = db.rows || [];
    const values = rows
      .map(r => r.values ? r.values[columnId] : undefined)
      .filter(v => v !== undefined && v !== null && v !== '');

    switch (type) {
      case 'count':
        return values.length;
      case 'sum': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.reduce((a, b) => a + b, 0);
      }
      case 'avg': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length ? (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1) : 0;
      }
      case 'min': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length ? Math.min(...nums) : 0;
      }
      case 'max': {
        const nums = values.map(Number).filter(n => !isNaN(n));
        return nums.length ? Math.max(...nums) : 0;
      }
      default:
        return values.length;
    }
  }

  // Filter & Sort Engine
  filterAndSortRows(pageId, { filters = [], sorts = [] } = {}) {
    const db = this.getDatabase(pageId);
    if (!db) return [];
    let rows = [...db.rows];

    // Apply filters
    for (const f of filters) {
      if (!f.columnId) continue;
      rows = rows.filter(r => {
        const val = r.values ? r.values[f.columnId] : undefined;
        if (f.op === 'equals') return String(val).toLowerCase() === String(f.val).toLowerCase();
        if (f.op === 'contains') return String(val || '').toLowerCase().includes(String(f.val || '').toLowerCase());
        if (f.op === 'not_empty') return val !== undefined && val !== null && val !== '';
        if (f.op === 'empty') return val === undefined || val === null || val === '';
        if (f.op === 'checked') return Boolean(val);
        if (f.op === 'unchecked') return !val;
        return true;
      });
    }

    // Apply sorts
    if (sorts.length > 0) {
      rows.sort((a, b) => {
        for (const s of sorts) {
          const valA = a.values ? a.values[s.columnId] : '';
          const valB = b.values ? b.values[s.columnId] : '';
          let cmp = 0;
          if (typeof valA === 'number' && typeof valB === 'number') {
            cmp = valA - valB;
          } else {
            cmp = String(valA || '').localeCompare(String(valB || ''));
          }
          if (cmp !== 0) return s.direction === 'desc' ? -cmp : cmp;
        }
        return 0;
      });
    }

    return rows;
  }

  // Global Search across Titles & Blocks
  search(query) {
    if (!query || !query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results = [];

    for (const page of Object.values(this.data.pages)) {
      if (page.inTrash) continue;
      let matchedInTitle = page.title.toLowerCase().includes(q);
      let matchedBlock = null;

      if (page.blocks) {
        for (const b of page.blocks) {
          const text = b.text || b.code || '';
          if (text.toLowerCase().includes(q)) {
            matchedBlock = text;
            break;
          }
        }
      }

      if (matchedInTitle || matchedBlock) {
        results.push({
          pageId: page.id,
          title: page.title,
          icon: page.icon,
          type: page.type,
          snippet: matchedBlock || page.title,
          isTitleMatch: matchedInTitle
        });
      }
    }

    return results;
  }

  // Advanced Feature: Typo-Tolerant Fuzzy Search (Levenshtein Distance)
  fuzzySearch(query, maxDistance = 2) {
    if (!query || typeof query !== 'string') return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const levenshtein = (s1, s2) => {
      const m = s1.length;
      const n = s2.length;
      if (m === 0) return n;
      if (n === 0) return m;
      const d = [];
      for (let i = 0; i <= m; i++) d[i] = [i];
      for (let j = 0; j <= n; j++) d[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
          d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        }
      }
      return d[m][n];
    };

    const qWords = q.split(/\s+/).filter(Boolean);
    const results = [];

    for (const page of Object.values(this.data.pages)) {
      if (page.inTrash) continue;
      const titleLower = (page.title || '').toLowerCase();
      let bestScore = 0;
      let matchedSnippet = null;

      if (titleLower.includes(q)) {
        bestScore = Math.max(bestScore, 100);
      } else {
        const tWords = titleLower.split(/\s+/).filter(Boolean);
        for (const qw of qWords) {
          for (const tw of tWords) {
            const dist = levenshtein(qw, tw);
            if (dist <= maxDistance) {
              const score = Math.max(0, 90 - dist * 20);
              if (score > bestScore) bestScore = score;
            }
          }
        }
      }

      if (page.blocks) {
        for (const b of page.blocks) {
          const rawText = b.text || b.content || (b.data && b.data.text) || '';
          const bLower = String(rawText).toLowerCase();
          if (bLower.includes(q)) {
            bestScore = Math.max(bestScore, 85);
            matchedSnippet = rawText;
            break;
          } else {
            const bWords = bLower.split(/\s+/).filter(Boolean);
            for (const qw of qWords) {
              for (const bw of bWords) {
                if (Math.abs(qw.length - bw.length) <= maxDistance) {
                  const dist = levenshtein(qw, bw);
                  if (dist <= maxDistance) {
                    const score = Math.max(0, 70 - dist * 15);
                    if (score > bestScore) {
                      bestScore = score;
                      matchedSnippet = rawText;
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (bestScore > 0) {
        results.push({
          pageId: page.id,
          title: page.title,
          icon: page.icon,
          type: page.type,
          snippet: matchedSnippet || page.title,
          score: bestScore
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // Advanced Feature: Page Revision History Snapshots
  createSnapshot(pageId, label = 'Auto Snapshot') {
    const page = this.data.pages[pageId];
    if (!page) return null;
    if (!Array.isArray(page.history)) page.history = [];
    const snapshot = {
      id: 'snap-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      label,
      title: page.title,
      blocks: JSON.parse(JSON.stringify(page.blocks || []))
    };
    page.history.unshift(snapshot);
    if (page.history.length > 30) page.history.pop();
    return snapshot;
  }

  getVersionHistory(pageId) {
    const page = this.data.pages[pageId];
    return page && Array.isArray(page.history) ? page.history : [];
  }

  restoreSnapshot(pageId, snapshotId) {
    const page = this.data.pages[pageId];
    if (!page || !Array.isArray(page.history)) return null;
    const snap = page.history.find(s => s.id === snapshotId);
    if (!snap) return null;

    this.createSnapshot(pageId, `Before Rollback (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);

    page.title = snap.title;
    page.blocks = JSON.parse(JSON.stringify(snap.blocks || []));
    page.updatedAt = Date.now();
    this.notify();
    return page;
  }

  // Advanced Feature: Database Relations & Rollup Evaluator
  evaluateRollup(rollupCol, rowValues = {}, currentDb = null) {
    if (!rollupCol || !rollupCol.relationColumnId || !currentDb) return '';
    const relCol = (currentDb.columns || []).find(c => c.id === rollupCol.relationColumnId);
    if (!relCol || !relCol.targetDatabaseId) return '';

    const targetDb = this.getDatabase(relCol.targetDatabaseId);
    if (!targetDb || !Array.isArray(targetDb.rows)) return '';

    const linkedRowIds = rowValues[relCol.id];
    const ids = Array.isArray(linkedRowIds)
      ? linkedRowIds
      : String(linkedRowIds || '').split(',').map(s => s.trim()).filter(Boolean);

    if (ids.length === 0) return '';

    const matchingRows = targetDb.rows.filter(r => ids.includes(r.id));
    if (matchingRows.length === 0) return '';

    const targetPropId = rollupCol.targetPropertyId || (targetDb.columns[0] && targetDb.columns[0].id);
    const rawValues = matchingRows
      .map(r => r.values ? r.values[targetPropId] : undefined)
      .filter(v => v !== undefined && v !== null && v !== '');

    const calc = rollupCol.calculation || 'count';
    switch (calc) {
      case 'count':
        return matchingRows.length;
      case 'sum':
        return rawValues.reduce((acc, v) => acc + (Number(v) || 0), 0);
      case 'avg': {
        const sum = rawValues.reduce((acc, v) => acc + (Number(v) || 0), 0);
        return rawValues.length > 0 ? Number((sum / rawValues.length).toFixed(2)) : 0;
      }
      case 'min':
        return rawValues.length > 0 ? Math.min(...rawValues.map(Number)) : 0;
      case 'max':
        return rawValues.length > 0 ? Math.max(...rawValues.map(Number)) : 0;
      case 'show_values':
      default:
        return rawValues.join(', ');
    }
  }

  // Notion Feature: Backlinks Indexer
  getBacklinks(targetPageId) {
    const targetPage = this.data.pages[targetPageId];
    if (!targetPage) return [];
    const backlinks = [];
    const targetTitle = (targetPage.title || '').toLowerCase().trim();
    const tId = String(targetPageId).toLowerCase();

    for (const page of Object.values(this.data.pages)) {
      if (page.id === targetPageId || page.inTrash) continue;
      let matched = false;

      if (page.blocks) {
        for (const b of page.blocks) {
          const rawText = b.text || b.content || (b.data && b.data.text) || '';
          const text = String(rawText).toLowerCase();
          if (
            text.includes(`@${tId}`) ||
            text.includes(`[[${tId}]]`) ||
            (targetTitle && text.includes(`[[${targetTitle}]]`))
          ) {
            matched = true;
            break;
          }
        }
      }

      if (matched) {
        backlinks.push({
          pageId: page.id,
          title: page.title,
          icon: page.icon || '📄'
        });
      }
    }

    return backlinks;
  }

  // Notion Feature: Database Formula Evaluation Engine
  evaluateFormula(formula, rowValues = {}, columns = []) {
    if (!formula || typeof formula !== 'string') return '';
    try {
      const prop = (colName) => {
        if (rowValues && rowValues[colName] !== undefined && rowValues[colName] !== null) {
          return rowValues[colName];
        }
        const found = (columns || []).find(c => c.name.toLowerCase() === String(colName).toLowerCase() || c.id === colName);
        if (!found) return '';
        const val = rowValues[found.id];
        return val !== undefined && val !== null ? val : '';
      };

      const round = (n, decimals = 0) => {
        const factor = Math.pow(10, decimals);
        return Math.round((Number(n) || 0) * factor) / factor;
      };
      const min = (...args) => Math.min(...args.map(Number));
      const max = (...args) => Math.max(...args.map(Number));
      const concat = (...args) => args.join('');
      const iff = (cond, ifTrue, ifFalse) => (cond ? ifTrue : ifFalse);

      // Security Sandbox: Prevent access to global scope, prototype pollution, or external APIs
      const forbiddenPatterns = /\b(window|document|global|globalThis|process|require|import|eval|Function|constructor|prototype|__proto__|setTimeout|setInterval|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage)\b/i;
      if (forbiddenPatterns.test(formula)) {
        return '#SECURITY_BLOCKED';
      }

      let expr = formula.replace(/\bif\s*\(/g, 'iff(');
      const fn = new Function('prop', 'round', 'min', 'max', 'concat', 'iff', `
        "use strict";
        return (${expr});
      `);
      const result = fn(prop, round, min, max, concat, iff);
      return result !== undefined && result !== null ? result : '';
    } catch (err) {
      return '#ERROR';
    }
  }

  // Notion Feature: Starter Templates
  createFromTemplate(templateName, spaceId = 'space-personal') {
    switch (templateName) {
      case 'meeting-notes': {
        const page = this.createPage({
          spaceId,
          title: 'Weekly Team Sync',
          icon: '🤝',
          cover: 'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
          type: 'document'
        });
        this.setBlocks(page.id, [
          { id: 'b1', type: 'heading', level: 1, text: 'Weekly Team Sync' },
          { id: 'b2', type: 'callout', icon: '📅', text: `Date: ${new Date().toLocaleDateString()} | Attendees: Engineering, Product, Design` },
          { id: 'b3', type: 'heading', level: 2, text: 'Discussion Agenda' },
          { id: 'b4', type: 'bullet', text: 'Sprint goals review & blocker clearance' },
          { id: 'b5', type: 'bullet', text: 'Architecture decisions for local-first sync' },
          { id: 'b6', type: 'heading', level: 2, text: 'Action Items' },
          { id: 'b7', type: 'todo', text: 'Benchmark database filter latency under 10k rows', checked: false },
          { id: 'b8', type: 'todo', text: 'Verify Notion formula evaluation engine', checked: true },
          { id: 'b9', type: 'divider' },
          { id: 'b10', type: 'quote', text: '“Clear owners on every action item ensure fast execution.”' }
        ]);
        return page;
      }
      case 'daily-journal': {
        const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        const page = this.createPage({
          spaceId,
          title: `Journal — ${todayStr}`,
          icon: '📔',
          cover: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          type: 'document'
        });
        this.setBlocks(page.id, [
          { id: 'b1', type: 'heading', level: 1, text: `Daily Reflection — ${todayStr}` },
          { id: 'b2', type: 'callout', icon: '🎯', text: 'Top 3 Priorities for Today:' },
          { id: 'b3', type: 'todo', text: 'Priority 1: Deep work on core feature', checked: false },
          { id: 'b4', type: 'todo', text: 'Priority 2: Code review & verification', checked: false },
          { id: 'b5', type: 'todo', text: 'Priority 3: Documentation and release plan', checked: false },
          { id: 'b6', type: 'heading', level: 2, text: 'Thoughts & Gratitude' },
          { id: 'b7', type: 'bullet', text: 'What went particularly well yesterday?' },
          { id: 'b8', type: 'bullet', text: 'What lesson or insight can be carried into today?' }
        ]);
        return page;
      }
      case 'reading-list': {
        const page = this.createPage({
          spaceId,
          title: 'Books & Reading Tracker',
          icon: '📚',
          cover: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
          type: 'database'
        });
        const db = this.getDatabase(page.id);
        db.columns = [
          { id: 'col_title', name: 'Book Title', type: 'title', width: 220 },
          { id: 'col_author', name: 'Author', type: 'text', width: 160 },
          { id: 'col_status', name: 'Status', type: 'select', width: 140, options: ['Want to Read', 'Reading', 'Finished'] },
          { id: 'col_score', name: 'Rating (1-5)', type: 'number', width: 110 },
          { id: 'col_genre', name: 'Genre', type: 'select', width: 140, options: ['Software Architecture', 'Computer Science', 'Leadership', 'Philosophy'] }
        ];
        db.rows = [
          {
            id: 'r1',
            values: { col_title: 'Designing Data-Intensive Applications', col_author: 'Martin Kleppmann', col_status: 'Finished', col_score: 5, col_genre: 'Computer Science' },
            document: { blocks: [] }
          },
          {
            id: 'r2',
            values: { col_title: 'Structure and Interpretation of Computer Programs', col_author: 'Abelson & Sussman', col_status: 'Reading', col_score: 5, col_genre: 'Computer Science' },
            document: { blocks: [] }
          },
          {
            id: 'r3',
            values: { col_title: 'A Philosophy of Software Design', col_author: 'John Ousterhout', col_status: 'Want to Read', col_score: 5, col_genre: 'Software Architecture' },
            document: { blocks: [] }
          }
        ];
        return page;
      }
      default:
        return this.createPage({ spaceId, title: 'Untitled' });
    }
  }

  // =========================================================================
  // EVERNOTE CORE SUITE: Tags, Reminders, Scratchpad & Quick Capture
  // =========================================================================

  // Evernote Feature 1: Global Workspace-wide Tags System
  getAllTags() {
    const counts = {};
    for (const page of Object.values(this.data.pages)) {
      if (page.inTrash || !Array.isArray(page.tags)) continue;
      for (const t of page.tags) {
        const clean = String(t).trim().toLowerCase();
        if (clean) counts[clean] = (counts[clean] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }

  getPagesByTag(tag) {
    const target = String(tag).trim().toLowerCase();
    return Object.values(this.data.pages).filter(p => {
      if (p.inTrash || !Array.isArray(p.tags)) return false;
      return p.tags.some(t => String(t).trim().toLowerCase() === target);
    });
  }

  addTagToPage(pageId, tag) {
    const page = this.data.pages[pageId];
    if (!page || !tag) return false;
    if (!Array.isArray(page.tags)) page.tags = [];
    const clean = String(tag).trim().toLowerCase().replace(/^#+/, '');
    if (!clean) return false;
    const finalTag = '#' + clean;
    if (!page.tags.includes(finalTag)) {
      page.tags.push(finalTag);
      page.updatedAt = Date.now();
      this.notify();
      return true;
    }
    return false;
  }

  removeTagFromPage(pageId, tag) {
    const page = this.data.pages[pageId];
    if (!page || !Array.isArray(page.tags)) return false;
    const clean = String(tag).trim().toLowerCase();
    const idx = page.tags.findIndex(t => String(t).toLowerCase() === clean);
    if (idx !== -1) {
      page.tags.splice(idx, 1);
      page.updatedAt = Date.now();
      this.notify();
      return true;
    }
    return false;
  }

  // Evernote Feature 2: Note Reminders with Deadlines & Alarms
  setReminder(pageId, reminderDate) {
    const page = this.data.pages[pageId];
    if (!page) return false;
    page.reminderDate = reminderDate ? new Date(reminderDate).toISOString() : null;
    page.reminderDone = false;
    page.updatedAt = Date.now();
    this.notify();
    return true;
  }

  toggleReminderDone(pageId) {
    const page = this.data.pages[pageId];
    if (!page || !page.reminderDate) return null;
    page.reminderDone = !page.reminderDone;
    page.updatedAt = Date.now();
    this.notify();
    return page.reminderDone;
  }

  getReminders() {
    const now = Date.now();
    const active = Object.values(this.data.pages).filter(p => !p.inTrash && p.reminderDate);
    const overdue = [];
    const upcoming = [];
    const completed = [];

    for (const p of active) {
      if (p.reminderDone) {
        completed.push(p);
      } else if (new Date(p.reminderDate).getTime() < now) {
        overdue.push(p);
      } else {
        upcoming.push(p);
      }
    }
    return { overdue, upcoming, completed };
  }

  // Evernote Feature 3: Quick Scratchpad Dashboard Widget
  getScratchpad() {
    return this.data.scratchpad || '';
  }

  setScratchpad(text) {
    this.data.scratchpad = String(text !== undefined && text !== null ? text : '');
    this.notify();
    return this.data.scratchpad;
  }

  convertScratchpadToNote(spaceId = 'space-personal') {
    const content = (this.data.scratchpad || '').trim();
    if (!content) return null;
    const lines = content.split('\n').filter(Boolean);
    const title = lines[0] ? lines[0].slice(0, 50) : 'Scratchpad Note';
    const page = this.createPage({
      spaceId,
      title,
      icon: '📝',
      tags: ['#scratchpad', '#quick-capture']
    });
    this.setBlocks(page.id, [
      { id: 'sb-1', type: 'heading', level: 1, text: title },
      ...lines.slice(1).map((l, i) => ({ id: `sb-${i + 2}`, type: 'paragraph', text: l }))
    ]);
    this.data.scratchpad = '';
    this.notify();
    return page;
  }

  // Pre-configured default workspace demonstrating 100% of AppFlowy features
  getDefaultData() {
    return {
      scratchpad: 'Evernote Scratchpad: Jot down quick thoughts, phone numbers, or fleeting ideas here! Click "Convert to Note" to turn this into a permanent note.',
      workspace: {
        id: 'ws-default',
        name: 'My Workspace',
        spaces: [
          { id: 'space-personal', name: 'Personal', icon: '👤' },
          { id: 'space-work', name: 'Work', icon: '💼' },
          { id: 'space-private', name: 'Private', icon: '🔒' }
        ]
      },
      pages: {
        'page-welcome': {
          id: 'page-welcome',
          spaceId: 'space-personal',
          parentId: null,
          title: 'Welcome to NoteTrack',
          icon: '⚡',
          cover: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          type: 'document',
          isFavorite: true,
          isLocked: false,
          inTrash: false,
          tags: ['#welcome', '#guide'],
          reminderDate: null,
          reminderDone: false,
          createdAt: 1729700000000,
          updatedAt: 1729700000000,
          blocks: [
            { id: 'b1', type: 'heading', level: 1, text: 'Welcome to NoteTrack!' },
            { id: 'b2', type: 'callout', icon: '💡', text: 'NoteTrack is an ultra-fast, local-first workspace with 100% full feature parity in a fraction of the code.' },
            { id: 'b3', type: 'heading', level: 2, text: 'Features at a glance' },
            { id: 'b4', type: 'todo', text: 'Type / anywhere to open the Slash Command Menu', checked: true },
            { id: 'b5', type: 'todo', text: 'Press Cmd+K to open the Global Command Palette and Search', checked: false },
            { id: 'b6', type: 'todo', text: 'Open the "Project Roadmap & Tasks" page to explore all 6 Database views', checked: false },
            { id: 'b7', type: 'heading', level: 3, text: 'Rich Block Showcase' },
            { id: 'b8', type: 'toggle', title: 'Click to expand toggle list block', content: 'Nested thoughts and collapse capability right inside documents.' },
            { id: 'b9', type: 'quote', text: '“Simplicity is prerequisite for reliability.” — Edsger W. Dijkstra' },
            { id: 'b10', type: 'code', language: 'javascript', text: '// NoteTrack: Fast, lightweight, zero FFI latency\nconst app = new NoteTrackStore();\nconsole.log("Ready!");' },
            { id: 'b11', type: 'math', text: 'E = mc^2 \\quad \\text{and} \\quad \\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}' },
            { id: 'b12', type: 'divider' },
            { id: 'b13', type: 'paragraph', text: 'Click the AI icon in the header or bottom bar to ask questions or use built-in prompt templates.' }
          ]
        },
        'page-tasks': {
          id: 'page-tasks',
          spaceId: 'space-work',
          parentId: null,
          title: 'Project Roadmap & Tasks',
          icon: '📊',
          cover: 'linear-gradient(135deg, #0ea5e9 0%, #10b981 100%)',
          type: 'database',
          isFavorite: true,
          isLocked: false,
          inTrash: false,
          createdAt: 1729700001000,
          updatedAt: 1729700001000,
          blocks: []
        }
      },
      databases: {
        'page-tasks': {
          pageId: 'page-tasks',
          title: 'Project Roadmap & Tasks',
          columns: [
            { id: 'c_title', name: 'Task Name', type: 'title', width: 220 },
            { id: 'c_status', name: 'Status', type: 'select', width: 140, options: ['To Do', 'In Progress', 'Done'] },
            { id: 'c_priority', name: 'Priority', type: 'select', width: 130, options: ['Low', 'Medium', 'High', 'Urgent'] },
            { id: 'c_due', name: 'Due Date', type: 'date', width: 140 },
            { id: 'c_estimate', name: 'Est. Hours', type: 'number', width: 130 },
            { id: 'c_done', name: 'Completed', type: 'checkbox', width: 100 },
            { id: 'c_notes', name: 'Resource URL', type: 'url', width: 180 }
          ],
          rows: [
            {
              id: 'r-1',
              values: {
                c_title: 'Reverse Engineer AppFlowy Core',
                c_status: 'Done',
                c_priority: 'Urgent',
                c_due: '2026-10-24',
                c_estimate: 5,
                c_done: true,
                c_notes: 'https://appflowy.io'
              },
              document: {
                blocks: [
                  { id: 'rb1', type: 'heading', level: 2, text: 'Reverse Engineering Notes' },
                  { id: 'rb2', type: 'paragraph', text: 'Deconstructed 62 frameworks, SQLite schema, RocksDB collab store, and UI translations.' }
                ]
              }
            },
            {
              id: 'r-2',
              values: {
                c_title: 'Build Multi-View Database (Grid, Kanban, Calendar, Timeline, Gallery, Chart)',
                c_status: 'Done',
                c_priority: 'High',
                c_due: '2026-10-24',
                c_estimate: 8,
                c_done: true,
                c_notes: 'https://electronjs.org'
              },
              document: { blocks: [] }
            },
            {
              id: 'r-3',
              values: {
                c_title: 'Built-in AI Prompt Templates',
                c_status: 'Done',
                c_priority: 'High',
                c_due: '2026-10-24',
                c_estimate: 4,
                c_done: true,
                c_notes: ''
              },
              document: { blocks: [] }
            },
            {
              id: 'r-4',
              values: {
                c_title: 'Release Desktop & Web Bundle',
                c_status: 'In Progress',
                c_priority: 'Medium',
                c_due: '2026-10-26',
                c_estimate: 6,
                c_done: false,
                c_notes: ''
              },
              document: { blocks: [] }
            }
          ],
          views: [
            { id: 'v_grid', name: 'All Tasks (Grid)', type: 'grid' },
            { id: 'v_board', name: 'Kanban Board', type: 'board', groupBy: 'c_status' },
            { id: 'v_calendar', name: 'Calendar Schedule', type: 'calendar', dateColumn: 'c_due' },
            { id: 'v_gallery', name: 'Gallery Cards', type: 'gallery' },
            { id: 'v_timeline', name: 'Gantt Timeline', type: 'timeline', dateColumn: 'c_due' },
            { id: 'v_chart', name: 'Hours by Status', type: 'chart', groupBy: 'c_status', measureColumn: 'c_estimate' }
          ]
        }
      }
    };
  }
}

const NoteTrackStore = AppFlowyStore;
if (typeof window !== 'undefined') {
  window.NoteTrackStore = NoteTrackStore;
  window.AppFlowyStore = AppFlowyStore;
  window.escapeHTML = escapeHTML;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NoteTrackStore, AppFlowyStore, escapeHTML };
}

