// test/ai.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { AIAssistant, APPFLOWY_BUILT_IN_PROMPTS } = require('../src/components/ai');

test('AIAssistant provides all 10 AppFlowy prompt templates', () => {
  const ai = new AIAssistant();
  const templates = ai.getTemplates();
  assert.equal(templates.length, 10);
  assert.ok(templates.some(t => t.name === 'Linux Terminal'));
  assert.ok(templates.some(t => t.name === 'Cover Letter Writer'));
  assert.ok(templates.some(t => t.name === 'Document Summarizer'));
  assert.ok(templates.some(t => t.name === 'Code Explainer & Refactorer'));
});

test('AIAssistant generates context-aware answers offline', async () => {
  const ai = new AIAssistant();
  const resp = await ai.ask({ prompt: 'Summarize this page for me' });
  assert.ok(resp.text);
  assert.ok(resp.text.includes('Document Summary'));

  const terminalResp = await ai.ask({ prompt: 'ls', templateId: 'builtin_prompt_1' });
  assert.ok(terminalResp.text.includes('appflowy-lean'));
});
