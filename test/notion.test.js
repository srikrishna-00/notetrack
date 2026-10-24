import test from 'node:test';
import assert from 'node:assert/strict';
import { AppFlowyStore } from '../src/store.js';

test('Notion Formula Evaluator evaluates math, logic and properties', () => {
  const store = new AppFlowyStore();
  const row = {
    c_title: 'Draft architecture',
    c_estimate: 8,
    c_rate: 150,
    c_status: 'In Progress'
  };

  // Arithmetic with properties
  assert.equal(store.evaluateFormula('prop("c_estimate") * prop("c_rate")', row), 1200);
  assert.equal(store.evaluateFormula('prop("c_estimate") + 4', row), 12);
  assert.equal(store.evaluateFormula('prop("c_estimate") / 2', row), 4);

  // Logical iff
  assert.equal(store.evaluateFormula('iff(prop("c_estimate") > 5, "Major Task", "Minor Task")', row), 'Major Task');
  assert.equal(store.evaluateFormula('iff(prop("c_estimate") < 5, "Major Task", "Minor Task")', row), 'Minor Task');

  // String concat
  assert.equal(store.evaluateFormula('concat("Item: ", prop("c_title"))', row), 'Item: Draft architecture');

  // Math helpers: min, max, round
  assert.equal(store.evaluateFormula('min(prop("c_estimate"), 5)', row), 5);
  assert.equal(store.evaluateFormula('max(prop("c_estimate"), 20)', row), 20);
  assert.equal(store.evaluateFormula('round(123.4567, 2)', row), 123.46);

  // Fallback on empty or invalid
  assert.equal(store.evaluateFormula('', row), '');
});

test('Notion Backlinks Engine detects @pageId and [[pageId]] references across pages', () => {
  const store = new AppFlowyStore();
  
  // Page A: Source
  const pageA = store.createPage({ title: 'Project Roadmap' });
  // Page B: Target
  const pageB = store.createPage({ title: 'Design System' });
  // Page C: Another referencing page
  const pageC = store.createPage({ title: 'Sprint Backlog' });

  // Add block referencing Page B using @pageId
  store.addBlock(pageA.id, {
    type: 'paragraph',
    text: `We need to align with @${pageB.id} for UI components.`
  });

  // Add block referencing Page B using [[pageId]]
  store.addBlock(pageC.id, {
    type: 'paragraph',
    text: `Depends on [[${pageB.id}]] token specifications.`
  });

  const backlinksB = store.getBacklinks(pageB.id);
  assert.equal(backlinksB.length, 2);
  const backlinkTitles = backlinksB.map(b => b.title);
  assert.ok(backlinkTitles.includes('Project Roadmap'));
  assert.ok(backlinkTitles.includes('Sprint Backlog'));

  // Page A should have 0 backlinks
  assert.equal(store.getBacklinks(pageA.id).length, 0);
});

test('Notion Synced Blocks replicate content across instances and pages', () => {
  const store = new AppFlowyStore();
  const page1 = store.createPage({ title: 'Company Header Template' });
  const page2 = store.createPage({ title: 'Weekly Update Q4' });

  // Create synced block on page 1
  const syncId = 'sync-banner-001';
  const block1 = store.addBlock(page1.id, {
    type: 'callout',
    isSynced: true,
    syncId: syncId,
    icon: '📢',
    text: 'Quarterly OKR: Ship AppFlowy Lean v1.0'
  });

  // Add mirrored synced block on page 2
  const block2 = store.addBlock(page2.id, {
    type: 'callout',
    isSynced: true,
    syncId: syncId,
    icon: '📢',
    text: 'Quarterly OKR: Ship AppFlowy Lean v1.0'
  });

  // Update block 1
  store.updateBlock(page1.id, block1.id, {
    icon: '🚀',
    text: 'Quarterly OKR: Ship AppFlowy Lean v1.0 with Notion superpowers!'
  });

  // Block 2 on page 2 must be automatically updated!
  const page2Updated = store.getPage(page2.id);
  const block2Updated = page2Updated.blocks.find(b => b.id === block2.id);
  assert.equal(block2Updated.icon, '🚀');
  assert.equal(block2Updated.text, 'Quarterly OKR: Ship AppFlowy Lean v1.0 with Notion superpowers!');
});

test('Notion Templates Library creates populated pages with standard Notion layouts', () => {
  const store = new AppFlowyStore();

  // Test Meeting Notes template
  const meetingPage = store.createFromTemplate('meeting-notes');
  assert.ok(meetingPage);
  assert.equal(meetingPage.title, 'Weekly Team Sync');
  assert.equal(meetingPage.icon, '🤝');
  assert.ok(meetingPage.blocks.length >= 7);
  const blockTypes = meetingPage.blocks.map(b => b.type);
  assert.ok(blockTypes.includes('heading'));
  assert.ok(blockTypes.includes('bullet'));
  assert.ok(blockTypes.includes('todo'));

  // Test Daily Journal template
  const journalPage = store.createFromTemplate('daily-journal');
  assert.ok(journalPage);
  assert.ok(journalPage.title.startsWith('Journal —'));
  assert.equal(journalPage.icon, '📔');
  assert.ok(journalPage.blocks.length >= 5);

  // Test Reading List template (database page)
  const readingPage = store.createFromTemplate('reading-list');
  assert.ok(readingPage);
  assert.equal(readingPage.type, 'database');
  assert.equal(readingPage.icon, '📚');
  const db = store.getDatabase(readingPage.id);
  assert.ok(db.rows.length >= 2);
  assert.ok(db.columns.some(c => c.name === 'Author'));
  assert.ok(db.columns.some(c => c.name === 'Rating (1-5)'));
});

test('Notion Page Typography and layout options persist on page', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({
    title: 'Typography Playground',
    fontFamily: 'serif',
    smallText: true,
    fullWidth: true
  });

  assert.equal(page.fontFamily, 'serif');
  assert.equal(page.smallText, true);
  assert.equal(page.fullWidth, true);

  store.updatePage(page.id, { fontFamily: 'mono', smallText: false });
  const updated = store.getPage(page.id);
  assert.equal(updated.fontFamily, 'mono');
  assert.equal(updated.smallText, false);
  assert.equal(updated.fullWidth, true);
});
