// src/components/database.js - Multi-View Database Engine for AppFlowy Lean
'use strict';

class DatabaseView {
  constructor(container, options = {}) {
    this.container = container;
    this.store = options.store;
    this.pageId = options.pageId;
    this.activeViewIndex = 0;
    this.filters = [];
    this.sorts = [];
    this.onUpdate = options.onUpdate || (() => {});

    this.render();
  }

  setPageId(pageId) {
    this.pageId = pageId;
    this.activeViewIndex = 0;
    this.filters = [];
    this.sorts = [];
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const db = this.store.getDatabase(this.pageId);
    if (!db) {
      this.container.innerHTML = '<div class="empty-state">No database found for this page</div>';
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'af-database-container';

    // 1. View Switcher Tabs & Controls Header
    const topBar = this.renderTopBar(db);
    wrapper.appendChild(topBar);

    // 2. Active View Render
    const activeView = db.views[this.activeViewIndex] || db.views[0];
    const viewContent = document.createElement('div');
    viewContent.className = `af-db-view-body view-type-${activeView.type}`;

    const filteredRows = this.store.filterAndSortRows(this.pageId, {
      filters: this.filters,
      sorts: this.sorts
    });

    switch (activeView.type) {
      case 'grid':
        viewContent.appendChild(this.renderGridView(db, filteredRows));
        break;
      case 'board':
        viewContent.appendChild(this.renderBoardView(db, filteredRows, activeView));
        break;
      case 'calendar':
        viewContent.appendChild(this.renderCalendarView(db, filteredRows, activeView));
        break;
      case 'gallery':
        viewContent.appendChild(this.renderGalleryView(db, filteredRows));
        break;
      case 'timeline':
        viewContent.appendChild(this.renderTimelineView(db, filteredRows, activeView));
        break;
      case 'chart':
        viewContent.appendChild(this.renderChartView(db, filteredRows, activeView));
        break;
      default:
        viewContent.appendChild(this.renderGridView(db, filteredRows));
        break;
    }

    wrapper.appendChild(viewContent);
    this.container.appendChild(wrapper);
  }

  renderTopBar(db) {
    const bar = document.createElement('div');
    bar.className = 'af-db-topbar';

    // Tabs on left
    const tabs = document.createElement('div');
    tabs.className = 'af-db-view-tabs';

    const viewIcons = {
      grid: '⊞',
      board: '📋',
      calendar: '📅',
      gallery: '🖼️',
      timeline: '⏳',
      chart: '📊'
    };

    db.views.forEach((v, idx) => {
      const tab = document.createElement('button');
      tab.className = 'db-view-tab' + (idx === this.activeViewIndex ? ' is-active' : '');
      tab.innerHTML = `<span class="v-icon">${viewIcons[v.type] || '⊞'}</span> <span>${v.name}</span>`;
      tab.onclick = () => {
        this.activeViewIndex = idx;
        this.render();
      };
      tabs.appendChild(tab);
    });

    // Action Controls on right (Filter, Sort, New Row)
    const actions = document.createElement('div');
    actions.className = 'af-db-controls';

    const filterBtn = document.createElement('button');
    filterBtn.className = 'db-control-btn' + (this.filters.length > 0 ? ' has-active' : '');
    filterBtn.innerHTML = `<span>⚡ Filter</span> ${this.filters.length ? `(${this.filters.length})` : ''}`;
    filterBtn.onclick = (e) => this.showFilterModal(e, db);

    const sortBtn = document.createElement('button');
    sortBtn.className = 'db-control-btn' + (this.sorts.length > 0 ? ' has-active' : '');
    sortBtn.innerHTML = `<span>⇅ Sort</span> ${this.sorts.length ? `(${this.sorts.length})` : ''}`;
    sortBtn.onclick = (e) => this.showSortModal(e, db);

    const newBtn = document.createElement('button');
    newBtn.className = 'db-control-btn btn-primary';
    newBtn.innerHTML = '<span>+ New</span>';
    newBtn.onclick = () => {
      this.store.addRow(this.pageId, {});
      this.render();
    };

    actions.appendChild(filterBtn);
    actions.appendChild(sortBtn);
    actions.appendChild(newBtn);

    bar.appendChild(tabs);
    bar.appendChild(actions);
    return bar;
  }

  // 1. GRID (TABLE) VIEW
  renderGridView(db, rows) {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'af-grid-wrapper';

    const table = document.createElement('table');
    table.className = 'af-grid-table';

    // Thead
    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');

    // Expand Row Column
    const openTh = document.createElement('th');
    openTh.className = 'col-open-head';
    openTh.style.width = '40px';
    headRow.appendChild(openTh);

    db.columns.forEach(col => {
      const th = document.createElement('th');
      th.className = 'af-col-head';
      th.style.width = (col.width || 140) + 'px';
      th.innerHTML = `<span class="col-type-badge">${this.getColIcon(col.type)}</span> <span class="col-name">${col.name}</span>`;

      // Header context menu (delete column)
      th.onclick = (e) => {
        if (col.type !== 'title') {
          if (confirm(`Delete column "${col.name}"?`)) {
            this.store.deleteColumn(this.pageId, col.id);
            this.render();
          }
        }
      };

      headRow.appendChild(th);
    });

    // Add Column Button Header
    const addColTh = document.createElement('th');
    addColTh.className = 'col-add-head';
    const addColBtn = document.createElement('button');
    addColBtn.className = 'add-col-btn';
    addColBtn.innerHTML = '+';
    addColBtn.title = 'Add new property column';
    addColBtn.onclick = (e) => this.showAddColumnModal(e);
    addColTh.appendChild(addColBtn);
    headRow.appendChild(addColTh);

    thead.appendChild(headRow);
    table.appendChild(thead);

    // Tbody
    const tbody = document.createElement('tbody');
    rows.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = 'af-grid-row';
      tr.dataset.rowId = r.id;

      // Open Document Button
      const openTd = document.createElement('td');
      openTd.className = 'cell-open';
      const openBtn = document.createElement('button');
      openBtn.className = 'row-open-btn';
      openBtn.innerHTML = '⤢';
      openBtn.title = 'Open row as document';
      openBtn.onclick = () => this.openRowDocumentModal(r);
      openTd.appendChild(openBtn);
      tr.appendChild(openTd);

      // Value Cells
      db.columns.forEach(col => {
        const td = document.createElement('td');
        td.className = `af-cell cell-type-${col.type}`;
        this.renderCell(td, r, col);
        tr.appendChild(td);
      });

      // Trailing empty cell
      const trailTd = document.createElement('td');
      trailTd.className = 'cell-trail';
      tr.appendChild(trailTd);

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    // Tfoot: Calculations Bar (Count, Sum, Avg, Min, Max)
    const tfoot = document.createElement('tfoot');
    const footRow = document.createElement('tr');
    footRow.className = 'af-grid-calc-row';

    const footOpen = document.createElement('td');
    footOpen.className = 'calc-cell calc-label';
    footOpen.textContent = 'Calculate';
    footRow.appendChild(footOpen);

    db.columns.forEach(col => {
      const td = document.createElement('td');
      td.className = 'calc-cell';

      let calcType = 'count';
      if (col.type === 'number') calcType = 'sum';
      const val = this.store.calculate(this.pageId, col.id, calcType);

      td.innerHTML = `<span class="calc-tag">${calcType}:</span> <span class="calc-val">${val}</span>`;
      td.title = 'Click to change calculation';
      td.onclick = () => {
        const types = ['count', 'sum', 'avg', 'min', 'max'];
        const next = types[(types.indexOf(calcType) + 1) % types.length];
        const res = this.store.calculate(this.pageId, col.id, next);
        td.innerHTML = `<span class="calc-tag">${next}:</span> <span class="calc-val">${res}</span>`;
      };

      footRow.appendChild(td);
    });

    footRow.appendChild(document.createElement('td')); // trail
    tfoot.appendChild(footRow);
    table.appendChild(tfoot);

    tableWrap.appendChild(table);

    // Add Row shortcut at bottom
    const addRowBtn = document.createElement('div');
    addRowBtn.className = 'grid-bottom-add';
    addRowBtn.innerHTML = '+ New Row';
    addRowBtn.onclick = () => {
      this.store.addRow(this.pageId, {});
      this.render();
    };
    tableWrap.appendChild(addRowBtn);

    return tableWrap;
  }

  renderCell(td, row, col) {
    const val = row.values ? row.values[col.id] : undefined;

    switch (col.type) {
      case 'checkbox': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(val);
        cb.onchange = () => {
          this.store.updateCell(this.pageId, row.id, col.id, cb.checked);
          this.onUpdate();
        };
        td.appendChild(cb);
        break;
      }

      case 'select': {
        const sel = document.createElement('select');
        sel.className = 'cell-select';
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '— Select —';
        sel.appendChild(emptyOpt);

        (col.options || []).forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (val === opt) o.selected = true;
          sel.appendChild(o);
        });

        sel.onchange = () => {
          this.store.updateCell(this.pageId, row.id, col.id, sel.value);
          this.onUpdate();
        };
        td.appendChild(sel);
        break;
      }

      case 'date': {
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.className = 'cell-date';
        dateInput.value = val || '';
        dateInput.onchange = () => {
          this.store.updateCell(this.pageId, row.id, col.id, dateInput.value);
          this.onUpdate();
        };
        td.appendChild(dateInput);
        break;
      }

      case 'number': {
        const numInput = document.createElement('input');
        numInput.type = 'number';
        numInput.className = 'cell-number';
        numInput.value = val !== undefined ? val : '';
        numInput.onchange = () => {
          this.store.updateCell(this.pageId, row.id, col.id, Number(numInput.value));
          this.onUpdate();
        };
        td.appendChild(numInput);
        break;
      }

      case 'url': {
        const textSpan = document.createElement('div');
        textSpan.contentEditable = 'true';
        textSpan.className = 'cell-text-editable';
        textSpan.textContent = val || '';
        textSpan.onblur = () => {
          this.store.updateCell(this.pageId, row.id, col.id, textSpan.textContent.trim());
          this.onUpdate();
        };
        td.appendChild(textSpan);
        if (val && String(val).startsWith('http')) {
          const a = document.createElement('a');
          a.href = val;
          a.target = '_blank';
          a.className = 'cell-link-icon';
          a.innerHTML = ' ↗';
          td.appendChild(a);
        }
        break;
      }

      case 'formula': {
        const db = this.store.getDatabase(this.pageId);
        const computed = this.store.evaluateFormula(col.formula || 'prop("c_estimate") * 1.5', row.values, db.columns);
        const formulaTag = document.createElement('div');
        formulaTag.className = 'cell-formula-result';
        formulaTag.innerHTML = `<span class="formula-fx">ƒx</span> <span>${computed}</span>`;
        formulaTag.title = `Formula: ${col.formula || 'prop("...")'}`;
        td.appendChild(formulaTag);
        break;
      }

      case 'multi_select': {
        const msWrap = document.createElement('div');
        msWrap.className = 'cell-multi-select-wrap';
        const tags = Array.isArray(val) ? val : (val ? [val] : []);
        tags.forEach(t => {
          const chip = document.createElement('span');
          chip.className = 'prop-tag tag-multi';
          chip.textContent = t;
          msWrap.appendChild(chip);
        });

        const addTagBtn = document.createElement('button');
        addTagBtn.className = 'cell-add-tag-btn';
        addTagBtn.textContent = '+';
        addTagBtn.title = 'Add tag';
        addTagBtn.onclick = (e) => {
          e.stopPropagation();
          const pick = prompt('Select tag to add:\n' + (col.options || ['Feature', 'Bug', 'Enhancement']).join(', '));
          if (pick) {
            const nextTags = [...new Set([...tags, pick.trim()])];
            this.store.updateCell(this.pageId, row.id, col.id, nextTags);
            this.render();
          }
        };
        msWrap.appendChild(addTagBtn);
        td.appendChild(msWrap);
        break;
      }

      default: {
        const textDiv = document.createElement('div');
        textDiv.contentEditable = 'true';
        textDiv.className = 'cell-text-editable';
        textDiv.textContent = val !== undefined && val !== null ? val : '';
        textDiv.onblur = () => {
          this.store.updateCell(this.pageId, row.id, col.id, textDiv.textContent.trim());
          this.onUpdate();
        };
        td.appendChild(textDiv);
        break;
      }
    }
  }

  // 2. BOARD (KANBAN) VIEW
  renderBoardView(db, rows, activeView) {
    const board = document.createElement('div');
    board.className = 'af-board-wrapper';

    const groupColId = activeView.groupBy || 'col_status';
    const groupCol = db.columns.find(c => c.id === groupColId) || db.columns[1] || db.columns[0];
    const columns = groupCol.options && groupCol.options.length > 0 ? groupCol.options : ['To Do', 'In Progress', 'Done'];

    columns.forEach(colName => {
      const colEl = document.createElement('div');
      colEl.className = 'board-column';
      colEl.dataset.colValue = colName;

      // Group Header
      const header = document.createElement('div');
      header.className = 'board-col-header';
      const colRows = rows.filter(r => r.values && r.values[groupCol.id] === colName);

      header.innerHTML = `
        <div class="col-title-group">
          <span class="board-badge badge-${colName.toLowerCase().replace(/\s+/g, '-')}">${colName}</span>
          <span class="col-count">${colRows.length}</span>
        </div>
        <button class="col-add-card-btn" title="Add card">+ </button>
      `;

      header.querySelector('.col-add-card-btn').onclick = () => {
        this.store.addRow(this.pageId, { [groupCol.id]: colName });
        this.render();
      };

      colEl.appendChild(header);

      // Cards list
      const cardsList = document.createElement('div');
      cardsList.className = 'board-cards-list';

      colRows.forEach(r => {
        const card = document.createElement('div');
        card.className = 'board-card';
        card.draggable = true;

        const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];
        const titleVal = r.values ? r.values[titleCol.id] : 'Untitled';

        card.innerHTML = `
          <div class="card-title">${titleVal}</div>
          <div class="card-props">
            ${r.values && r.values.col_priority ? `<span class="prop-tag tag-priority">${r.values.col_priority}</span>` : ''}
            ${r.values && r.values.col_date ? `<span class="prop-tag tag-date">📅 ${r.values.col_date}</span>` : ''}
            ${r.values && r.values.col_num ? `<span class="prop-tag tag-estimate">⏱️ ${r.values.col_num}h</span>` : ''}
          </div>
        `;

        card.onclick = () => this.openRowDocumentModal(r);

        // Drag and drop across columns
        card.ondragstart = (e) => {
          e.dataTransfer.setData('text/plain', r.id);
          card.classList.add('is-dragging');
        };
        card.ondragend = () => card.classList.remove('is-dragging');

        cardsList.appendChild(card);
      });

      // Dropzone handler
      colEl.ondragover = (e) => {
        e.preventDefault();
        colEl.classList.add('drag-hover');
      };
      colEl.ondragleave = () => colEl.classList.remove('drag-hover');
      colEl.ondrop = (e) => {
        e.preventDefault();
        colEl.classList.remove('drag-hover');
        const rowId = e.dataTransfer.getData('text/plain');
        if (rowId) {
          this.store.updateCell(this.pageId, rowId, groupCol.id, colName);
          this.render();
        }
      };

      colEl.appendChild(cardsList);
      board.appendChild(colEl);
    });

    return board;
  }

  // 3. CALENDAR VIEW
  renderCalendarView(db, rows, activeView) {
    const calWrap = document.createElement('div');
    calWrap.className = 'af-calendar-wrapper';

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const calHeader = document.createElement('div');
    calHeader.className = 'cal-nav-header';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    calHeader.innerHTML = `<h3>📅 ${monthNames[month]} ${year}</h3>`;
    calWrap.appendChild(calHeader);

    const grid = document.createElement('div');
    grid.className = 'cal-month-grid';

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysOfWeek.forEach(d => {
      const dHead = document.createElement('div');
      dHead.className = 'cal-day-name';
      dHead.textContent = d;
      grid.appendChild(dHead);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Leading blanks
    for (let i = 0; i < firstDay; i++) {
      const blank = document.createElement('div');
      blank.className = 'cal-cell is-blank';
      grid.appendChild(blank);
    }

    const dateCol = db.columns.find(c => c.type === 'date') || db.columns[3];

    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'cal-cell' + (day === now.getDate() ? ' is-today' : '');

      const dateNum = document.createElement('div');
      dateNum.className = 'cal-date-number';
      dateNum.textContent = day;
      cell.appendChild(dateNum);

      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const matchingRows = rows.filter(r => r.values && r.values[dateCol ? dateCol.id : ''] === dateStr);

      matchingRows.forEach(r => {
        const item = document.createElement('div');
        item.className = 'cal-event-pill';
        const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];
        item.textContent = r.values ? r.values[titleCol.id] : 'Event';
        item.onclick = (e) => {
          e.stopPropagation();
          this.openRowDocumentModal(r);
        };
        cell.appendChild(item);
      });

      cell.onclick = () => {
        this.store.addRow(this.pageId, { [dateCol.id]: dateStr });
        this.render();
      };

      grid.appendChild(cell);
    }

    calWrap.appendChild(grid);
    return calWrap;
  }

  // 4. GALLERY VIEW
  renderGalleryView(db, rows) {
    const gallery = document.createElement('div');
    gallery.className = 'af-gallery-wrapper';

    rows.forEach(r => {
      const card = document.createElement('div');
      card.className = 'gallery-card';

      const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];
      const titleVal = r.values ? r.values[titleCol.id] : 'Untitled';

      const cover = document.createElement('div');
      cover.className = 'gallery-card-cover';
      const gradients = [
        'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
        'linear-gradient(135deg, #3b82f6 0%, #2dd4bf 100%)',
        'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
        'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)'
      ];
      cover.style.background = gradients[Math.abs(r.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % gradients.length];

      const body = document.createElement('div');
      body.className = 'gallery-card-body';
      body.innerHTML = `
        <div class="gallery-title">${titleVal}</div>
        <div class="gallery-meta">
          ${r.values && r.values.col_status ? `<span class="prop-tag">${r.values.col_status}</span>` : ''}
          ${r.values && r.values.col_date ? `<span class="prop-tag">📅 ${r.values.col_date}</span>` : ''}
        </div>
      `;

      card.appendChild(cover);
      card.appendChild(body);
      card.onclick = () => this.openRowDocumentModal(r);
      gallery.appendChild(card);
    });

    const addCard = document.createElement('div');
    addCard.className = 'gallery-card is-add-card';
    addCard.innerHTML = '<div class="add-inner">+ Add Card</div>';
    addCard.onclick = () => {
      this.store.addRow(this.pageId, {});
      this.render();
    };
    gallery.appendChild(addCard);

    return gallery;
  }

  // 5. TIMELINE VIEW
  renderTimelineView(db, rows, activeView) {
    const timeWrap = document.createElement('div');
    timeWrap.className = 'af-timeline-wrapper';

    const header = document.createElement('div');
    header.className = 'timeline-header';
    header.innerHTML = '<h3>⏳ Project Gantt Timeline</h3>';
    timeWrap.appendChild(header);

    const list = document.createElement('div');
    list.className = 'timeline-rows-list';

    const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];

    rows.forEach((r, idx) => {
      const item = document.createElement('div');
      item.className = 'timeline-item';

      const label = document.createElement('div');
      label.className = 'timeline-task-name';
      label.textContent = r.values ? r.values[titleCol.id] : 'Task';

      const barTrack = document.createElement('div');
      barTrack.className = 'timeline-bar-track';

      const bar = document.createElement('div');
      bar.className = 'timeline-bar';
      // Compute visual offset based on date or index
      const offset = (idx * 15) % 65;
      const width = Math.max(25, 30 + ((idx * 20) % 45));
      bar.style.left = `${offset}%`;
      bar.style.width = `${width}%`;
      bar.textContent = r.values && r.values.col_date ? r.values.col_date : `Day ${idx + 1}`;

      bar.onclick = () => this.openRowDocumentModal(r);

      barTrack.appendChild(bar);
      item.appendChild(label);
      item.appendChild(barTrack);
      list.appendChild(item);
    });

    timeWrap.appendChild(list);
    return timeWrap;
  }

  // 6. CHART VIEW
  renderChartView(db, rows, activeView) {
    const chartWrap = document.createElement('div');
    chartWrap.className = 'af-chart-wrapper';

    const groupColId = activeView.groupBy || 'col_status';
    const groupCol = db.columns.find(c => c.id === groupColId) || db.columns[1];

    // Compute distribution counts
    const distribution = {};
    rows.forEach(r => {
      const val = (r.values && r.values[groupCol.id]) || 'Unassigned';
      distribution[val] = (distribution[val] || 0) + 1;
    });

    const header = document.createElement('div');
    header.className = 'chart-header';
    header.innerHTML = `<h3>📊 Task Distribution by ${groupCol ? groupCol.name : 'Category'}</h3>`;
    chartWrap.appendChild(header);

    const chartBox = document.createElement('div');
    chartBox.className = 'chart-bars-container';

    const maxCount = Math.max(...Object.values(distribution), 1);

    Object.entries(distribution).forEach(([category, count]) => {
      const col = document.createElement('div');
      col.className = 'chart-col';

      const bar = document.createElement('div');
      bar.className = 'chart-bar-fill';
      const pct = (count / maxCount) * 100;
      bar.style.height = `${pct}%`;
      bar.title = `${category}: ${count}`;

      const countLabel = document.createElement('div');
      countLabel.className = 'chart-count';
      countLabel.textContent = count;
      bar.appendChild(countLabel);

      const catLabel = document.createElement('div');
      catLabel.className = 'chart-category';
      catLabel.textContent = category;

      col.appendChild(bar);
      col.appendChild(catLabel);
      chartBox.appendChild(col);
    });

    chartWrap.appendChild(chartBox);
    return chartWrap;
  }

  // ROW-AS-DOCUMENT MODAL
  openRowDocumentModal(row) {
    const existing = document.getElementById('af-row-doc-modal');
    if (existing) existing.remove();

    const db = this.store.getDatabase(this.pageId);
    const titleCol = db.columns.find(c => c.type === 'title') || db.columns[0];
    const rowTitle = (row.values && row.values[titleCol.id]) || 'Untitled Record';

    const backdrop = document.createElement('div');
    backdrop.className = 'af-modal-backdrop';
    backdrop.id = 'af-row-doc-modal';

    const modal = document.createElement('div');
    modal.className = 'af-row-modal';

    // Header bar
    const bar = document.createElement('div');
    bar.className = 'row-modal-topbar';
    bar.innerHTML = `
      <span class="row-modal-badge">Row as Document</span>
      <button class="modal-close-btn">✕</button>
    `;
    bar.querySelector('.modal-close-btn').onclick = () => backdrop.remove();

    // Title
    const titleH1 = document.createElement('h1');
    titleH1.className = 'row-modal-title';
    titleH1.contentEditable = 'true';
    titleH1.textContent = rowTitle;
    titleH1.onblur = () => {
      this.store.updateCell(this.pageId, row.id, titleCol.id, titleH1.textContent.trim());
      this.render();
    };

    // Properties summary table
    const propTable = document.createElement('div');
    propTable.className = 'row-modal-properties';
    db.columns.forEach(c => {
      if (c.type === 'title') return;
      const propRow = document.createElement('div');
      propRow.className = 'modal-prop-row';
      propRow.innerHTML = `<span class="prop-name">${this.getColIcon(c.type)} ${c.name}</span>`;
      const propVal = document.createElement('div');
      propVal.className = 'prop-val-holder';
      this.renderCell(propVal, row, c);
      propRow.appendChild(propVal);
      propTable.appendChild(propRow);
    });

    // Nested Document Blocks editor container
    const docDivider = document.createElement('hr');
    docDivider.className = 'modal-doc-divider';

    const docSection = document.createElement('div');
    docSection.className = 'modal-doc-editor-section';

    modal.appendChild(bar);
    modal.appendChild(titleH1);
    modal.appendChild(propTable);
    modal.appendChild(docDivider);
    modal.appendChild(docSection);
    backdrop.appendChild(modal);

    document.body.appendChild(backdrop);

    // Mount BlockEditor inside the row document!
    const rowBlocks = this.store.getRowDocument(this.pageId, row.id);
    if (!rowBlocks || rowBlocks.length === 0) {
      this.store.setRowDocument(this.pageId, row.id, [
        { id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'paragraph', text: 'Document details for this row...' }
      ]);
    }

    // Temporary store wrapper for row document
    const rowDocProxyStore = {
      getPage: () => ({ blocks: this.store.getRowDocument(this.pageId, row.id), isLocked: false }),
      setBlocks: (_id, blocks) => this.store.setRowDocument(this.pageId, row.id, blocks),
      insertBlock: (_id, b, idx) => {
        const blocks = this.store.getRowDocument(this.pageId, row.id);
        if (idx !== undefined && idx >= 0) blocks.splice(idx, 0, b);
        else blocks.push(b);
        this.store.setRowDocument(this.pageId, row.id, blocks);
        return b;
      },
      updateBlock: (_id, bId, patch) => {
        const blocks = this.store.getRowDocument(this.pageId, row.id);
        const item = blocks.find(x => x.id === bId);
        if (item) Object.assign(item, patch);
        this.store.setRowDocument(this.pageId, row.id, blocks);
        return item;
      },
      removeBlock: (_id, bId) => {
        let blocks = this.store.getRowDocument(this.pageId, row.id);
        blocks = blocks.filter(x => x.id !== bId);
        this.store.setRowDocument(this.pageId, row.id, blocks);
        return true;
      },
      moveBlock: () => {}
    };

    if (typeof BlockEditor !== 'undefined') {
      new BlockEditor(docSection, {
        store: rowDocProxyStore,
        pageId: 'row-doc-' + row.id
      });
    }

    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  showAddColumnModal(e) {
    const colName = prompt('Enter property name:');
    if (!colName || !colName.trim()) return;

    const typeStr = prompt('Property type (text, number, select, multi_select, formula, date, checkbox, url):', 'text');
    const validTypes = ['text', 'number', 'select', 'multi_select', 'formula', 'date', 'checkbox', 'url'];
    const type = validTypes.includes(typeStr) ? typeStr : 'text';

    let options = [];
    let formula = '';
    if (type === 'select' || type === 'multi_select') {
      const optsStr = prompt('Comma-separated options:', 'Feature, Bug, Enhancement');
      if (optsStr) options = optsStr.split(',').map(s => s.trim()).filter(Boolean);
    } else if (type === 'formula') {
      formula = prompt('Enter formula expression (e.g. prop("col_estimate") * 1.5):', 'prop("col_estimate") * 2') || '';
    }

    const col = this.store.addColumn(this.pageId, { name: colName.trim(), type, options });
    if (col && formula) col.formula = formula;
    this.render();
  }

  showFilterModal(e, db) {
    const colName = prompt('Filter by column:\n' + db.columns.map(c => c.name).join(', '));
    if (!colName) {
      this.filters = [];
      this.render();
      return;
    }
    const col = db.columns.find(c => c.name.toLowerCase() === colName.trim().toLowerCase());
    if (!col) return;

    const op = prompt('Operator (equals, contains, not_empty, empty, checked, unchecked):', 'contains');
    let val = '';
    if (op === 'equals' || op === 'contains') {
      val = prompt('Filter value:') || '';
    }

    this.filters = [{ columnId: col.id, op, val }];
    this.render();
  }

  showSortModal(e, db) {
    const colName = prompt('Sort by column:\n' + db.columns.map(c => c.name).join(', '));
    if (!colName) {
      this.sorts = [];
      this.render();
      return;
    }
    const col = db.columns.find(c => c.name.toLowerCase() === colName.trim().toLowerCase());
    if (!col) return;

    const dir = prompt('Direction (asc / desc):', 'asc');
    this.sorts = [{ columnId: col.id, direction: dir === 'desc' ? 'desc' : 'asc' }];
    this.render();
  }

  getColIcon(type) {
    const icons = {
      title: '🔤',
      text: '📝',
      number: '#️⃣',
      select: '🏷️',
      date: '📅',
      checkbox: '☑️',
      url: '🔗',
      formula: 'ƒx',
      multi_select: '🏷️🏷️'
    };
    return icons[type] || '📄';
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DatabaseView };
}
