// test/io.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pageToMarkdown, markdownToBlocks, databaseToCSV, csvToDatabase } = require('../src/components/io');

test('Document page converts to and from Markdown with all block types', () => {
  const samplePage = {
    title: 'Testing Markdown',
    icon: '🚀',
    blocks: [
      { id: '1', type: 'heading', level: 1, text: 'Main Header' },
      { id: '2', type: 'callout', icon: '💡', text: 'Important notice' },
      { id: '3', type: 'todo', text: 'First task', checked: true },
      { id: '4', type: 'todo', text: 'Second task', checked: false },
      { id: '5', type: 'bullet', text: 'Bullet point' },
      { id: '6', type: 'number', text: 'Ordered point' },
      { id: '7', type: 'quote', text: 'Inspiring quote' },
      { id: '8', type: 'code', language: 'python', text: 'print("hello world")' },
      { id: '9', type: 'math', text: 'a^2 + b^2 = c^2' },
      { id: '10', type: 'divider' }
    ]
  };

  const md = pageToMarkdown(samplePage);
  assert.ok(md.includes('# Main Header'));
  assert.ok(md.includes('- [x] First task'));
  assert.ok(md.includes('- [ ] Second task'));
  assert.ok(md.includes('```python\nprint("hello world")\n```'));
  assert.ok(md.includes('$$\na^2 + b^2 = c^2\n$$'));

  const parsedBlocks = markdownToBlocks(md);
  assert.ok(parsedBlocks.length >= 8);
  assert.equal(parsedBlocks[0].type, 'heading');
  assert.equal(parsedBlocks[0].text, 'Main Header');

  const todoChecked = parsedBlocks.find(b => b.type === 'todo' && b.checked);
  assert.ok(todoChecked);
  assert.equal(todoChecked.text, 'First task');

  const codeBlock = parsedBlocks.find(b => b.type === 'code');
  assert.ok(codeBlock);
  assert.equal(codeBlock.language, 'python');
  assert.equal(codeBlock.text, 'print("hello world")');

  const mathBlock = parsedBlocks.find(b => b.type === 'math');
  assert.ok(mathBlock);
  assert.equal(mathBlock.text, 'a^2 + b^2 = c^2');
});

test('Database converts to and from CSV RFC 4180', () => {
  const sampleDb = {
    title: 'Task Register',
    columns: [
      { id: 'col_title', name: 'Task', type: 'title' },
      { id: 'col_status', name: 'Status', type: 'select' },
      { id: 'col_est', name: 'Hours', type: 'number' },
      { id: 'col_done', name: 'Done', type: 'checkbox' }
    ],
    rows: [
      {
        id: 'r1',
        values: { col_title: 'Build UI, with comma', col_status: 'Done', col_est: 5, col_done: true }
      },
      {
        id: 'r2',
        values: { col_title: 'Ship "v1" binary', col_status: 'In Progress', col_est: 3, col_done: false }
      }
    ]
  };

  const csv = databaseToCSV(sampleDb);
  assert.ok(csv.includes('Task,Status,Hours,Done'));
  assert.ok(csv.includes('"Build UI, with comma",Done,5,true'));
  assert.ok(csv.includes('"Ship ""v1"" binary",In Progress,3,false'));

  const imported = csvToDatabase(csv, 'Re-imported Database');
  assert.ok(imported);
  assert.equal(imported.columns.length, 4);
  assert.equal(imported.rows.length, 2);
  assert.equal(imported.rows[0].values[imported.columns[0].id], 'Build UI, with comma');
  assert.equal(imported.rows[1].values[imported.columns[0].id], 'Ship "v1" binary');
});
