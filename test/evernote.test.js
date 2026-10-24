import test from 'node:test';
import assert from 'node:assert/strict';
import { AppFlowyStore } from '../src/store.js';
import { pagesToENEX, enexToPages } from '../src/components/io.js';

test('Evernote Global Tags: indexing, counts, and filtering', () => {
  const store = new AppFlowyStore();
  const page1 = store.createPage({ title: 'Invoice #1042', tags: ['#receipts', '#finances'] });
  const page2 = store.createPage({ title: 'Q4 Budget', tags: ['#finances', '#urgent'] });
  const page3 = store.createPage({ title: 'Design System', tags: ['#design'] });

  const allTags = store.getAllTags();
  const tagMap = Object.fromEntries(allTags.map(t => [t.tag, t.count]));

  assert.equal(tagMap['#finances'], 2);
  assert.equal(tagMap['#receipts'], 1);
  assert.equal(tagMap['#urgent'], 1);
  assert.equal(tagMap['#design'], 1);

  // Filter by tag
  const financeNotes = store.getPagesByTag('#finances');
  assert.equal(financeNotes.length, 2);
  const titles = financeNotes.map(n => n.title);
  assert.ok(titles.includes('Invoice #1042'));
  assert.ok(titles.includes('Q4 Budget'));

  // Add and remove tags
  store.addTagToPage(page1.id, '#tax2026');
  assert.ok(store.getPage(page1.id).tags.includes('#tax2026'));

  store.removeTagFromPage(page1.id, '#receipts');
  assert.ok(!store.getPage(page1.id).tags.includes('#receipts'));
});

test('Evernote Note Reminders: classification of upcoming, overdue, and completed', () => {
  const store = new AppFlowyStore();
  const now = Date.now();

  // Upcoming reminder (tomorrow)
  const pUpcoming = store.createPage({ title: 'Client Proposal Deadline' });
  store.setReminder(pUpcoming.id, new Date(now + 86400000).toISOString());

  // Overdue reminder (yesterday)
  const pOverdue = store.createPage({ title: 'Tax Submission' });
  store.setReminder(pOverdue.id, new Date(now - 86400000).toISOString());

  // Completed reminder
  const pDone = store.createPage({ title: 'Deploy to Staging' });
  store.setReminder(pDone.id, new Date(now + 3600000).toISOString());
  store.toggleReminderDone(pDone.id);

  const reminders = store.getReminders();
  assert.equal(reminders.upcoming.length, 1);
  assert.equal(reminders.upcoming[0].title, 'Client Proposal Deadline');

  assert.equal(reminders.overdue.length, 1);
  assert.equal(reminders.overdue[0].title, 'Tax Submission');

  assert.equal(reminders.completed.length, 1);
  assert.equal(reminders.completed[0].title, 'Deploy to Staging');
});

test('Evernote Quick Scratchpad: persistence and conversion to permanent note', () => {
  const store = new AppFlowyStore();

  store.setScratchpad('Call with investor at 2pm\nDiscuss valuation\nSend deck after call');
  assert.equal(store.getScratchpad(), 'Call with investor at 2pm\nDiscuss valuation\nSend deck after call');

  const note = store.convertScratchpadToNote('space-personal');
  assert.ok(note);
  assert.equal(note.title, 'Call with investor at 2pm');
  assert.ok(note.tags.includes('#scratchpad'));
  assert.ok(note.blocks.length >= 3);

  // Scratchpad is cleared after conversion
  assert.equal(store.getScratchpad(), '');
});

test('Evernote ENEX XML Export: generates standard XML format', () => {
  const page = {
    id: 'p-export-1',
    title: 'Evernote Migration Test',
    createdAt: 1729700000000,
    updatedAt: 1729700000000,
    tags: ['#evernote', '#migration'],
    reminderDate: '2026-10-25T10:00:00.000Z',
    reminderDone: false,
    sourceUrl: 'https://evernote.com',
    blocks: [
      { id: 'b1', type: 'heading', level: 1, text: 'Evernote Migration Test' },
      { id: 'b2', type: 'paragraph', text: 'This is a test note for ENEX export.' },
      { id: 'b3', type: 'todo', text: 'Verify XML formatting', checked: true }
    ]
  };

  const xml = pagesToENEX([page]);
  assert.ok(xml.includes('<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">'));
  assert.ok(xml.includes('<title>Evernote Migration Test</title>'));
  assert.ok(xml.includes('<tag>evernote</tag>'));
  assert.ok(xml.includes('<tag>migration</tag>'));
  assert.ok(xml.includes('<reminder-order>'));
  assert.ok(xml.includes('<source-url>https://evernote.com</source-url>'));
  assert.ok(xml.includes('<![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">'));
  assert.ok(xml.includes('</en-export>'));
});

test('Evernote ENEX XML Import: parses notes, tags, and blocks from ENEX file', () => {
  const enexSample = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE en-export SYSTEM "http://xml.evernote.com/pub/evernote-export4.dtd">
<en-export export-date="20261024T060000Z" application="Evernote" version="10.50">
  <note>
    <title>Meeting with Design Team</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><div>Discussed new dark mode palette</div><div>Finalized token architecture</div></en-note>]]></content>
    <created>20261020T120000Z</created>
    <tag>design</tag>
    <tag>ux</tag>
  </note>
  <note>
    <title>Quick Bookmark</title>
    <content><![CDATA[<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note><div>https://developer.mozilla.org</div></en-note>]]></content>
    <created>20261021T090000Z</created>
    <tag>reference</tag>
  </note>
</en-export>`;

  const importedPages = enexToPages(enexSample, 'space-work');
  assert.equal(importedPages.length, 2);

  // Note 1
  assert.equal(importedPages[0].title, 'Meeting with Design Team');
  assert.ok(importedPages[0].tags.includes('#design'));
  assert.ok(importedPages[0].tags.includes('#ux'));
  assert.equal(importedPages[0].icon, '🐘');
  assert.ok(importedPages[0].blocks.length >= 2);

  // Note 2
  assert.equal(importedPages[1].title, 'Quick Bookmark');
  assert.ok(importedPages[1].tags.includes('#reference'));
});
