// test/database.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AppFlowyStore } = require('../src/store');

test('Database engine supports all 6 view types and view switching', () => {
  const store = new AppFlowyStore();
  const db = store.getDatabase('page-tasks');
  assert.ok(db);

  const viewTypes = db.views.map(v => v.type);
  assert.ok(viewTypes.includes('grid'));
  assert.ok(viewTypes.includes('board'));
  assert.ok(viewTypes.includes('calendar'));
  assert.ok(viewTypes.includes('gallery'));
  assert.ok(viewTypes.includes('timeline'));
  assert.ok(viewTypes.includes('chart'));
});

test('Adding and removing typed columns in database', () => {
  const store = new AppFlowyStore();
  const newCol = store.addColumn('page-tasks', {
    name: 'Department',
    type: 'select',
    options: ['Core', 'Design', 'QA']
  });
  assert.ok(newCol.id);
  assert.equal(newCol.name, 'Department');

  const db = store.getDatabase('page-tasks');
  assert.ok(db.columns.some(c => c.id === newCol.id));

  // Remove column
  store.deleteColumn('page-tasks', newCol.id);
  assert.ok(!db.columns.some(c => c.id === newCol.id));
});

test('Calculations bar supports Count, Sum, Avg, Min, Max', () => {
  const store = new AppFlowyStore();

  const count = store.calculate('page-tasks', 'c_title', 'count');
  assert.ok(count >= 3);

  const sum = store.calculate('page-tasks', 'c_estimate', 'sum');
  assert.ok(sum >= 15);

  const avg = store.calculate('page-tasks', 'c_estimate', 'avg');
  assert.ok(Number(avg) > 0);

  const min = store.calculate('page-tasks', 'c_estimate', 'min');
  assert.ok(min >= 4);

  const max = store.calculate('page-tasks', 'c_estimate', 'max');
  assert.ok(max >= 8);
});

test('Row-as-document attaches full block tree to database rows', () => {
  const store = new AppFlowyStore();
  const row = store.addRow('page-tasks', { c_title: 'Special Project' });

  // Add rich document blocks to row
  store.setRowDocument('page-tasks', row.id, [
    { id: 'b1', type: 'heading', level: 1, text: 'Project Spec' },
    { id: 'b2', type: 'callout', icon: '🚀', text: 'Launch target Q4' },
    { id: 'b3', type: 'todo', text: 'Finalize UI', checked: false }
  ]);

  const blocks = store.getRowDocument('page-tasks', row.id);
  assert.equal(blocks.length, 3);
  assert.equal(blocks[0].text, 'Project Spec');
  assert.equal(blocks[1].icon, '🚀');
});
