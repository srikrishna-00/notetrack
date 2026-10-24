// test/advanced-features.test.js - Unit tests for advanced features (columns, relations, rollups, version history, fuzzy search, i18n)
import test from 'node:test';
import assert from 'node:assert/strict';
import { AppFlowyStore } from '../src/store.js';
import { i18n, translations } from '../src/i18n.js';

test('Advanced Feature: Typo-Tolerant Fuzzy Search with Levenshtein Distance', () => {
  const store = new AppFlowyStore();
  const p1 = store.createPage({ title: 'Quarterly Financial Roadmap' });
  const p2 = store.createPage({ title: 'Architectural System Blueprint' });

  // Exact search match
  const exact = store.fuzzySearch('Financial');
  assert.ok(exact.length > 0);
  assert.equal(exact[0].pageId, p1.id);
  assert.equal(exact[0].score, 100);

  // Typo 1: 'Financal' missing 'i' (distance 1)
  const typo1 = store.fuzzySearch('Financal');
  assert.ok(typo1.length > 0);
  assert.equal(typo1[0].pageId, p1.id);

  // Typo 2: 'Arhitectural' missing 'c' (distance 1)
  const typo2 = store.fuzzySearch('Arhitectural');
  assert.ok(typo2.length > 0);
  assert.equal(typo2[0].pageId, p2.id);

  // Typo 3: 'Blueprnt' missing 'i'
  const typo3 = store.fuzzySearch('Blueprnt');
  assert.ok(typo3.length > 0);
  assert.equal(typo3[0].pageId, p2.id);
});

test('Advanced Feature: Page Revision History Snapshots and Rollback', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({ title: 'Original Version Title' });

  // Add initial block
  store.insertBlock(page.id, { type: 'paragraph', text: 'First Draft Content' });

  // Create manual snapshot
  const snap1 = store.createSnapshot(page.id, 'Draft 1 Backup');
  assert.ok(snap1);
  assert.equal(snap1.title, 'Original Version Title');
  assert.equal(snap1.blocks.length, 3); // Heading + empty paragraph + inserted paragraph

  // Modify page title and block content
  store.updatePage(page.id, { title: 'Accidentally Ruined Page Title' });
  const pBlocks = store.getPage(page.id).blocks;
  store.updateBlock(page.id, pBlocks[0].id, { text: 'Wiped out text' });

  assert.equal(store.getPage(page.id).title, 'Accidentally Ruined Page Title');

  // Verify history list
  const history = store.getVersionHistory(page.id);
  assert.ok(history.length >= 1);
  assert.equal(history[0].id, snap1.id);

  // Restore previous snapshot
  const restored = store.restoreSnapshot(page.id, snap1.id);
  assert.ok(restored);
  assert.equal(restored.title, 'Original Version Title');
  assert.equal(restored.blocks[0].text, 'Original Version Title');
});

test('Advanced Feature: Database Relations and Rollups Evaluator', () => {
  const store = new AppFlowyStore();

  // Create Target Database: Projects
  const projectsDbPage = store.createPage({ type: 'database', title: 'Projects Database' });
  const projectsDb = store.getDatabase(projectsDbPage.id);
  const costCol = store.addColumn(projectsDbPage.id, { name: 'Cost', type: 'number' });

  const proj1 = store.addRow(projectsDbPage.id, { [projectsDb.columns[0].id]: 'Apollo 11', [costCol.id]: 100 });
  const proj2 = store.addRow(projectsDbPage.id, { [projectsDb.columns[0].id]: 'Voyager 1', [costCol.id]: 250 });
  const proj3 = store.addRow(projectsDbPage.id, { [projectsDb.columns[0].id]: 'Curiosity', [costCol.id]: 150 });

  // Create Source Database: Clients
  const clientsDbPage = store.createPage({ type: 'database', title: 'Clients Database' });
  const clientsDb = store.getDatabase(clientsDbPage.id);

  // Add Relation column pointing to Projects Database
  const relCol = store.addColumn(clientsDbPage.id, {
    name: 'Linked Projects',
    type: 'relation',
    targetDatabaseId: projectsDbPage.id
  });

  // Add Rollup column summing Cost
  const rollupSumCol = store.addColumn(clientsDbPage.id, {
    name: 'Total Project Cost',
    type: 'rollup',
    relationColumnId: relCol.id,
    targetPropertyId: costCol.id,
    calculation: 'sum'
  });

  // Add Rollup column counting projects
  const rollupCountCol = store.addColumn(clientsDbPage.id, {
    name: 'Project Count',
    type: 'rollup',
    relationColumnId: relCol.id,
    targetPropertyId: costCol.id,
    calculation: 'count'
  });

  // Add Rollup column averaging cost
  const rollupAvgCol = store.addColumn(clientsDbPage.id, {
    name: 'Average Cost',
    type: 'rollup',
    relationColumnId: relCol.id,
    targetPropertyId: costCol.id,
    calculation: 'avg'
  });

  // Add Client row linking proj1 and proj2 (100 + 250 = 350)
  const clientRow = store.addRow(clientsDbPage.id, {
    [clientsDb.columns[0].id]: 'NASA Corp',
    [relCol.id]: [proj1.id, proj2.id]
  });

  // Evaluate Rollups
  const sumResult = store.evaluateRollup(rollupSumCol, clientRow.values, clientsDb);
  assert.equal(sumResult, 350);

  const countResult = store.evaluateRollup(rollupCountCol, clientRow.values, clientsDb);
  assert.equal(countResult, 2);

  const avgResult = store.evaluateRollup(rollupAvgCol, clientRow.values, clientsDb);
  assert.equal(avgResult, 175);
});

test('Advanced Feature: Multi-Column Layout Block Structure and Persistence', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({ title: 'Multi-Column Document' });

  const colBlock = store.insertBlock(page.id, {
    type: 'columns',
    columns: [
      { id: 'c1', text: 'Left Column Analysis' },
      { id: 'c2', text: 'Right Column Action Items' }
    ]
  });

  assert.equal(colBlock.type, 'columns');
  assert.equal(colBlock.columns.length, 2);
  assert.equal(colBlock.columns[0].text, 'Left Column Analysis');

  // Add a 3rd column
  const nextCols = [
    ...colBlock.columns,
    { id: 'c3', text: 'Third Column Notes' }
  ];
  store.updateBlock(page.id, colBlock.id, { columns: nextCols });

  const updatedPage = store.getPage(page.id);
  const updatedBlock = updatedPage.blocks.find(b => b.id === colBlock.id);
  assert.equal(updatedBlock.columns.length, 3);
  assert.equal(updatedBlock.columns[2].text, 'Third Column Notes');
});

test('Advanced Feature: Multi-Language i18n Localization Engine', () => {
  assert.equal(translations.en.appName, 'AppFlowy Lean');
  assert.equal(translations.es.appName, 'AppFlowy Lean');
  assert.equal(translations.de.appName, 'AppFlowy Lean');
  assert.equal(translations.fr.appName, 'AppFlowy Lean');
  assert.equal(translations.zh.appName, 'AppFlowy Lean');
  assert.equal(translations.ja.appName, 'AppFlowy Lean');

  // Verify English translations
  i18n.setLocale('en');
  assert.equal(i18n.t('newDoc'), '+ New Page');
  assert.equal(i18n.t('favorites'), 'Favorites');

  // Verify Spanish translations
  i18n.setLocale('es');
  assert.equal(i18n.t('newDoc'), '+ Nueva Página');
  assert.equal(i18n.t('favorites'), 'Favoritos');

  // Verify German translations
  i18n.setLocale('de');
  assert.equal(i18n.t('newDoc'), '+ Neue Seite');
  assert.equal(i18n.t('favorites'), 'Favoriten');

  // Verify French translations
  i18n.setLocale('fr');
  assert.equal(i18n.t('newDoc'), '+ Nouvelle Page');
  assert.equal(i18n.t('favorites'), 'Favoris');

  // Verify Chinese translations
  i18n.setLocale('zh');
  assert.equal(i18n.t('newDoc'), '+ 新建页面');
  assert.equal(i18n.t('favorites'), '收藏夹');

  // Verify Japanese translations
  i18n.setLocale('ja');
  assert.equal(i18n.t('newDoc'), '+ 新しいページ');
  assert.equal(i18n.t('favorites'), 'お気に入り');

  // Reset to English
  i18n.setLocale('en');
});
