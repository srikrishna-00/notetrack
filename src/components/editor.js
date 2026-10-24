// src/components/editor.js - Block-based Document Editor for NoteTrack
'use strict';

function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function getFileMeta(fileName = '', mimeType = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) {
    return { icon: '📕', badge: 'PDF', color: '#ef4444', isPdf: true };
  }
  if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || mime.includes('word')) {
    return { icon: '📘', badge: ext.toUpperCase() || 'DOC', color: '#2563eb' };
  }
  if (['xls', 'xlsx', 'csv', 'ods', 'tsv'].includes(ext) || mime.includes('sheet') || mime.includes('csv')) {
    return { icon: '📗', badge: ext.toUpperCase() || 'SHEET', color: '#10b981' };
  }
  if (['ppt', 'pptx', 'odp'].includes(ext) || mime.includes('presentation')) {
    return { icon: '📙', badge: ext.toUpperCase() || 'SLIDES', color: '#f59e0b' };
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext) || mime.includes('zip') || mime.includes('archive')) {
    return { icon: '🗜️', badge: ext.toUpperCase() || 'ZIP', color: '#8b5cf6' };
  }
  if (['js', 'ts', 'jsx', 'tsx', 'json', 'html', 'css', 'py', 'java', 'c', 'cpp', 'rs', 'go', 'sql', 'sh'].includes(ext)) {
    return { icon: '💻', badge: ext.toUpperCase(), color: '#06b6d4', isCode: true };
  }
  if (['txt', 'md', 'log'].includes(ext) || mime.startsWith('text/')) {
    return { icon: '📝', badge: ext.toUpperCase() || 'TXT', color: '#64748b', isText: true };
  }
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mime.startsWith('image/')) {
    return { icon: '🖼️', badge: ext.toUpperCase() || 'IMG', color: '#10b981', isImage: true };
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext) || mime.startsWith('audio/')) {
    return { icon: '🎵', badge: ext.toUpperCase() || 'AUDIO', color: '#0ea5e9' };
  }
  if (['mp4', 'mov', 'webm', 'mkv'].includes(ext) || mime.startsWith('video/')) {
    return { icon: '🎬', badge: ext.toUpperCase() || 'VIDEO', color: '#6366f1' };
  }
  return { icon: '📎', badge: (ext || 'FILE').toUpperCase(), color: '#64748b' };
}

function getMentionSymbols() {
  return [
    { type: 'symbol', group: 'Emojis', label: 'Star (⭐)', icon: '⭐', insert: '⭐ ' },
    { type: 'symbol', group: 'Emojis', label: 'Fire (🔥)', icon: '🔥', insert: '🔥 ' },
    { type: 'symbol', group: 'Emojis', label: 'Idea / Lightbulb (💡)', icon: '💡', insert: '💡 ' },
    { type: 'symbol', group: 'Emojis', label: 'Bolt / Lightning (⚡)', icon: '⚡', insert: '⚡ ' },
    { type: 'symbol', group: 'Emojis', label: 'Rocket / Launch (🚀)', icon: '🚀', insert: '🚀 ' },
    { type: 'symbol', group: 'Emojis', label: 'Pin / Urgent (📌)', icon: '📌', insert: '📌 ' },
    { type: 'symbol', group: 'Emojis', label: 'Checkmark (✅)', icon: '✅', insert: '✅ ' },
    { type: 'symbol', group: 'Emojis', label: 'Warning (⚠️)', icon: '⚠️', insert: '⚠️ ' },
    { type: 'symbol', group: 'Emojis', label: 'Cross (❌)', icon: '❌', insert: '❌ ' },
    { type: 'symbol', group: 'Emojis', label: 'Heart (❤️)', icon: '❤️', insert: '❤️ ' },
    { type: 'symbol', group: 'Emojis', label: 'Target / Goal (🎯)', icon: '🎯', insert: '🎯 ' },
    { type: 'symbol', group: 'Emojis', label: 'Bell / Alert (🔔)', icon: '🔔', insert: '🔔 ' },
    { type: 'symbol', group: 'Emojis', label: 'Diamond (💎)', icon: '💎', insert: '💎 ' },
    { type: 'symbol', group: 'Emojis', label: 'Folder (📁)', icon: '📁', insert: '📁 ' },
    { type: 'symbol', group: 'Emojis', label: 'Attachment (📎)', icon: '📎', insert: '📎 ' },
    { type: 'symbol', group: 'Emojis', label: 'Chat (💬)', icon: '💬', insert: '💬 ' },
    { type: 'math', group: 'Math & Logic', label: 'Summation (∑)', icon: '∑', insert: '∑ ' },
    { type: 'math', group: 'Math & Logic', label: 'Product (∏)', icon: '∏', insert: '∏ ' },
    { type: 'math', group: 'Math & Logic', label: 'Pi (π)', icon: 'π', insert: 'π ' },
    { type: 'math', group: 'Math & Logic', label: 'Infinity (∞)', icon: '∞', insert: '∞ ' },
    { type: 'math', group: 'Math & Logic', label: 'Square Root (√)', icon: '√', insert: '√ ' },
    { type: 'math', group: 'Math & Logic', label: 'Integral (∫)', icon: '∫', insert: '∫ ' },
    { type: 'math', group: 'Math & Logic', label: 'Delta (Δ)', icon: 'Δ', insert: 'Δ ' },
    { type: 'math', group: 'Math & Logic', label: 'Approx Equal (≈)', icon: '≈', insert: '≈ ' },
    { type: 'math', group: 'Math & Logic', label: 'Not Equal (≠)', icon: '≠', insert: '≠ ' },
    { type: 'math', group: 'Math & Logic', label: 'Less or Equal (≤)', icon: '≤', insert: '≤ ' },
    { type: 'math', group: 'Math & Logic', label: 'Greater or Equal (≥)', icon: '≥', insert: '≥ ' },
    { type: 'math', group: 'Math & Logic', label: 'Plus-Minus (±)', icon: '±', insert: '± ' },
    { type: 'math', group: 'Math & Logic', label: 'Divide (÷)', icon: '÷', insert: '÷ ' },
    { type: 'math', group: 'Math & Logic', label: 'Multiply (×)', icon: '×', insert: '× ' },
    { type: 'arrow', group: 'Arrows', label: 'Right Arrow (→)', icon: '→', insert: '→ ' },
    { type: 'arrow', group: 'Arrows', label: 'Left Arrow (←)', icon: '←', insert: '← ' },
    { type: 'arrow', group: 'Arrows', label: 'Both Directions (↔)', icon: '↔', insert: '↔ ' },
    { type: 'arrow', group: 'Arrows', label: 'Up Arrow (↑)', icon: '↑', insert: '↑ ' },
    { type: 'arrow', group: 'Arrows', label: 'Down Arrow (↓)', icon: '↓', insert: '↓ ' },
    { type: 'arrow', group: 'Arrows', label: 'Double / Implies (⇒)', icon: '⇒', insert: '⇒ ' },
    { type: 'arrow', group: 'Arrows', label: 'Bold Arrow (➔)', icon: '➔', insert: '➔ ' },
    { type: 'currency', group: 'Currencies', label: 'US Dollar ($)', icon: '$', insert: '$' },
    { type: 'currency', group: 'Currencies', label: 'Euro (€)', icon: '€', insert: '€' },
    { type: 'currency', group: 'Currencies', label: 'Pound (£)', icon: '£', insert: '£' },
    { type: 'currency', group: 'Currencies', label: 'Yen (¥)', icon: '¥', insert: '¥' },
    { type: 'currency', group: 'Currencies', label: 'Rupee (₹)', icon: '₹', insert: '₹' },
    { type: 'currency', group: 'Currencies', label: 'Bitcoin (₿)', icon: '₿', insert: '₿' },
    { type: 'person', group: 'Roles & Mentions', label: 'Me (@me)', icon: '👤', insert: '@me ' },
    { type: 'person', group: 'Roles & Mentions', label: 'Team (@team)', icon: '👥', insert: '@team ' },
    { type: 'person', group: 'Roles & Mentions', label: 'Review (@review)', icon: '🔍', insert: '@review ' },
    { type: 'person', group: 'Roles & Mentions', label: 'Urgent (@urgent)', icon: '🚨', insert: '@urgent ' }
  ];
}

class BlockEditor {
  constructor(container, options = {}) {
    this.container = container;
    this.store = options.store;
    this.pageId = options.pageId;
    this.isReadOnly = options.isReadOnly || false;
    this.onUpdate = options.onUpdate || (() => {});
    this.slashMenuIndex = 0;
    this.mentionMenuIndex = 0;
    this.mentionState = null;
    this.activeBlockId = null;

    this.slashOptions = [
      { type: 'paragraph', label: 'Text', desc: 'Just start writing with plain text.', icon: '📝' },
      { type: 'heading', level: 1, label: 'Heading 1', desc: 'Big section heading.', icon: 'H1' },
      { type: 'heading', level: 2, label: 'Heading 2', desc: 'Medium section heading.', icon: 'H2' },
      { type: 'heading', level: 3, label: 'Heading 3', desc: 'Small section heading.', icon: 'H3' },
      { type: 'todo', label: 'To-do List', desc: 'Track tasks with a to-do list.', icon: '☑️' },
      { type: 'file', label: 'File Attachment', desc: 'Attach any document or file (PDF, Word, Excel, ZIP, etc.).', icon: '📎' },
      { type: 'pdf', label: 'PDF Document Viewer', desc: 'Embed an interactive PDF reader in your note.', icon: '📕' },
      { type: 'image', label: 'Image', desc: 'Embed or upload photos from device.', icon: '🖼️' },
      { type: 'diagram', label: 'Diagram / Flowchart', desc: 'Interactive flowchart, sequence, or mindmap.', icon: '📊' },
      { type: 'sticky', label: 'Sticky Note', desc: 'Colorful sticky note with quick thoughts.', icon: '📌' },
      { type: 'chat', label: 'Saved Message / Chat', desc: 'Telegram / WhatsApp style message bubble.', icon: '💬' },
      { type: 'bullet', label: 'Bulleted List', desc: 'Create a simple bulleted list.', icon: '•' },
      { type: 'number', label: 'Numbered List', desc: 'Create a list with numbering.', icon: '1.' },
      { type: 'toggle', label: 'Toggle List', desc: 'Toggles can hide and show content.', icon: '▶' },
      { type: 'callout', label: 'Callout', desc: 'Make writing stand out.', icon: '💡' },
      { type: 'quote', label: 'Quote', desc: 'Capture a quote.', icon: '❝' },
      { type: 'code', label: 'Code Block', desc: 'Capture a code snippet with formatting.', icon: '💻' },
      { type: 'math', label: 'Math Equation', desc: 'Render mathematical TeX expressions.', icon: '√x' },
      { type: 'divider', label: 'Divider', desc: 'Visually divide blocks.', icon: '—' },
      { type: 'toc', label: 'Table of Contents', desc: 'Auto-generated outline of page headings.', icon: '📑' },
      { type: 'table', label: 'Simple Table', desc: '2D grid table with custom rows and columns.', icon: '⊞' },
      { type: 'bookmark', label: 'Web Bookmark', desc: 'Visual link preview card.', icon: '🔗' },
      { type: 'synced', label: 'Synced Block', desc: 'Sync content across multiple pages.', icon: '🔄' },
      { type: 'audio', label: 'Voice Memo / Audio', desc: 'Evernote audio voice recorder and player.', icon: '🎙️' },
      { type: 'clip', label: 'Web Clip', desc: 'Evernote clipped web article snippet.', icon: '📎' },
      { type: 'columns', columnsCount: 2, label: '2 Columns', desc: 'Create a 2-column responsive layout.', icon: '⫽' },
      { type: 'columns', columnsCount: 3, label: '3 Columns', desc: 'Create a 3-column responsive layout.', icon: '⫽' }
    ];

    this.render();
  }

  setPageId(pageId) {
    this.pageId = pageId;
    const page = this.store.getPage(pageId);
    this.isReadOnly = page ? page.isLocked : false;
    this.render();
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

      const delBtn = document.createElement('button');
      delBtn.className = 'tool-btn del-btn';
      delBtn.innerHTML = '✕';
      const typeLabel = block.type === 'audio' ? 'voice memo' : (block.type === 'image' ? 'image' : (block.type === 'file' ? 'file' : (block.type === 'pdf' ? 'PDF' : 'block')));
      delBtn.title = `Delete this ${typeLabel}`;
      delBtn.onclick = (e) => {
        e.stopPropagation();
        this.store.removeBlock(this.pageId, block.id);
        this.render();
      };

      tools.appendChild(addBtn);
      tools.appendChild(handleBtn);
      tools.appendChild(delBtn);
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
          const imgContainer = document.createElement('div');
          imgContainer.className = 'image-container-preview';

          const img = document.createElement('img');
          img.src = block.url;
          img.alt = block.alt || 'image';
          imgContainer.appendChild(img);

          if (!this.isReadOnly) {
            const imgActions = document.createElement('div');
            imgActions.className = 'image-overlay-actions';

            const clearImgBtn = document.createElement('button');
            clearImgBtn.className = 'btn-image-delete';
            clearImgBtn.innerHTML = '🗑️ Remove Image';
            clearImgBtn.title = 'Clear image attachment';
            clearImgBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.updateBlock(this.pageId, block.id, { url: '', alt: '' });
              this.render();
            };

            const delImgBlockBtn = document.createElement('button');
            delImgBlockBtn.className = 'btn-image-delete';
            delImgBlockBtn.innerHTML = '✕ Delete Block';
            delImgBlockBtn.title = 'Remove this image block';
            delImgBlockBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.removeBlock(this.pageId, block.id);
              this.render();
            };

            imgActions.appendChild(clearImgBtn);
            imgActions.appendChild(delImgBlockBtn);
            imgContainer.appendChild(imgActions);
          }
          imgWrap.appendChild(imgContainer);
        }
        if (!this.isReadOnly) {
          const inputRow = document.createElement('div');
          inputRow.className = 'image-input-row';

          const urlInput = document.createElement('input');
          urlInput.className = 'image-url-input';
          urlInput.placeholder = 'Paste Image URL (or upload below)...';
          urlInput.value = block.url && !block.url.startsWith('data:') ? block.url : '';
          urlInput.onchange = () => {
            this.store.updateBlock(this.pageId, block.id, { url: urlInput.value });
            this.render();
          };
          inputRow.appendChild(urlInput);

          const uploadBtn = document.createElement('button');
          uploadBtn.className = 'btn-image-upload';
          uploadBtn.innerHTML = '📷 Upload Photo';
          uploadBtn.title = 'Upload photo from device';

          const imgFileInput = document.createElement('input');
          imgFileInput.type = 'file';
          imgFileInput.accept = 'image/*';
          imgFileInput.style.display = 'none';
          imgFileInput.onchange = (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = () => {
              this.store.updateBlock(this.pageId, block.id, { url: r.result, alt: f.name });
              this.render();
            };
            r.readAsDataURL(f);
          };
          uploadBtn.onclick = (e) => {
            e.stopPropagation();
            imgFileInput.click();
          };
          inputRow.appendChild(uploadBtn);
          inputRow.appendChild(imgFileInput);

          const delBtn = document.createElement('button');
          delBtn.className = 'btn-image-delete';
          delBtn.innerHTML = '✕ Delete';
          delBtn.title = 'Remove image block';
          delBtn.onclick = (e) => {
            e.stopPropagation();
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };
          inputRow.appendChild(delBtn);

          imgWrap.appendChild(inputRow);
        }
        content.appendChild(imgWrap);
        break;
      }

      case 'file':
      case 'pdf': {
        const fileWrap = document.createElement('div');
        fileWrap.className = 'af-file-block';

        const meta = getFileMeta(block.fileName, block.fileType || (block.type === 'pdf' ? 'application/pdf' : ''));
        const hasFile = Boolean(block.url);

        if (hasFile) {
          const card = document.createElement('div');
          card.className = 'af-file-card';

          const cardLeft = document.createElement('div');
          cardLeft.className = 'file-card-left';
          cardLeft.innerHTML = `
            <div class="file-card-icon" style="background:${meta.color}18; color:${meta.color};">${meta.icon}</div>
            <div class="file-card-info">
              <div class="file-card-title" title="${this.escape(block.fileName || 'Attachment')}">${this.escape(block.fileName || (block.type === 'pdf' ? 'PDF Document' : 'Document Attachment'))}</div>
              <div class="file-card-sub">
                <span class="file-badge-pill" style="background:${meta.color}20; color:${meta.color}; border:1px solid ${meta.color}40;">${meta.badge}</span>
                <span class="file-size-tag">${formatFileSize(block.fileSize)}</span>
              </div>
            </div>
          `;

          const cardActions = document.createElement('div');
          cardActions.className = 'file-card-actions';

          // Download action
          const downloadBtn = document.createElement('a');
          downloadBtn.className = 'btn-file-act btn-file-download';
          downloadBtn.href = block.url;
          downloadBtn.download = (block.fileName || (block.type === 'pdf' ? 'document.pdf' : 'attachment')).replace(/[/\\?%*:|"<>]/g, '_');
          downloadBtn.innerHTML = '📥 Download';
          downloadBtn.title = 'Download file';
          cardActions.appendChild(downloadBtn);

          // Preview toggle (for PDF or image)
          if (meta.isPdf || meta.isImage || block.type === 'pdf') {
            const previewBtn = document.createElement('button');
            previewBtn.className = 'btn-file-act';
            const isPreviewOpen = block.showPreview !== false;
            previewBtn.innerHTML = isPreviewOpen ? '👁️ Collapse' : '👁️ Preview';
            previewBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.updateBlock(this.pageId, block.id, { showPreview: !isPreviewOpen });
              this.render();
            };
            cardActions.appendChild(previewBtn);
          }

          if (!this.isReadOnly) {
            // Replace action
            const replaceBtn = document.createElement('button');
            replaceBtn.className = 'btn-file-act';
            replaceBtn.innerHTML = '🔄 Replace';
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.style.display = 'none';
            if (block.type === 'pdf') fileInput.accept = 'application/pdf,.pdf';
            fileInput.onchange = (e) => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                this.store.updateBlock(this.pageId, block.id, {
                  url: reader.result,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  updatedAt: Date.now()
                });
                this.render();
              };
              reader.readAsDataURL(file);
            };
            replaceBtn.onclick = (e) => {
              e.stopPropagation();
              fileInput.click();
            };
            cardActions.appendChild(replaceBtn);
            cardActions.appendChild(fileInput);

            // Clear file action
            const clearBtn = document.createElement('button');
            clearBtn.className = 'btn-file-act text-danger';
            clearBtn.innerHTML = '🗑️ Clear';
            clearBtn.title = 'Remove attached file';
            clearBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.updateBlock(this.pageId, block.id, { url: '', fileName: '', fileSize: 0, fileType: '' });
              this.render();
            };
            cardActions.appendChild(clearBtn);

            // Delete block action
            const delBlockBtn = document.createElement('button');
            delBlockBtn.className = 'btn-file-act text-danger';
            delBlockBtn.innerHTML = '✕ Delete Block';
            delBlockBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.removeBlock(this.pageId, block.id);
              this.render();
            };
            cardActions.appendChild(delBlockBtn);
          }

          card.appendChild(cardLeft);
          card.appendChild(cardActions);
          fileWrap.appendChild(card);

          // Inline preview if enabled
          const showPreview = block.showPreview !== false;
          if (showPreview) {
            if (meta.isPdf || block.type === 'pdf') {
              const pdfPreview = document.createElement('div');
              pdfPreview.className = 'file-inline-preview pdf-preview-container';
              pdfPreview.innerHTML = `
                <div class="pdf-viewer-bar">
                  <span>📕 <strong>PDF Reader:</strong> ${block.fileName || 'Document'}</span>
                  <button class="btn-pdf-external" title="Open in new window">↗ Fullscreen</button>
                </div>
                <iframe class="inline-pdf-frame" src="${block.url}" title="${block.fileName || 'PDF'}"></iframe>
              `;
              pdfPreview.querySelector('.btn-pdf-external').onclick = () => {
                const w = window.open();
                w.document.write(`<iframe src="${block.url}" style="width:100%;height:100%;border:none;"></iframe>`);
              };
              fileWrap.appendChild(pdfPreview);
            } else if (meta.isImage) {
              const imgPreview = document.createElement('div');
              imgPreview.className = 'file-inline-preview img-preview-container';
              imgPreview.innerHTML = `<img src="${block.url}" alt="${block.fileName || 'Preview'}" class="file-img-preview" />`;
              fileWrap.appendChild(imgPreview);
            }
          }
        } else if (!this.isReadOnly) {
          const dropzone = document.createElement('div');
          dropzone.className = 'af-file-dropzone';
          const isPdfOnly = block.type === 'pdf';

          dropzone.innerHTML = `
            <div class="dropzone-icon">${isPdfOnly ? '📕' : '📎'}</div>
            <div class="dropzone-text">
              <strong>${isPdfOnly ? 'Add PDF Document' : 'Attach Document or File'}</strong>
              <span>${isPdfOnly ? 'Drag & drop a PDF here, or click to browse' : 'Drag & drop any file here, or click to browse'}</span>
              <span class="dropzone-supported">${isPdfOnly ? 'Accepts .pdf files' : 'Supports PDF, Word, Excel, PowerPoint, ZIP, Code, & all formats'}</span>
            </div>
            <div class="dropzone-actions">
              <button class="btn-browse-file" type="button">${isPdfOnly ? '📂 Browse PDF' : '📂 Browse Files'}</button>
              <button class="btn-del-dropzone" type="button" title="Remove block">✕</button>
            </div>
          `;

          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.style.display = 'none';
          if (isPdfOnly) fileInput.accept = 'application/pdf,.pdf';

          const handleFile = (file) => {
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              this.store.updateBlock(this.pageId, block.id, {
                url: reader.result,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                updatedAt: Date.now()
              });
              this.render();
            };
            reader.readAsDataURL(file);
          };

          fileInput.onchange = (e) => {
            handleFile(e.target.files && e.target.files[0]);
          };

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
              handleFile(e.dataTransfer.files[0]);
            }
          };

          dropzone.querySelector('.btn-browse-file').onclick = (e) => {
            e.stopPropagation();
            fileInput.click();
          };
          dropzone.onclick = () => fileInput.click();
          dropzone.querySelector('.btn-del-dropzone').onclick = (e) => {
            e.stopPropagation();
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };

          dropzone.appendChild(fileInput);
          fileWrap.appendChild(dropzone);
        } else {
          fileWrap.innerHTML = '<div class="empty-file-block">No file attached</div>';
        }

        content.appendChild(fileWrap);
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

        if (!this.isReadOnly) {
          const headActions = document.createElement('div');
          headActions.className = 'audio-head-actions';

          if (block.src) {
            const clearVoiceBtn = document.createElement('button');
            clearVoiceBtn.className = 'btn-audio-delete';
            clearVoiceBtn.innerHTML = '🗑️ Clear Voice';
            clearVoiceBtn.title = 'Remove voice recording';
            clearVoiceBtn.onclick = (e) => {
              e.stopPropagation();
              this.store.updateBlock(this.pageId, block.id, { src: '', title: 'Voice Memo' });
              this.render();
            };
            headActions.appendChild(clearVoiceBtn);
          }

          const delBlockBtn = document.createElement('button');
          delBlockBtn.className = 'btn-audio-delete';
          delBlockBtn.innerHTML = '✕ Delete Block';
          delBlockBtn.title = 'Delete this voice memo block';
          delBlockBtn.onclick = (e) => {
            e.stopPropagation();
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };
          headActions.appendChild(delBlockBtn);

          header.appendChild(headActions);
        }

        const playerArea = document.createElement('div');
        playerArea.className = 'audio-player-area';

        if (block.src) {
          const audioEl = document.createElement('audio');
          audioEl.controls = true;
          audioEl.src = block.src;
          playerArea.appendChild(audioEl);

          const speedBtn = document.createElement('button');
          speedBtn.className = 'btn-audio-speed';
          speedBtn.textContent = '1x';
          speedBtn.title = 'WhatsApp style playback speed (1x, 1.5x, 2x)';
          speedBtn.onclick = (e) => {
            e.stopPropagation();
            const speeds = [1, 1.5, 2];
            const curr = audioEl.playbackRate || 1;
            const next = speeds[(speeds.indexOf(curr) + 1) % speeds.length];
            audioEl.playbackRate = next;
            speedBtn.textContent = `${next}x`;
          };
          playerArea.appendChild(speedBtn);
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

      case 'columns': {
        const colsWrap = document.createElement('div');
        colsWrap.className = 'af-columns-layout';
        const cols = Array.isArray(block.columns) ? block.columns : [
          { id: 'c1', text: 'Column 1 text...' },
          { id: 'c2', text: 'Column 2 text...' }
        ];

        colsWrap.style.gridTemplateColumns = `repeat(${cols.length}, 1fr)`;

        cols.forEach((col, cIdx) => {
          const colDiv = document.createElement('div');
          colDiv.className = 'af-column-pane';

          const colHeader = document.createElement('div');
          colHeader.className = 'af-col-header';
          colHeader.innerHTML = `<span class="col-tag">Col ${cIdx + 1}</span>`;

          if (!this.isReadOnly) {
            const colActions = document.createElement('span');
            colActions.className = 'col-actions';
            if (cols.length > 1) {
              const delColBtn = document.createElement('button');
              delColBtn.className = 'btn-col-action';
              delColBtn.textContent = '×';
              delColBtn.title = 'Remove column';
              delColBtn.onclick = (e) => {
                e.stopPropagation();
                cols.splice(cIdx, 1);
                this.store.updateBlock(this.pageId, block.id, { columns: cols });
                this.render();
              };
              colActions.appendChild(delColBtn);
            }
            colHeader.appendChild(colActions);
          }

          const colText = document.createElement('div');
          colText.className = 'af-col-body';
          colText.textContent = col.text || '';
          if (!this.isReadOnly) {
            colText.contentEditable = 'true';
            colText.dataset.placeholder = 'Column text...';
            colText.oninput = () => {
              col.text = colText.textContent;
              this.store.updateBlock(this.pageId, block.id, { columns: cols });
              this.onUpdate();
            };
          }

          colDiv.appendChild(colHeader);
          colDiv.appendChild(colText);
          colsWrap.appendChild(colDiv);
        });

        if (!this.isReadOnly && cols.length < 5) {
          const addColBar = document.createElement('div');
          addColBar.className = 'af-add-col-wrap';
          const addColBtn = document.createElement('button');
          addColBtn.className = 'btn-add-col';
          addColBtn.textContent = '+ Col';
          addColBtn.title = 'Add Column';
          addColBtn.onclick = (e) => {
            e.stopPropagation();
            cols.push({ id: 'c-' + Date.now().toString(36), text: `Column ${cols.length + 1} content` });
            this.store.updateBlock(this.pageId, block.id, { columns: cols });
            this.render();
          };
          addColBar.appendChild(addColBtn);
          colsWrap.appendChild(addColBar);
        }

        content.appendChild(colsWrap);
        break;
      }

      case 'diagram': {
        const diagWrap = document.createElement('div');
        diagWrap.className = 'af-diagram-block';

        const dType = block.diagramType || 'flowchart';
        const dTitle = block.title || 'System Flowchart';
        const steps = Array.isArray(block.steps) && block.steps.length > 0 ? block.steps : [
          { label: 'Start Request', color: '#3b82f6' },
          { label: 'Process & Validate', color: '#8b5cf6' },
          { label: 'Decision Check', color: '#f59e0b', isDecision: true },
          { label: 'Save & Success', color: '#10b981' }
        ];

        const topBar = document.createElement('div');
        topBar.className = 'diag-top-bar';
        topBar.innerHTML = `
          <div class="diag-title-area">
            <span>📊</span>
            <input class="diag-title-input" value="${dTitle}" placeholder="Diagram title..." ${this.isReadOnly ? 'disabled' : ''} />
          </div>
          <div class="diag-actions">
            <select class="diag-type-select" ${this.isReadOnly ? 'disabled' : ''}>
              <option value="flowchart" ${dType === 'flowchart' ? 'selected' : ''}>Flowchart</option>
              <option value="sequence" ${dType === 'sequence' ? 'selected' : ''}>Sequence</option>
              <option value="mindmap" ${dType === 'mindmap' ? 'selected' : ''}>Mindmap</option>
            </select>
            ${!this.isReadOnly ? `
              <button class="btn-diag-act btn-add-step">+ Add Step</button>
              <button class="btn-diag-act text-danger btn-del-diag">✕</button>
            ` : ''}
          </div>
        `;

        const svgContainer = document.createElement('div');
        svgContainer.className = 'diag-svg-container';

        const nodeWidth = 130;
        const nodeHeight = 44;
        const gap = 36;
        const svgWidth = Math.max(500, steps.length * (nodeWidth + gap) + 40);
        const svgHeight = 110;

        let svgMarkup = `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" width="100%" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <marker id="arrow-${block.id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 8 5 L 0 9 z" fill="#94a3b8" />
            </marker>
          </defs>`;

        steps.forEach((st, i) => {
          const x = 30 + i * (nodeWidth + gap);
          const y = 32;
          const bg = st.color || '#3b82f6';

          if (st.isDecision) {
            svgMarkup += `
              <polygon points="${x + nodeWidth/2},${y - 4} ${x + nodeWidth + 6},${y + nodeHeight/2} ${x + nodeWidth/2},${y + nodeHeight + 4} ${x - 6},${y + nodeHeight/2}" fill="${bg}" fill-opacity="0.15" stroke="${bg}" stroke-width="2" />
            `;
          } else {
            svgMarkup += `
              <rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="${bg}" fill-opacity="0.15" stroke="${bg}" stroke-width="1.8" />
            `;
          }

          svgMarkup += `
            <text x="${x + nodeWidth/2}" y="${y + nodeHeight/2 + 4}" fill="currentColor" font-size="12" font-weight="600" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif">${this.escape(st.label)}</text>
          `;

          if (i < steps.length - 1) {
            const lineStartX = x + nodeWidth + (st.isDecision ? 6 : 0);
            const lineEndX = lineStartX + gap - (steps[i+1].isDecision ? 6 : 0);
            const lineY = y + nodeHeight/2;
            svgMarkup += `
              <line x1="${lineStartX}" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" stroke="#94a3b8" stroke-width="1.8" marker-end="url(#arrow-${block.id})" />
            `;
          }
        });
        svgMarkup += `</svg>`;
        svgContainer.innerHTML = svgMarkup;

        diagWrap.appendChild(topBar);
        diagWrap.appendChild(svgContainer);

        if (!this.isReadOnly) {
          const titleInp = topBar.querySelector('.diag-title-input');
          titleInp.onchange = () => {
            this.store.updateBlock(this.pageId, block.id, { title: titleInp.value });
          };
          const typeSel = topBar.querySelector('.diag-type-select');
          typeSel.onchange = () => {
            this.store.updateBlock(this.pageId, block.id, { diagramType: typeSel.value });
            this.render();
          };
          topBar.querySelector('.btn-add-step').onclick = () => {
            const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
            const nextColor = colors[steps.length % colors.length];
            const newLabel = prompt('Enter step label:', `Step ${steps.length + 1}`);
            if (newLabel) {
              steps.push({ label: newLabel, color: nextColor });
              this.store.updateBlock(this.pageId, block.id, { steps });
              this.render();
            }
          };
          topBar.querySelector('.btn-del-diag').onclick = () => {
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };
        }

        content.appendChild(diagWrap);
        break;
      }

      case 'sticky': {
        const stickyWrap = document.createElement('div');
        stickyWrap.className = 'af-sticky-block';
        const color = block.color || '#fef08a';
        stickyWrap.style.backgroundColor = color;

        stickyWrap.innerHTML = `
          <div class="sticky-pin">📌</div>
          <div class="sticky-controls">
            ${!this.isReadOnly ? `
              <div class="sticky-palettes">
                ${['#fef08a', '#fbcfe8', '#bae6fd', '#bbf7d0', '#fed7aa', '#e9d5ff'].map(c => `
                  <button class="sticky-dot" style="background:${c};" data-color="${c}" title="Change color"></button>
                `).join('')}
              </div>
              <button class="btn-del-sticky" title="Delete sticky note">✕</button>
            ` : ''}
          </div>
          <div class="sticky-body" contenteditable="${!this.isReadOnly}" data-placeholder="Write a sticky note...">${this.escape(block.text || '')}</div>
        `;

        if (!this.isReadOnly) {
          const bodyEl = stickyWrap.querySelector('.sticky-body');
          bodyEl.oninput = () => {
            block.text = bodyEl.textContent;
            this.store.updateBlock(this.pageId, block.id, { text: block.text });
            this.onUpdate();
          };

          stickyWrap.querySelectorAll('.sticky-dot').forEach(dot => {
            dot.onclick = (e) => {
              e.stopPropagation();
              const c = dot.dataset.color;
              this.store.updateBlock(this.pageId, block.id, { color: c });
              this.render();
            };
          });

          stickyWrap.querySelector('.btn-del-sticky').onclick = (e) => {
            e.stopPropagation();
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };
        }

        content.appendChild(stickyWrap);
        break;
      }

      case 'chat': {
        const chatWrap = document.createElement('div');
        chatWrap.className = 'af-chat-block';

        const sender = block.sender || 'me';
        const time = block.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        chatWrap.innerHTML = `
          <div class="chat-bubble ${sender}">
            <div class="chat-bubble-head">
              <span class="chat-sender-tag">👤 ${this.escape(sender === 'me' ? 'Saved Note' : sender)}</span>
              <span class="chat-time-tag">${this.escape(time)}</span>
            </div>
            <div class="chat-text-body" contenteditable="${!this.isReadOnly}" data-placeholder="Type message note...">${this.escape(block.text || '')}</div>
            <div class="chat-footer">
              <span class="chat-receipt" title="Saved locally">✓✓</span>
              ${!this.isReadOnly ? `
                <div class="chat-actions">
                  <button class="btn-chat-action btn-add-chat-below" title="Append chat note below">+ Reply</button>
                  <button class="btn-chat-action text-danger btn-del-chat" title="Delete message">✕</button>
                </div>
              ` : ''}
            </div>
          </div>
        `;

        if (!this.isReadOnly) {
          const bodyEl = chatWrap.querySelector('.chat-text-body');
          bodyEl.oninput = () => {
            block.text = bodyEl.textContent;
            this.store.updateBlock(this.pageId, block.id, { text: block.text });
            this.onUpdate();
          };

          chatWrap.querySelector('.btn-add-chat-below').onclick = (e) => {
            e.stopPropagation();
            const newChat = {
              type: 'chat',
              sender: 'me',
              text: '',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            this.store.insertBlock(this.pageId, newChat, index + 1);
            this.render();
          };

          chatWrap.querySelector('.btn-del-chat').onclick = (e) => {
            e.stopPropagation();
            this.store.removeBlock(this.pageId, block.id);
            this.render();
          };
        }

        content.appendChild(chatWrap);
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
        if (text === '/2col' || text === '/columns') {
          this.applySlashOption({ type: 'columns', columnsCount: 2 }, block);
          return;
        }
        if (text === '/3col') {
          this.applySlashOption({ type: 'columns', columnsCount: 3 }, block);
          return;
        }
      }

      this.store.updateBlock(this.pageId, block.id, { [key]: text });

      // Check for @ Mention / Symbol trigger
      const lastAt = text.lastIndexOf('@');
      if (lastAt !== -1 && (lastAt === 0 || /\s/.test(text[lastAt - 1]))) {
        const query = text.slice(lastAt + 1);
        if (!/\s/.test(query)) {
          this.showMentionMenu(el, block, query, lastAt);
        } else {
          this.hideMentionMenu();
        }
      } else {
        this.hideMentionMenu();
      }

      // Check for Slash Command popup trigger
      if (text.endsWith('/')) {
        this.showSlashMenu(el, block);
      } else {
        this.hideSlashMenu();
      }
      this.onUpdate();
    };

    el.onkeydown = (e) => {
      // Mention menu arrow & enter navigation
      if (this.isMentionMenuVisible()) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateMentionMenu(1);
          return;
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateMentionMenu(-1);
          return;
        } else if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          this.executeSelectedMention();
          return;
        } else if (e.key === 'Escape') {
          this.hideMentionMenu();
          return;
        }
      }

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

  showMentionMenu(el, block, query = '', atIndex = 0) {
    this.hideSlashMenu();
    this.mentionState = { el, block, query, atIndex };
    let popup = document.getElementById('af-mention-popup');
    if (!popup) {
      popup = document.createElement('div');
      popup.id = 'af-mention-popup';
      popup.className = 'af-mention-popup';
      document.body.appendChild(popup);
    }

    const rect = el.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.top = `${rect.bottom + 6}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 300)}px`;

    const pages = Object.values(this.store.data.pages || {})
      .filter(p => !p.inTrash)
      .map(p => ({
        type: 'page',
        group: 'Pages & Documents',
        label: p.title || 'Untitled',
        icon: p.icon || (p.type === 'folder' ? '📁' : '📄'),
        insert: `@${p.title} `
      }));

    const dates = [
      { type: 'date', group: 'Dates & Time', label: 'Today', icon: '📅', insert: new Date().toLocaleDateString() + ' ' },
      { type: 'date', group: 'Dates & Time', label: 'Tomorrow', icon: '☀️', insert: new Date(Date.now() + 86400000).toLocaleDateString() + ' ' },
      { type: 'date', group: 'Dates & Time', label: 'Current Time', icon: '⏰', insert: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' }
    ];

    const all = [...pages, ...dates, ...getMentionSymbols()];
    const q = (query || '').toLowerCase();
    const filtered = q
      ? all.filter(it => it.label.toLowerCase().includes(q) || it.insert.toLowerCase().includes(q) || (it.group && it.group.toLowerCase().includes(q)))
      : all;

    if (filtered.length === 0) {
      this.hideMentionMenu();
      return;
    }

    this.filteredMentions = filtered;
    this.mentionMenuIndex = Math.min(this.mentionMenuIndex, filtered.length - 1);
    if (this.mentionMenuIndex < 0) this.mentionMenuIndex = 0;

    popup.innerHTML = `
      <div class="mention-menu-header">@ MENTIONS & SYMBOLS (${filtered.length})</div>
      <div class="mention-menu-list">
        ${filtered.slice(0, 30).map((it, idx) => `
          <div class="mention-item ${idx === this.mentionMenuIndex ? 'is-selected' : ''}" data-idx="${idx}">
            <span class="mention-icon">${it.icon}</span>
            <div class="mention-info">
              <span class="mention-label">${it.label}</span>
              <span class="mention-group">${it.group || 'Symbol'}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    popup.querySelectorAll('.mention-item').forEach(itemEl => {
      itemEl.onmousedown = (ev) => {
        ev.preventDefault();
        const idx = parseInt(itemEl.dataset.idx, 10);
        this.selectMentionItem(this.filteredMentions[idx]);
      };
    });
  }

  navigateMentionMenu(direction) {
    if (!this.filteredMentions || this.filteredMentions.length === 0) return;
    this.mentionMenuIndex = (this.mentionMenuIndex + direction + this.filteredMentions.length) % this.filteredMentions.length;
    const popup = document.getElementById('af-mention-popup');
    if (!popup) return;
    const items = popup.querySelectorAll('.mention-item');
    items.forEach((it, idx) => it.classList.toggle('is-selected', idx === this.mentionMenuIndex));
    if (items[this.mentionMenuIndex]) items[this.mentionMenuIndex].scrollIntoView({ block: 'nearest' });
  }

  executeSelectedMention() {
    if (this.filteredMentions && this.filteredMentions[this.mentionMenuIndex]) {
      this.selectMentionItem(this.filteredMentions[this.mentionMenuIndex]);
    }
  }

  selectMentionItem(item) {
    if (!item || !this.mentionState) return;
    const { el, block, atIndex } = this.mentionState;
    const txt = el.textContent || '';
    const before = txt.slice(0, atIndex);
    const afterAt = txt.slice(atIndex);
    const firstSpace = afterAt.indexOf(' ');
    const after = firstSpace === -1 ? '' : afterAt.slice(firstSpace);

    const newText = before + item.insert + after;
    el.textContent = newText;
    block.text = newText;
    this.store.updateBlock(this.pageId, block.id, { text: newText });
    this.hideMentionMenu();
    this.onUpdate();
  }

  hideMentionMenu() {
    const el = document.getElementById('af-mention-popup');
    if (el) el.remove();
    this.mentionState = null;
  }

  isMentionMenuVisible() {
    return Boolean(document.getElementById('af-mention-popup'));
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
    if (opt.type === 'file') {
      update.type = 'file';
      update.url = '';
      update.fileName = '';
      update.fileSize = 0;
    }
    if (opt.type === 'pdf') {
      update.type = 'pdf';
      update.url = '';
      update.fileName = '';
      update.fileSize = 0;
      update.fileType = 'application/pdf';
    }
    if (opt.type === 'diagram') {
      update.type = 'diagram';
      update.diagramType = 'flowchart';
      update.title = 'Process Flowchart';
      update.steps = [
        { label: 'Start', color: '#3b82f6' },
        { label: 'Process', color: '#8b5cf6' },
        { label: 'Decision', color: '#f59e0b', isDecision: true },
        { label: 'Success', color: '#10b981' }
      ];
    }
    if (opt.type === 'sticky') {
      update.type = 'sticky';
      update.color = '#fef08a';
      update.text = '📌 Important Idea: Jot down key points here.';
    }
    if (opt.type === 'chat') {
      update.type = 'chat';
      update.sender = 'me';
      update.text = 'Saved message note...';
      update.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (opt.type === 'columns') {
      const count = opt.columnsCount || 2;
      update.type = 'columns';
      update.columns = Array.from({ length: count }, (_, i) => ({
        id: 'col-' + (i + 1),
        text: `Column ${i + 1} content`
      }));
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
        label: block.type === 'audio' ? 'Delete Voice Memo' : (block.type === 'image' ? 'Delete Image' : (block.type === 'file' ? 'Delete File' : (block.type === 'pdf' ? 'Delete PDF' : (block.type === 'diagram' ? 'Delete Diagram' : (block.type === 'sticky' ? 'Delete Sticky Note' : (block.type === 'chat' ? 'Delete Chat Message' : 'Delete Block')))))),
        icon: '🗑️',
        action: () => {
          this.store.removeBlock(this.pageId, block.id);
          this.render();
        }
      },
      ...((block.type === 'file' || block.type === 'pdf') && block.url ? [{
        label: 'Clear Attached File',
        icon: '🧹',
        action: () => {
          this.store.updateBlock(this.pageId, block.id, { url: '', fileName: '', fileSize: 0 });
          this.render();
        }
      }] : []),
      ...(block.type === 'audio' && block.src ? [{
        label: 'Clear Voice Recording',
        icon: '🧹',
        action: () => {
          this.store.updateBlock(this.pageId, block.id, { src: '', title: 'Voice Memo' });
          this.render();
        }
      }] : []),
      ...(block.type === 'image' && block.url ? [{
        label: 'Clear Image URL',
        icon: '🧹',
        action: () => {
          this.store.updateBlock(this.pageId, block.id, { url: '' });
          this.render();
        }
      }] : []),
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
  module.exports = { BlockEditor, formatFileSize, getFileMeta, getMentionSymbols };
}

