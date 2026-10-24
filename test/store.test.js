// test/store.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AppFlowyStore } = require('../src/store');

test('Store initializes with default workspace, spaces and pages', () => {
  const store = new AppFlowyStore();
  const ws = store.getWorkspace();
  assert.equal(ws.name, 'My Workspace');

  const spaces = store.getSpaces();
  assert.equal(spaces.length, 3);
  assert.equal(spaces[0].id, 'space-personal');

  const welcomePage = store.getPage('page-welcome');
  assert.ok(welcomePage);
  assert.equal(welcomePage.title, 'Welcome to NoteTrack');
  assert.equal(welcomePage.type, 'document');

  const tasksPage = store.getPage('page-tasks');
  assert.ok(tasksPage);
  assert.equal(tasksPage.type, 'database');
});

test('Page CRUD and Tree hierarchy', () => {
  const store = new AppFlowyStore();

  const parent = store.createPage({
    spaceId: 'space-personal',
    title: 'Parent Notebook',
    icon: '📔'
  });
  assert.ok(parent.id);

  const child = store.createPage({
    spaceId: 'space-personal',
    parentId: parent.id,
    title: 'Chapter 1',
    icon: '📑'
  });
  assert.equal(child.parentId, parent.id);

  const tree = store.getPageTree('space-personal');
  const foundParent = tree.find(p => p.id === parent.id);
  assert.ok(foundParent);
  assert.equal(foundParent.children.length, 1);
  assert.equal(foundParent.children[0].id, child.id);

  // Soft delete parent -> moves parent and child to trash
  store.deletePage(parent.id);
  assert.equal(store.getPage(parent.id).inTrash, true);
  assert.equal(store.getPage(child.id).inTrash, true);

  const trash = store.getTrashPages();
  assert.ok(trash.some(p => p.id === parent.id));
  assert.ok(trash.some(p => p.id === child.id));

  // Restore parent -> restores child too
  store.restorePage(parent.id);
  assert.equal(store.getPage(parent.id).inTrash, false);
  assert.equal(store.getPage(child.id).inTrash, false);
});

test('Favorites and Lock toggle', () => {
  const store = new AppFlowyStore();
  const p = store.createPage({ title: 'Important Secret' });

  assert.equal(p.isFavorite, false);
  store.toggleFavorite(p.id);
  assert.equal(p.isFavorite, true);

  const favorites = store.getFavoritePages();
  assert.ok(favorites.some(x => x.id === p.id));

  assert.equal(p.isLocked, false);
  store.toggleLock(p.id);
  assert.equal(p.isLocked, true);

  // Locked page cannot update blocks
  const result = store.setBlocks(p.id, [{ id: 'b', type: 'paragraph', text: 'Blocked!' }]);
  assert.equal(result, false);
});

test('Database Multi-View operations, calculations, filters and sorts', () => {
  const store = new AppFlowyStore();
  const db = store.getDatabase('page-tasks');
  assert.ok(db);
  assert.equal(db.views.length, 6); // Grid, Board, Calendar, Gallery, Timeline, Chart

  // Add row
  const row = store.addRow('page-tasks', {
    c_title: 'Automated Test Task',
    c_status: 'To Do',
    c_priority: 'Urgent',
    c_estimate: 10,
    c_done: false
  });
  assert.ok(row.id);

  // Cell update
  store.updateCell('page-tasks', row.id, 'c_status', 'Done');
  assert.equal(row.values.c_status, 'Done');

  // Row as document
  store.setRowDocument('page-tasks', row.id, [
    { id: 'b1', type: 'heading', level: 1, text: 'Attached Document' }
  ]);
  const doc = store.getRowDocument('page-tasks', row.id);
  assert.equal(doc.length, 1);
  assert.equal(doc[0].text, 'Attached Document');

  // Calculations
  const sumHours = store.calculate('page-tasks', 'c_estimate', 'sum');
  assert.ok(sumHours >= 10);
  const count = store.calculate('page-tasks', 'c_title', 'count');
  assert.ok(count >= 4);

  // Filters
  const doneRows = store.filterAndSortRows('page-tasks', {
    filters: [{ columnId: 'c_status', op: 'equals', val: 'Done' }]
  });
  assert.ok(doneRows.length >= 1);
  assert.ok(doneRows.every(r => r.values.c_status === 'Done'));

  // Sorts
  const sorted = store.filterAndSortRows('page-tasks', {
    sorts: [{ columnId: 'c_estimate', direction: 'desc' }]
  });
  assert.ok(sorted[0].values.c_estimate >= sorted[sorted.length - 1].values.c_estimate);
});

test('Search across titles and blocks', () => {
  const store = new AppFlowyStore();
  const res1 = store.search('welcome');
  assert.ok(res1.length >= 1);
  assert.equal(res1[0].pageId, 'page-welcome');

  const res2 = store.search('Simplicity is prerequisite');
  assert.ok(res2.length >= 1);
  assert.equal(res2[0].pageId, 'page-welcome');
});
