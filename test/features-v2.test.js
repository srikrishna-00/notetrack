// test/features-v2.test.js - Unit tests for universal attachments, @ symbols, folders, diagrams, sticky notes, and WhatsApp/Telegram features
import test from 'node:test';
import assert from 'node:assert/strict';
import { AppFlowyStore } from '../src/store.js';
import { pageToMarkdown, markdownToBlocks } from '../src/components/io.js';
import { formatFileSize, getFileMeta, getMentionSymbols } from '../src/components/editor.js';

test('Folder creation, nested hierarchy, and contents retrieval', () => {
  const store = new AppFlowyStore();
  
  // Create root folder
  const rootFolder = store.createFolder({ title: 'Project Specs', icon: '📁' });
  assert.ok(rootFolder);
  assert.equal(rootFolder.type, 'folder');
  assert.equal(rootFolder.title, 'Project Specs');
  assert.equal(rootFolder.parentId, null);

  // Create child page inside folder
  const childDoc = store.createPage({ title: 'System Architecture', parentId: rootFolder.id, type: 'document' });
  assert.equal(childDoc.parentId, rootFolder.id);

  // Create subfolder inside folder
  const subFolder = store.createFolder({ title: 'Assets & Media', parentId: rootFolder.id });
  assert.equal(subFolder.parentId, rootFolder.id);
  assert.equal(subFolder.type, 'folder');

  // Query folder contents
  const contents = store.getFolderContents(rootFolder.id);
  assert.equal(contents.length, 2);
  const ids = contents.map(c => c.id);
  assert.ok(ids.includes(childDoc.id));
  assert.ok(ids.includes(subFolder.id));

  // Subfolder contents initially empty
  const subContents = store.getFolderContents(subFolder.id);
  assert.equal(subContents.length, 0);

  // Add document to subfolder
  const nestedDoc = store.createPage({ title: 'Logo Asset Spec', parentId: subFolder.id });
  const updatedSubContents = store.getFolderContents(subFolder.id);
  assert.equal(updatedSubContents.length, 1);
  assert.equal(updatedSubContents[0].id, nestedDoc.id);
});

test('WhatsApp & Telegram Pinned and Starred Note Toggles', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({ title: 'Telegram Saved Messages', type: 'chat' });

  // Default states
  assert.equal(Boolean(page.isPinned), false);
  assert.equal(Boolean(page.isStarred), false);

  // Toggle Pin
  const isPinned = store.togglePin(page.id);
  assert.equal(isPinned, true);
  assert.equal(store.getPage(page.id).isPinned, true);

  store.togglePin(page.id);
  assert.equal(store.getPage(page.id).isPinned, false);

  // Toggle Star
  const isStarred = store.toggleStar(page.id);
  assert.equal(isStarred, true);
  assert.equal(store.getPage(page.id).isStarred, true);

  store.toggleStar(page.id);
  assert.equal(store.getPage(page.id).isStarred, false);
});

test('Universal File Metadata, Badges, and File Size Formatter', () => {
  // Test formatFileSize
  assert.equal(formatFileSize(0), '0 B');
  assert.equal(formatFileSize(512), '512 B');
  assert.equal(formatFileSize(1024), '1.0 KB');
  assert.equal(formatFileSize(2048), '2.0 KB');
  assert.equal(formatFileSize(1048576), '1.0 MB');
  assert.equal(formatFileSize(5242880), '5.0 MB');
  assert.equal(formatFileSize(1073741824), '1.0 GB');

  // Test getFileMeta across various file types
  const pdfMeta = getFileMeta('annual-report.pdf', 'application/pdf');
  assert.equal(pdfMeta.icon, '📕');
  assert.equal(pdfMeta.badge, 'PDF');
  assert.equal(pdfMeta.isPdf, true);

  const docMeta = getFileMeta('requirements.docx');
  assert.equal(docMeta.icon, '📘');
  assert.equal(docMeta.badge, 'DOCX');

  const sheetMeta = getFileMeta('budget.xlsx');
  assert.equal(sheetMeta.icon, '📗');
  assert.equal(sheetMeta.badge, 'XLSX');

  const slidesMeta = getFileMeta('pitch-deck.pptx');
  assert.equal(slidesMeta.icon, '📙');
  assert.equal(slidesMeta.badge, 'PPTX');

  const zipMeta = getFileMeta('backup-archive.zip');
  assert.equal(zipMeta.icon, '🗜️');
  assert.equal(zipMeta.badge, 'ZIP');

  const codeMeta = getFileMeta('server.py');
  assert.equal(codeMeta.icon, '💻');
  assert.equal(codeMeta.badge, 'PY');
  assert.equal(codeMeta.isCode, true);

  const audioMeta = getFileMeta('voice-note.mp3', 'audio/mpeg');
  assert.equal(audioMeta.icon, '🎵');
  assert.equal(audioMeta.badge, 'MP3');

  const videoMeta = getFileMeta('demo-recording.mp4', 'video/mp4');
  assert.equal(videoMeta.icon, '🎬');
  assert.equal(videoMeta.badge, 'MP4');

  const unknownMeta = getFileMeta('dataset.parquet');
  assert.equal(unknownMeta.icon, '📎');
  assert.equal(unknownMeta.badge, 'PARQUET');
});

test('@ Mention Symbols catalog provides rich categories', () => {
  const symbols = getMentionSymbols();
  assert.ok(Array.isArray(symbols));
  assert.ok(symbols.length >= 40);

  // Verify presence of required groups
  const groups = new Set(symbols.map(s => s.group));
  assert.ok(groups.has('Emojis'));
  assert.ok(groups.has('Math & Logic'));
  assert.ok(groups.has('Arrows'));
  assert.ok(groups.has('Currencies'));
  assert.ok(groups.has('Roles & Mentions'));

  // Test specific symbols
  assert.ok(symbols.some(s => s.icon === '🔥' && s.insert.includes('🔥')));
  assert.ok(symbols.some(s => s.icon === '∑' && s.insert.includes('∑')));
  assert.ok(symbols.some(s => s.icon === '→' && s.insert.includes('→')));
  assert.ok(symbols.some(s => s.icon === '₹' && s.insert.includes('₹')));
  assert.ok(symbols.some(s => s.icon === '₿' && s.insert.includes('₿')));
  assert.ok(symbols.some(s => s.insert === '@urgent '));
});

test('Markdown I/O roundtrip for universal File and PDF attachment blocks', () => {
  const page = {
    title: 'Attachment Showcase',
    icon: '📎',
    blocks: [
      {
        id: 'b-file-1',
        type: 'file',
        fileName: 'architecture-diagram.png',
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      },
      {
        id: 'b-pdf-1',
        type: 'pdf',
        fileName: 'quarterly-audit.pdf',
        url: 'data:application/pdf;base64,JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCg=='
      }
    ]
  };

  const md = pageToMarkdown(page);
  assert.ok(md.includes('[📎 architecture-diagram.png]('));
  assert.ok(md.includes('[📕 quarterly-audit.pdf]('));

  // Parse markdown back to blocks
  const parsedBlocks = markdownToBlocks(md);
  const fileBlock = parsedBlocks.find(b => b.fileName === 'architecture-diagram.png');
  const pdfBlock = parsedBlocks.find(b => b.fileName === 'quarterly-audit.pdf');

  assert.ok(fileBlock, 'File block should be parsed back from markdown');
  assert.equal(fileBlock.type, 'file');
  assert.ok(fileBlock.url.startsWith('data:image/png'));

  assert.ok(pdfBlock, 'PDF block should be parsed back from markdown');
  assert.equal(pdfBlock.type, 'pdf');
  assert.ok(pdfBlock.url.startsWith('data:application/pdf'));
});

test('Granular removal of file and PDF blocks via removeBlocksByType', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({ title: 'Multi-Media Storage Note' });

  // Insert diverse blocks
  store.insertBlock(page.id, { type: 'paragraph', text: 'Important Note Body' });
  store.insertBlock(page.id, { type: 'image', url: 'https://example.com/photo.jpg' });
  store.insertBlock(page.id, { type: 'file', fileName: 'data.xlsx', url: 'data:application/vnd.ms-excel;base64,...' });
  store.insertBlock(page.id, { type: 'pdf', fileName: 'manual.pdf', url: 'data:application/pdf;base64,...' });

  const initialBlocks = store.getPage(page.id).blocks;
  assert.equal(initialBlocks.length, 6); // 2 default (h1, p) + 4 inserted

  // Remove files and PDFs specifically
  const removed = store.removeBlocksByType(page.id, ['file', 'pdf']);
  assert.equal(removed, 2);

  const remaining = store.getPage(page.id).blocks;
  assert.equal(remaining.some(b => b.type === 'file'), false);
  assert.equal(remaining.some(b => b.type === 'pdf'), false);
  assert.equal(remaining.some(b => b.type === 'image'), true);
  assert.equal(remaining.some(b => b.type === 'paragraph'), true);
});

test('Diagram, Sticky Note, and Chat bubble block structure persistence', () => {
  const store = new AppFlowyStore();
  const page = store.createPage({ title: 'Interactive Canvas' });

  // 1. Diagram block
  const diagramBlock = store.insertBlock(page.id, {
    type: 'diagram',
    diagType: 'flowchart',
    diagTitle: 'Login Flow',
    items: [
      { id: 'step-1', label: 'User enters credentials' },
      { id: 'step-2', label: 'Verify password hash' },
      { id: 'step-3', label: 'Generate JWT token' }
    ]
  });
  assert.equal(diagramBlock.type, 'diagram');
  assert.equal(diagramBlock.items.length, 3);

  // 2. Sticky Note block
  const stickyBlock = store.insertBlock(page.id, {
    type: 'sticky',
    color: 'yellow',
    text: 'Urgent meeting at 4 PM!'
  });
  assert.equal(stickyBlock.type, 'sticky');
  assert.equal(stickyBlock.color, 'yellow');
  assert.equal(stickyBlock.text, 'Urgent meeting at 4 PM!');

  // 3. Chat block
  const chatBlock = store.insertBlock(page.id, {
    type: 'chat',
    sender: 'Srikrishna',
    time: '12:45 PM',
    text: 'Sprint retrospective scheduled for tomorrow.'
  });
  assert.equal(chatBlock.type, 'chat');
  assert.equal(chatBlock.sender, 'Srikrishna');
  assert.equal(chatBlock.text, 'Sprint retrospective scheduled for tomorrow.');

  // Verify retrieval
  const blocks = store.getPage(page.id).blocks;
  assert.ok(blocks.some(b => b.type === 'diagram' && b.diagTitle === 'Login Flow'));
  assert.ok(blocks.some(b => b.type === 'sticky' && b.color === 'yellow'));
  assert.ok(blocks.some(b => b.type === 'chat' && b.sender === 'Srikrishna'));
});
