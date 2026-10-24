// src/components/editor.js - Block-based Document Editor for AppFlowy Lean
'use strict';

class BlockEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.store = options.store;
    this.pageId = options.pageId;
    this.isReadOnly = options.isReadOnly || false;
    this.onUpdate = options.onUpdate || (() => {});
    this.slashMenuIndex = 0;
    this.activeBlockId = null;

    this.slashOptions = [
      { type: 'paragraph', label: 'Text', desc: 'Just start writing with plain text.', icon: '📝' },
      { type: 'heading', level: 1, label: 'Heading 1', desc: 'Big section heading.', icon: 'H1' },
      { type: 'heading', level: 2, label: 'Heading 2', desc: 'Medium section heading.', icon: 'H2' },
      { type: 'heading', level: 3, label: 'Heading 3', desc: 'Small section heading.', icon: 'H3' },
      { type: 'todo', label: 'To-do List', desc: 'Track tasks with a to-do list.', icon: '☑️' },
      { type: 'bullet', label: 'Bulleted List', desc: 'Create a simple bulleted list.', icon: '•' },
      { type: 'number', label: 'Numbered List', desc: 'Create a list with numbering.', icon: '1.' },
      { type: 'toggle', label: 'Toggle List', desc: 'Toggles can hide and show content.', icon: '▶' },
      { type: 'callout', label: 'Callout', desc: 'Make writing stand out.', icon: '💡' },
      { type: 'quote', label: 'Quote', desc: 'Capture a quote.', icon: '❝' },
      { type: 'code', label: 'Code Block', desc: 'Capture a code snippet with formatting.', icon: '💻' },
      { type: 'math', label: 'Math Equation', desc: 'Render mathematical TeX expressions.', icon: '√x' },
      { type: 'divider', label: 'Divider', desc: 'Visually divide blocks.', icon: '—' },
      { type: 'image', label: 'Image', desc: 'Embed with a link or upload.', icon: '🖼️' },
      { type: 'toc', label: 'Table of Contents', desc: 'Auto-generated outline of page headings.', icon: '📑' },
      { type: 'table', label: 'Simple Table', desc: '2D grid table with custom rows and columns.', icon: '⊞' },
      { type: 'bookmark', label: 'Web Bookmark', desc: 'Visual link preview card.', icon: '🔗' },
      { type: 'synced', label: 'Synced Block', desc: 'Sync content across multiple pages.', icon: '🔄' },
      { type: 'audio', label: 'Voice Memo / Audio', desc: 'Evernote audio voice recorder and player.', icon: '🎙️' },
      { type: 'clip', label: 'Web Clip', desc: 'Evernote clipped web article snippet.', icon: '📎' }
    ];

    this.render();
  }

  setPageId(pageId) {
    this.pageId = pageId;
    const page = this.store.getPage(pageId);
    this.isReadOnly = page ? page.isLocked : false;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    const page = this.store.getPage(this.pageId);
    if (!page) {
      this.container.innerHTML = '<div class="empty-state">No page selected</div>';
      return;
    }

    const editorEl = document.createElement('div');
    editorEl.className = 'af-editor' + (this.isReadOnly ? ' is-locked' : '');

    const blocks = page.blocks || [];
    if (blocks.length === 0) {
      blocks.push({ id: 'b-' + Math.random().toString(36).slice(2, 8), type: 'paragraph', text: '' });
      this.store.setBlocks(this.pageId, blocks);
    }

    blocks.forEach((block, index) => {
      const blockEl = this.renderBlock(block, index);
      editorEl.appendChild(blockEl);
    });

    // Add trailing click target to append block
    if (!this.isReadOnly) {
      const addRow = document.createElement('div');
      addRow.className = 'editor-bottom-adder';
      addRow.textContent = '+ Click or press Enter to add a block';
      addRow.onclick = () => {
        this.store.insertBlock(this.pageId, { type: 'paragraph', text: '' });
        this.render();
      };
      editorEl.appendChild(addRow);
    }

    this.container.appendChild(editorEl);
  }

  renderBlock(block, index) {
    const row = document.createElement('div');
    row.className = `block-row block-${block.type}`;
    row.dataset.blockId = block.id;

    // Handle / Block Tools (drag handle, add button, menu)
    if (!this.isReadOnly) {
      const tools = document.createElement('div');
      tools.className = 'block-tools';

      const addBtn = document.createElement('button');
      addBtn.className = 'tool-btn add-btn';
      addBtn.innerHTML = '+';
      addBtn.title = 'Add block below';
      addBtn.onclick = (e) => {
        e.stopPropagation();
        this.store.insertBlock(this.pageId, { type: 'paragraph', text: '' }, index + 1);
        this.render();
      };

      const handleBtn = document.createElement('button');
      handleBtn.className = 'tool-btn drag-handle';
      handleBtn.innerHTML = '⋮⋮';
      handleBtn.title = 'Block actions';
      handleBtn.onclick = (e) => {
        e.stopPropagation();
        this.showBlockMenu(e, block, index);
      };

      tools.appendChild(addBtn);
      tools.appendChild(handleBtn);
      row.appendChild(tools);
    }

    // Block Content Container
    const content = document.createElement('div');
    content.className = 'block-content';

    switch (block.type) {
      case 'heading': {
        const h = document.createElement(`h${block.level || 1}`);
        h.className = `af-heading af-h${block.level || 1}`;
        this.makeEditable(h, block, 'text');
        content.appendChild(h);
        break;
      }

      case 'paragraph': {
        const p = document.createElement('p');
        p.className = 'af-paragraph';
        this.makeEditable(p, block, 'text');
        content.appendChild(p);
        break;
      }

      case 'todo': {
        const todoBox = document.createElement('div');
        todoBox.className = 'af-todo' + (block.checked ? ' is-checked' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(block.checked);
        checkbox.disabled = this.isReadOnly;
        checkbox.onchange = () => {
          this.store.updateBlock(this.pageId, block.id, { checked: checkbox.checked });
          todoBox.classList.toggle('is-checked', checkbox.checked);
          this.onUpdate();
        };

        const label = document.createElement('div');
        label.className = 'af-todo-text';
        this.makeEditable(label, block, 'text');

        todoBox.appendChild(checkbox);
        todoBox.appendChild(label);
        content.appendChild(todoBox);
        break;
      }

      case 'bullet': {
        const bItem = document.createElement('div');
        bItem.className = 'af-list-item af-bullet';
        const marker = document.createElement('span');
        marker.className = 'list-marker';
        marker.textContent = '•';
        const textEl = document.createElement('div');
        textEl.className = 'list-text';
        this.makeEditable(textEl, block, 'text');
        bItem.appendChild(marker);
        bItem.appendChild(textEl);
        content.appendChild(bItem);
        break;
      }

      case 'number': {
        const nItem = document.createElement('div');
        nItem.className = 'af-list-item af-number';
        const marker = document.createElement('span');
        marker.className = 'list-marker';
        marker.textContent = `${index + 1}.`;
        const textEl = document.createElement('div');
        textEl.className = 'list-text';
        this.makeEditable(textEl, block, 'text');
        nItem.appendChild(marker);
        nItem.appendChild(textEl);
        content.appendChild(nItem);
        break;
      }

      case 'toggle': {
        const details = document.createElement('details');
        details.className = 'af-toggle';
        if (block.open) details.open = true;

        const summary = document.createElement('summary');
        summary.className = 'af-toggle-summary';
        const summaryText = document.createElement('span');
        summaryText.className = 'summary-title';
        summaryText.textContent = block.title || 'Toggle item';
        if (!this.isReadOnly) {
          summaryText.contentEditable = 'true';
          summaryText.onblur = () => {
            this.store.updateBlock(this.pageId, block.id, { title: summaryText.textContent });
            this.onUpdate();
          };
        }
        summary.appendChild(summaryText);
        details.appendChild(summary);

        const body = document.createElement('div');
        body.className = 'af-toggle-body';
        this.makeEditable(body, block, 'content');
        details.appendChild(body);

        details.ontoggle = () => {
          this.store.updateBlock(this.pageId, block.id, { open: details.open });
        };

        content.appendChild(details);
        break;
      }

      case 'callout': {
        const callout = document.createElement('div');
        callout.className = 'af-callout';
        const iconSpan = document.createElement('span');
        iconSpan.className = 'callout-icon';
        iconSpan.textContent = block.icon || '💡';
        const textSpan = document.createElement('div');
        textSpan.className = 'callout-text';
        this.makeEditable(textSpan, block, 'text');
        callout.appendChild(iconSpan);
        callout.appendChild(textSpan);
        content.appendChild(callout);
        break;
      }

      case 'quote': {
        const q = document.createElement('blockquote');
        q.className = 'af-quote';
        this.makeEditable(q, block, 'text');
        content.appendChild(q);
        break;
      }

      case 'code': {
        const codeWrap = document.createElement('div');
        codeWrap.className = 'af-code-block';

        const bar = document.createElement('div');
        bar.className = 'code-bar';
        const langTag = document.createElement('span');
        langTag.className = 'code-lang';
        langTag.textContent = block.language || 'javascript';

        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn';
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(block.text || '');
          copyBtn.textContent = 'Copied!';
          setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
        };

        bar.appendChild(langTag);
        bar.appendChild(copyBtn);
        codeWrap.appendChild(bar);

        const pre = document.createElement('pre');
        const codeEl = document.createElement('code');
        this.makeEditable(codeEl, block, 'text');
        pre.appendChild(codeEl);
        codeWrap.appendChild(pre);

        content.appendChild(codeWrap);
        break;
      }

      case 'math': {
        const mathWrap = document.createElement('div');
        mathWrap.className = 'af-math-block';

        const formulaDisplay = document.createElement('div');
        formulaDisplay.className = 'math-rendered';

        // Render with KaTeX if present, otherwise format nicely
        if (typeof katex !== 'undefined') {
          try {
            katex.render(block.text || 'f(x) = y', formulaDisplay, { displayMode: true, throwOnError: false });
          } catch (e) {
            formulaDisplay.textContent = block.text || '';
          }
        } else {
          formulaDisplay.innerHTML = `<span class="math-symbol">∑</span> <code>${block.text || ''}</code>`;
        }

        if (!this.isReadOnly) {
          const editInput = document.createElement('input');
          editInput.className = 'math-input';
          editInput.value = block.text || '';
          editInput.placeholder = 'Enter TeX expression... e.g. E = mc^2';
          editInput.oninput = () => {
            this.store.updateBlock(this.pageId, block.id, { text: editInput.value });
            if (typeof katex !== 'undefined') {
              try {
                katex.render(editInput.value || ' ', formulaDisplay, { displayMode: true, throwOnError: false });
              } catch (_) {}
            } else {
              formulaDisplay.querySelector('code').textContent = editInput.value;
            }
            this.onUpdate();
          };
          mathWrap.appendChild(formulaDisplay);
          mathWrap.appendChild(editInput);
        } else {
          mathWrap.appendChild(formulaDisplay);
        }

        content.appendChild(mathWrap);
        break;
      }

      case 'divider': {
        const hr = document.createElement('hr');
        hr.className = 'af-divider';
        content.appendChild(hr);
        break;
      }

      case 'image': {
        const imgWrap = document.createElement('div');
        imgWrap.className = 'af-image-block';
        if (block.url) {
          const img = document.createElement('img');
          img.src = block.url;
          img.alt = block.alt || 'image';
          imgWrap.appendChild(img);
        }
        if (!this.isReadOnly) {
          const urlInput = document.createElement('input');
          urlInput.className = 'image-url-input';
          urlInput.placeholder = 'Enter Image URL...';
          urlInput.value = block.url || '';
          urlInput.onchange = () => {
            this.store.updateBlock(this.pageId, block.id, { url: urlInput.value });
            this.render();
          };
          imgWrap.appendChild(urlInput);
        }
        content.appendChild(imgWrap);
        break;
      }

      case 'toc': {
        const tocWrap = document.createElement('div');
        tocWrap.className = 'af-toc-block';
        const page = this.store.getPage(this.pageId);
        const headings = (page.blocks || []).filter(b => b.type === 'heading');

        const title = document.createElement('div');
        title.className = 'toc-header';
        title.innerHTML = '📑 <strong>Table of Contents</strong>';
        tocWrap.appendChild(title);

        if (headings.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'toc-empty';
          empty.textContent = 'Add headings (H1, H2, H3) to see an outline.';
          tocWrap.appendChild(empty);
        } else {
          const list = document.createElement('div');
          list.className = 'toc-list';
          headings.forEach(h => {
            const item = document.createElement('div');
            item.className = `toc-item toc-level-${h.level || 1}`;
            item.textContent = h.text || 'Untitled Heading';
            item.onclick = () => {
              const target = this.container.querySelector(`[data-block-id="${h.id}"]`);
              if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            list.appendChild(item);
          });
          tocWrap.appendChild(list);
        }
        content.appendChild(tocWrap);
        break;
      }

      case 'table': {
        const tableWrap = document.createElement('div');
        tableWrap.className = 'af-simple-table-wrap';
        if (!block.rows || !Array.isArray(block.rows)) {
          block.rows = [
            ['Header 1', 'Header 2', 'Header 3'],
            ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
            ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3']
          ];
        }

        const tbl = document.createElement('table');
        tbl.className = 'af-simple-table';

        block.rows.forEach((r, rIdx) => {
          const tr = document.createElement('tr');
          if (rIdx === 0 && block.hasHeader !== false) tr.className = 'table-head-row';
          r.forEach((c, cIdx) => {
            const cell = document.createElement(rIdx === 0 && block.hasHeader !== false ? 'th' : 'td');
            cell.contentEditable = !this.isReadOnly ? 'true' : 'false';
            cell.textContent = c;
            cell.onblur = () => {
              block.rows[rIdx][cIdx] = cell.textContent.trim();
              this.store.updateBlock(this.pageId, block.id, { rows: block.rows });
              this.onUpdate();
            };
            tr.appendChild(cell);
          });
          tbl.appendChild(tr);
        });

        tableWrap.appendChild(tbl);

        if (!this.isReadOnly) {
          const controls = document.createElement('div');
          controls.className = 'simple-table-controls';

          const addRowBtn = document.createElement('button');
          addRowBtn.className = 'btn-table-control';
          addRowBtn.textContent = '+ Row';
          addRowBtn.onclick = () => {
            const colCount = block.rows[0] ? block.rows[0].length : 3;
            block.rows.push(new Array(colCount).fill(''));
            this.store.updateBlock(this.pageId, block.id, { rows: block.rows });
            this.render();
          };

          const addColBtn = document.createElement('button');
          addColBtn.className = 'btn-table-control';
          addColBtn.textContent = '+ Column';
          addColBtn.onclick = () => {
            block.rows.forEach(r => r.push(''));
            this.store.updateBlock(this.pageId, block.id, { rows: block.rows });
            this.render();
          };

          controls.appendChild(addRowBtn);
          controls.appendChild(addColBtn);
          tableWrap.appendChild(controls);
        }

        content.appendChild(tableWrap);
        break;
      }

      case 'bookmark': {
        const bm = document.createElement('div');
        bm.className = 'af-bookmark-card';
        const url = block.url || 'https://notion.so';
        let domain = 'web';
        try { domain = new URL(url).hostname; } catch (_) {}

        bm.innerHTML = `
          <div class="bm-info">
            <div class="bm-title">${block.title || domain}</div>
            <div class="bm-desc">${block.desc || url}</div>
            <div class="bm-domain">🔗 ${domain}</div>
          </div>
        `;
        bm.onclick = () => window.open(url, '_blank');

        if (!this.isReadOnly) {
          const urlInput = document.createElement('input');
          urlInput.className = 'bookmark-edit-input';
          urlInput.value = block.url || '';
          urlInput.placeholder = 'Paste bookmark URL...';
          urlInput.onclick = (e) => e.stopPropagation();
          urlInput.onchange = () => {
            const u = urlInput.value.trim();
            this.store.updateBlock(this.pageId, block.id, { url: u, title: u });
            this.render();
          };
          bm.appendChild(urlInput);
        }

        content.appendChild(bm);
        break;
      }

      case 'audio': {
        const audioWrap = document.createElement('div');
        audioWrap.className = 'af-audio-block';

        const header = document.createElement('div');
        header.className = 'audio-header';
        header.innerHTML = `<span>🎙️ <strong>${block.title || 'Voice Memo'}</strong></span>`;

        const playerArea = document.createElement('div');
        playerArea.className = 'audio-player-area';

        if (block.src) {
          const audioEl = document.createElement('audio');
          audioEl.controls = true;
          audioEl.src = block.src;
          playerArea.appendChild(audioEl);
        } else {
          const placeholder = document.createElement('div');
          placeholder.className = 'audio-placeholder';
          placeholder.textContent = 'No voice memo recorded yet.';
          playerArea.appendChild(placeholder);
        }

        audioWrap.appendChild(header);
        audioWrap.appendChild(playerArea);

        if (!this.isReadOnly) {
          const btnGroup = document.createElement('div');
          btnGroup.className = 'audio-btn-group';

          const recordBtn = document.createElement('button');
          recordBtn.className = 'btn-record-audio';
          recordBtn.textContent = '● Record Voice Memo';
          let mediaRecorder = null;
          let audioChunks = [];

          recordBtn.onclick = async () => {
            if (recordBtn.dataset.recording === 'true') {
              if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
              }
              recordBtn.dataset.recording = 'false';
              recordBtn.textContent = '● Record Voice Memo';
              recordBtn.classList.remove('is-recording');
            } else {
              try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                  alert('Audio recording not supported in this environment');
                  return;
                }
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
                mediaRecorder.onstop = () => {
                  const blob = new Blob(audioChunks, { type: 'audio/webm' });
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    this.store.updateBlock(this.pageId, block.id, {
                      src: reader.result,
                      title: `Voice Memo (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                    });
                    this.render();
                  };
                  reader.readAsDataURL(blob);
                };
                mediaRecorder.start();
                recordBtn.dataset.recording = 'true';
                recordBtn.textContent = '■ Stop Recording';
                recordBtn.classList.add('is-recording');
              } catch (err) {
                alert('Microphone access unavailable: ' + err.message);
              }
            }
          };

          const urlInput = document.createElement('input');
          urlInput.className = 'audio-url-input';
          urlInput.placeholder = 'Or paste audio URL (.mp3, .wav)...';
          urlInput.value = block.src && !block.src.startsWith('data:') ? block.src : '';
          urlInput.onchange = () => {
            const val = urlInput.value.trim();
            if (val) {
              this.store.updateBlock(this.pageId, block.id, { src: val, title: 'Audio Track' });
              this.render();
            }
          };

          btnGroup.appendChild(recordBtn);
          btnGroup.appendChild(urlInput);
          audioWrap.appendChild(btnGroup);
        }

        content.appendChild(audioWrap);
        break;
      }

      case 'clip': {
        const clipWrap = document.createElement('div');
        clipWrap.className = 'af-clip-block';

        const topBar = document.createElement('div');
        topBar.className = 'clip-top-bar';
        topBar.innerHTML = `
          <span class="clip-badge">📎 WEB CLIP</span>
          <a class="clip-link" href="${block.url || '#'}" target="_blank" rel="noopener">${block.url || 'Source Link'}</a>
          <span class="clip-date">${block.date || new Date().toLocaleDateString()}</span>
        `;

        const titleEl = document.createElement('h4');
        titleEl.className = 'clip-title';
        this.makeEditable(titleEl, block, 'title');

        const quoteEl = document.createElement('blockquote');
        quoteEl.className = 'clip-quote';
        this.makeEditable(quoteEl, block, 'text');

        clipWrap.appendChild(topBar);
        clipWrap.appendChild(titleEl);
        clipWrap.appendChild(quoteEl);
        content.appendChild(clipWrap);
        break;
      }

      default: {
        const defP = document.createElement('p');
        this.makeEditable(defP, block, 'text');
        content.appendChild(defP);
        break;
      }
    }

    row.appendChild(content);
    return row;
  }

  makeEditable(el, block, key = 'text') {
    el.textContent = block[key] || '';
    if (this.isReadOnly) return;

    el.contentEditable = 'true';
    el.dataset.placeholder = block.type === 'heading' ? `Heading ${block.level}` : 'Type / for commands...';

    el.oninput = (e) => {
      const text = el.textContent;
      block[key] = text;

      // Notion Feature: Instant Markdown Typing Shortcuts
      if (block.type === 'paragraph') {
        if (text === '# ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'heading', level: 1, text: '' });
          this.render();
          return;
        }
        if (text === '## ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'heading', level: 2, text: '' });
          this.render();
          return;
        }
        if (text === '### ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'heading', level: 3, text: '' });
          this.render();
          return;
        }
        if (text === '- ' || text === '* ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'bullet', text: '' });
          this.render();
          return;
        }
        if (text === '1. ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'number', text: '' });
          this.render();
          return;
        }
        if (text === '[] ' || text === '[ ] ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'todo', checked: false, text: '' });
          this.render();
          return;
        }
        if (text === '[x] ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'todo', checked: true, text: '' });
          this.render();
          return;
        }
        if (text === '> ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'quote', text: '' });
          this.render();
          return;
        }
        if (text === '"" ') {
          this.store.updateBlock(this.pageId, block.id, { type: 'callout', icon: '💡', text: '' });
          this.render();
          return;
        }
        if (text === '---') {
          this.store.updateBlock(this.pageId, block.id, { type: 'divider', text: '' });
          this.render();
          return;
        }
        if (text === '```') {
          this.store.updateBlock(this.pageId, block.id, { type: 'code', language: 'javascript', text: '' });
          this.render();
          return;
        }
        if (text === '$$') {
          this.store.updateBlock(this.pageId, block.id, { type: 'math', text: '' });
          this.render();
          return;
        }
      }

      this.store.updateBlock(this.pageId, block.id, { [key]: text });

      // Check for Slash Command popup trigger
      if (text.endsWith('/')) {
        this.showSlashMenu(el, block);
      } else {
        this.hideSlashMenu();
      }
      this.onUpdate();
    };

    el.onkeydown = (e) => {
      // Enter key
      if (e.key === 'Enter' && !e.shiftKey) {
        if (this.isSlashMenuVisible()) {
          e.preventDefault();
          this.executeSelectedSlashOption();
          return;
        }
        if (block.type !== 'code') {
          e.preventDefault();
          const page = this.store.getPage(this.pageId);
          const idx = (page.blocks || []).findIndex(b => b.id === block.id);
          const nextType = (block.type === 'todo' || block.type === 'bullet' || block.type === 'number') ? block.type : 'paragraph';
          const newBlock = this.store.insertBlock(this.pageId, { type: nextType, text: '' }, idx + 1);
          this.render();
          setTimeout(() => {
            const nextRow = this.container.querySelector(`[data-block-id="${newBlock.id}"] [contenteditable="true"]`);
            if (nextRow) nextRow.focus();
          }, 10);
        }
      }

      // Backspace on empty block
      if (e.key === 'Backspace' && el.textContent === '') {
        const page = this.store.getPage(this.pageId);
        if (page.blocks && page.blocks.length > 1) {
          e.preventDefault();
          const idx = page.blocks.findIndex(b => b.id === block.id);
          this.store.removeBlock(this.pageId, block.id);
          this.render();
          setTimeout(() => {
            const prevIdx = Math.max(0, idx - 1);
            const prevBlock = page.blocks[prevIdx];
            if (prevBlock) {
              const prevEl = this.container.querySelector(`[data-block-id="${prevBlock.id}"] [contenteditable="true"]`);
              if (prevEl) prevEl.focus();
            }
          }, 10);
        } else if (block.type !== 'paragraph') {
          e.preventDefault();
          this.store.updateBlock(this.pageId, block.id, { type: 'paragraph', level: undefined });
          this.render();
        }
      }

      // Slash menu arrow navigation
      if (this.isSlashMenuVisible()) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateSlashMenu(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateSlashMenu(-1);
        } else if (e.key === 'Escape') {
          this.hideSlashMenu();
        }
      }
    };
  }

  // Slash Command Menu
  showSlashMenu(targetEl, block) {
    this.hideSlashMenu();
    this.activeBlockId = block.id;
    this.slashMenuIndex = 0;

    const rect = targetEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'af-slash-menu';
    menu.id = 'af-slash-menu-popup';
    menu.style.position = 'fixed';
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;

    const title = document.createElement('div');
    title.className = 'slash-menu-header';
    title.textContent = 'BASIC BLOCKS';
    menu.appendChild(title);

    this.slashOptions.forEach((opt, idx) => {
      const item = document.createElement('div');
      item.className = 'slash-item' + (idx === 0 ? ' is-selected' : '');
      item.dataset.index = idx;

      const icon = document.createElement('span');
      icon.className = 'slash-icon';
      icon.textContent = opt.icon;

      const info = document.createElement('div');
      info.className = 'slash-info';
      const label = document.createElement('div');
      label.className = 'slash-label';
      label.textContent = opt.label;
      const desc = document.createElement('div');
      desc.className = 'slash-desc';
      desc.textContent = opt.desc;

      info.appendChild(label);
      info.appendChild(desc);
      item.appendChild(icon);
      item.appendChild(info);

      item.onclick = () => {
        this.applySlashOption(opt, block);
      };

      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        this.hideSlashMenu();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 50);
  }

  hideSlashMenu() {
    const el = document.getElementById('af-slash-menu-popup');
    if (el) el.remove();
  }

  isSlashMenuVisible() {
    return Boolean(document.getElementById('af-slash-menu-popup'));
  }

  navigateSlashMenu(direction) {
    const menu = document.getElementById('af-slash-menu-popup');
    if (!menu) return;
    const items = menu.querySelectorAll('.slash-item');
    items[this.slashMenuIndex].classList.remove('is-selected');
    this.slashMenuIndex = (this.slashMenuIndex + direction + items.length) % items.length;
    items[this.slashMenuIndex].classList.add('is-selected');
    items[this.slashMenuIndex].scrollIntoView({ block: 'nearest' });
  }

  executeSelectedSlashOption() {
    const opt = this.slashOptions[this.slashMenuIndex];
    const page = this.store.getPage(this.pageId);
    const block = page.blocks.find(b => b.id === this.activeBlockId);
    if (opt && block) {
      this.applySlashOption(opt, block);
    }
  }

  applySlashOption(opt, block) {
    // Strip trailing slash from text
    let cleanText = (block.text || '').replace(/\/$/, '');
    const update = { type: opt.type, text: cleanText };
    if (opt.level) update.level = opt.level;
    if (opt.type === 'callout') update.icon = '💡';
    if (opt.type === 'todo') update.checked = false;
    if (opt.type === 'bookmark') {
      update.url = 'https://notion.so';
      update.title = 'Notion — Connected Workspace';
      update.desc = 'A connected workspace for wiki, docs & projects.';
    }
    if (opt.type === 'synced') {
      update.type = 'callout';
      update.syncId = 'sync-' + Math.random().toString(36).slice(2, 8);
      update.icon = '🔄';
      update.text = 'Synced Block: changes here propagate to all synced twin copies.';
    }
    if (opt.type === 'table') {
      update.rows = [
        ['Heading 1', 'Heading 2', 'Heading 3'],
        ['Data 1', 'Data 2', 'Data 3'],
        ['Data 4', 'Data 5', 'Data 6']
      ];
    }
    if (opt.type === 'audio') {
      update.type = 'audio';
      update.title = 'Voice Memo';
      update.src = '';
    }
    if (opt.type === 'clip') {
      update.type = 'clip';
      update.url = 'https://news.ycombinator.com';
      update.title = 'Clipped Article';
      update.text = 'Key excerpt or quote from the clipped webpage.';
      update.date = new Date().toLocaleDateString();
    }

    this.store.updateBlock(this.pageId, block.id, update);
    this.hideSlashMenu();
    this.render();
  }

  // Block Action Popup (... menu)
  showBlockMenu(e, block, index) {
    const existing = document.getElementById('af-block-action-popup');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.className = 'af-block-action-popup';
    popup.id = 'af-block-action-popup';
    popup.style.position = 'fixed';
    popup.style.top = `${e.clientY + 4}px`;
    popup.style.left = `${e.clientX + 4}px`;

    const actions = [
      {
        label: 'Copy and Sync Block',
        icon: '🔄',
        action: () => {
          if (!block.syncId) {
            block.syncId = 'sync-' + Math.random().toString(36).slice(2, 8);
            this.store.updateBlock(this.pageId, block.id, { syncId: block.syncId });
          }
          const syncedPayload = {
            id: 'b-' + Math.random().toString(36).slice(2, 8),
            type: block.type,
            text: block.text || '',
            syncId: block.syncId,
            level: block.level,
            checked: block.checked
          };
          this.store.insertBlock(this.pageId, syncedPayload, index + 1);
          this.render();
        }
      },
      {
        label: 'Duplicate',
        icon: '📋',
        action: () => {
          const copy = JSON.parse(JSON.stringify(block));
          copy.id = 'b-' + Math.random().toString(36).slice(2, 8);
          this.store.insertBlock(this.pageId, copy, index + 1);
          this.render();
        }
      },
      {
        label: 'Delete',
        icon: '🗑️',
        action: () => {
          this.store.removeBlock(this.pageId, block.id);
          this.render();
        }
      },
      {
        label: 'Move Up',
        icon: '⬆️',
        action: () => {
          if (index > 0) {
            this.store.moveBlock(this.pageId, index, index - 1);
            this.render();
          }
        }
      },
      {
        label: 'Move Down',
        icon: '⬇️',
        action: () => {
          this.store.moveBlock(this.pageId, index, index + 1);
          this.render();
        }
      }
    ];

    actions.forEach(act => {
      const btn = document.createElement('div');
      btn.className = 'block-action-item';
      btn.innerHTML = `<span>${act.icon}</span> <span>${act.label}</span>`;
      btn.onclick = () => {
        popup.remove();
        act.action();
      };
      popup.appendChild(btn);
    });

    document.body.appendChild(popup);
    const dismiss = (ev) => {
      if (!popup.contains(ev.target)) {
        popup.remove();
        document.removeEventListener('click', dismiss);
      }
    };
    setTimeout(() => document.addEventListener('click', dismiss), 50);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BlockEditor };
}
