// src/components/io.js - Import and Export Engine for AppFlowy Lean
'use strict';

/**
 * Converts a document page with blocks to Markdown
 */
function pageToMarkdown(page) {
  if (!page) return '';
  const lines = [];

  // Frontmatter
  lines.push('---');
  lines.push(`title: "${(page.title || '').replace(/"/g, '\\"')}"`);
  lines.push(`icon: "${page.icon || '📄'}"`);
  if (page.cover) lines.push(`cover: "${page.cover}"`);
  lines.push(`createdAt: ${new Date(page.createdAt || Date.now()).toISOString()}`);
  lines.push('---');
  lines.push('');

  const blocks = page.blocks || [];
  for (const b of blocks) {
    switch (b.type) {
      case 'heading': {
        const hashes = '#'.repeat(Math.min(b.level || 1, 6));
        lines.push(`${hashes} ${b.text || ''}`);
        lines.push('');
        break;
      }
      case 'paragraph': {
        lines.push(b.text || '');
        lines.push('');
        break;
      }
      case 'todo': {
        const check = b.checked ? '[x]' : '[ ]';
        lines.push(`- ${check} ${b.text || ''}`);
        break;
      }
      case 'bullet': {
        lines.push(`* ${b.text || ''}`);
        break;
      }
      case 'number': {
        lines.push(`1. ${b.text || ''}`);
        break;
      }
      case 'quote': {
        lines.push(`> ${b.text || ''}`);
        lines.push('');
        break;
      }
      case 'callout': {
        lines.push(`> [!NOTE] ${b.icon || '💡'} ${b.text || ''}`);
        lines.push('');
        break;
      }
      case 'toggle': {
        lines.push(`<details><summary>${b.title || 'Toggle'}</summary>\n${b.content || ''}\n</details>`);
        lines.push('');
        break;
      }
      case 'code': {
        lines.push('```' + (b.language || ''));
        lines.push(b.text || '');
        lines.push('```');
        lines.push('');
        break;
      }
      case 'math': {
        lines.push('$$');
        lines.push(b.text || '');
        lines.push('$$');
        lines.push('');
        break;
      }
      case 'divider': {
        lines.push('---');
        lines.push('');
        break;
      }
      case 'image': {
        lines.push(`![${b.alt || 'image'}](${b.url || ''})`);
        lines.push('');
        break;
      }
      default: {
        if (b.text) lines.push(b.text + '\n');
        break;
      }
    }
  }

  return lines.join('\n');
}

/**
 * Converts Markdown text into Block array
 */
function markdownToBlocks(markdown) {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let inCode = false;
  let codeLang = '';
  let codeBuffer = [];
  let inMath = false;
  let mathBuffer = [];
  let inFrontmatter = false;
  let frontmatterPassed = false;

  const makeId = () => 'b-' + Math.random().toString(36).slice(2, 8);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Frontmatter check
    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
        frontmatterPassed = true;
      }
      continue;
    }

    // Math block
    if (trimmed === '$$') {
      if (inMath) {
        blocks.push({ id: makeId(), type: 'math', text: mathBuffer.join('\n') });
        mathBuffer = [];
        inMath = false;
      } else {
        inMath = true;
      }
      continue;
    }
    if (inMath) {
      mathBuffer.push(raw);
      continue;
    }

    // Code block
    if (trimmed.startsWith('```')) {
      if (inCode) {
        blocks.push({ id: makeId(), type: 'code', language: codeLang, text: codeBuffer.join('\n') });
        codeBuffer = [];
        codeLang = '';
        inCode = false;
      } else {
        inCode = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(raw);
      continue;
    }

    if (!trimmed) continue;

    // Headings
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        blocks.push({
          id: makeId(),
          type: 'heading',
          level: Math.min(match[1].length, 3),
          text: match[2]
        });
        continue;
      }
    }

    // Checkbox / Todo
    if (/^-\s*\[([ xX])\]\s*(.*)$/.test(trimmed)) {
      const m = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
      blocks.push({
        id: makeId(),
        type: 'todo',
        checked: m[1].toLowerCase() === 'x',
        text: m[2]
      });
      continue;
    }

    // Bullet list
    if (/^[-*+]\s+(.*)$/.test(trimmed)) {
      const m = trimmed.match(/^[-*+]\s+(.*)$/);
      blocks.push({
        id: makeId(),
        type: 'bullet',
        text: m[1]
      });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+(.*)$/.test(trimmed)) {
      const m = trimmed.match(/^\d+\.\s+(.*)$/);
      blocks.push({
        id: makeId(),
        type: 'number',
        text: m[1]
      });
      continue;
    }

    // Divider
    if (/^(\*\*\*|---|___)$/.test(trimmed)) {
      blocks.push({ id: makeId(), type: 'divider' });
      continue;
    }

    // Callout (> [!NOTE] ...)
    if (/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.test(trimmed)) {
      const m = trimmed.match(/^>\s*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i);
      blocks.push({
        id: makeId(),
        type: 'callout',
        icon: '💡',
        text: m[1]
      });
      continue;
    }

    // Quote
    if (trimmed.startsWith('>')) {
      blocks.push({
        id: makeId(),
        type: 'quote',
        text: trimmed.replace(/^>\s*/, '')
      });
      continue;
    }

    // Image
    if (/^!\[(.*?)\]\((.*?)\)$/.test(trimmed)) {
      const m = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      blocks.push({
        id: makeId(),
        type: 'image',
        alt: m[1],
        url: m[2]
      });
      continue;
    }

    // Paragraph
    blocks.push({
      id: makeId(),
      type: 'paragraph',
      text: trimmed
    });
  }

  return blocks;
}

/**
 * Exports a Database to standard RFC 4180 CSV
 */
function databaseToCSV(db) {
  if (!db || !db.columns || !db.rows) return '';

  const escapeCSV = (val) => {
    if (val === undefined || val === null) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = db.columns.map(c => escapeCSV(c.name)).join(',');
  const rows = db.rows.map(r => {
    return db.columns.map(c => {
      const v = r.values ? r.values[c.id] : '';
      return escapeCSV(v);
    }).join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Parses CSV text and creates database column and row objects
 */
function csvToDatabase(csvText, title = 'Imported Database') {
  if (!csvText || !csvText.trim()) return null;

  // Simple robust RFC 4180 parser
  const parseRows = (text) => {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField);
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentField);
          if (currentRow.length > 0 && currentRow.some(x => x.trim())) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          if (char === '\r') i++;
        } else if (char !== '\r') {
          currentField += char;
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(x => x.trim())) rows.push(currentRow);
    }

    return rows;
  };

  const parsed = parseRows(csvText.trim());
  if (parsed.length === 0) return null;

  const headerRow = parsed[0];
  const dataRows = parsed.slice(1);

  const columns = headerRow.map((colName, idx) => {
    const cleanName = colName.trim() || `Column ${idx + 1}`;
    let type = idx === 0 ? 'title' : 'text';

    // Infer number type if sample is numeric
    if (idx > 0 && dataRows.length > 0) {
      const sample = dataRows[0][idx];
      if (sample && !isNaN(Number(sample))) type = 'number';
      else if (sample && (sample.toLowerCase() === 'true' || sample.toLowerCase() === 'false')) type = 'checkbox';
      else if (sample && /^\d{4}-\d{2}-\d{2}$/.test(sample)) type = 'date';
    }

    return {
      id: 'col_' + idx + '_' + Math.random().toString(36).slice(2, 6),
      name: cleanName,
      type,
      width: idx === 0 ? 220 : 140
    };
  });

  const rows = dataRows.map((dr, rIdx) => {
    const values = {};
    columns.forEach((col, cIdx) => {
      let val = dr[cIdx] !== undefined ? dr[cIdx].trim() : '';
      if (col.type === 'number' && val && !isNaN(Number(val))) val = Number(val);
      if (col.type === 'checkbox') val = val.toLowerCase() === 'true' || val === '1';
      values[col.id] = val;
    });
    return {
      id: 'row-import-' + rIdx + '-' + Math.random().toString(36).slice(2, 6),
      values,
      document: { blocks: [] }
    };
  });

  return {
    title,
    columns,
    rows,
    views: [
      { id: 'v_grid', name: 'All Records', type: 'grid' },
      { id: 'v_board', name: 'Board', type: 'board', groupBy: columns[1] ? columns[1].id : columns[0].id }
    ]
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    pageToMarkdown,
    markdownToBlocks,
    databaseToCSV,
    csvToDatabase
  };
}
