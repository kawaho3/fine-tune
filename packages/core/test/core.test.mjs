import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMockProject, validatePrompt, selectTemplate, escapeHtml, InputError } from '../src/index.mjs';

test('prompt validation rejects missing, short, too long and control characters', () => {
  for (const prompt of [null, 0, {}, '', 'short', 'a'.repeat(801), 'valid name\u0000x']) {
    assert.throws(() => validatePrompt(prompt), InputError);
  }
});

test('accepts trimmed Unicode prompts and allows embedded newlines', () => {
  assert.equal(validatePrompt('  मुझे एक सुंदर वेबसाइट चाहिए  '), 'मुझे एक सुंदर वेबसाइट चाहिए');
  assert.equal(validatePrompt('a long enough\nprompt'), 'a long enough\nprompt');
});

test('chooses semantic mock template by keywords, with a safe default', () => {
  assert.equal(selectTemplate('new clothing store').id, 'store');
  assert.equal(selectTemplate('designer portfolio').id, 'portfolio');
  assert.equal(selectTemplate('metrics dashboard').id, 'dashboard');
  assert.equal(selectTemplate('cafe and coffee').id, 'restaurant');
  assert.equal(selectTemplate('brand new technology concept').id, 'landing');
});

test('produces identical output for identical prompts and includes honest capability labels', () => {
  const a = generateMockProject('Create a wonderful coffee cafe website');
  assert.deepEqual(a, generateMockProject('Create a wonderful coffee cafe website'));
  assert.equal(a.status, 'mock_only');
  assert.equal(a.verification.build, 'not_run');
  assert.equal(a.verification.sandbox, 'not_configured');
  assert.equal(a.files.length, 2);
  assert.equal(a.files[0].path, 'index.html');
  assert.match(a.files[0].content, /<html lang="en">/);
  assert.match(a.files[1].content, /offline deterministic mock/);
});

test('escapes hostile user input and leaves no scripts in output', () => {
  const payload = `Create a portfolio <script>alert('x')</script> for me`;
  const result = generateMockProject(payload);
  assert.ok(result.files[0].content.includes('&lt;script&gt;'));
  assert.ok(!result.files[0].content.includes('<script>'));
  assert.ok(!result.files[0].content.includes('onerror='));
  assert.equal(escapeHtml('a&<"\''), 'a&amp;&lt;&quot;&#39;');
});

test('does not introduce network assets or JavaScript in generated output', () => {
  const { files } = generateMockProject('Create a simple fresh landing page');
  const html = files[0].content;
  assert.doesNotMatch(html, /<script|<link[^>]+href="https?:|<img[^>]+src="https?:/i);
  assert.match(html, /@media \(max-width:720px\)/);
});
