import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { unzipSync, strFromU8 } from 'fflate';
import { generateMockProject } from '@fine-tune/core';
import { createHandler } from '../src/app.mjs';
import { createProjectArchive } from '../src/project-export.mjs';

let server;
let base;
before(async () => {
  server = createServer(createHandler());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

function decode(archive) {
  return Object.fromEntries(Object.entries(unzipSync(archive)).map(([path, content]) => [path, strFromU8(content)]));
}

test('complete project archive preserves every source file and Unicode, deterministically', () => {
  const files = [
    { path: 'index.html', content: '<h1>नमस्ते 🌱</h1>' },
    { path: 'README.md', content: '# Run locally\nOpen index.html.' },
    { path: 'src/styles.css', content: 'body { color: green; }' },
  ];
  const archive = createProjectArchive(files);
  assert.deepEqual(decode(archive), Object.fromEntries(files.map((file) => [file.path, file.content])));
  assert.deepEqual(archive, createProjectArchive(files));
});

test('archive rejects traversal, absolute paths, separators, hidden files and ambiguous device names', () => {
  const unsafe = [
    '../escape', '/etc/passwd', 'C:/escape', 'C:\\escape', 'src/../escape',
    'src/./index.html', 'src//index.html', 'src\\index.html', '.env',
    'src/.git/config', 'src/trailing.', 'src/name ', 'file\0.html',
    'src/file\r\n.html', 'src/', 'CON', 'aux.txt', 'COM1.js', 'src/Lpt9',
    '__proto__', 'src/__proto__', 'constructor', 'prototype', '', 'x'.repeat(241),
  ];
  for (const path of unsafe) {
    assert.throws(() => createProjectArchive([{ path, content: 'data' }]), /unsafe file path/, path);
  }
});

test('archive rejects duplicate and overlapping paths across case-insensitive extractors', () => {
  for (const paths of [['index.html', 'index.html'], ['README.md', 'readme.md'], ['src', 'src/app.js'], ['src/app.js', 'SRC']]) {
    assert.throws(() => createProjectArchive(paths.map((path) => ({ path, content: 'data' }))), /unique.*overlap/);
  }
});

test('archive enforces file count, entry shape and UTF-8 byte budgets', () => {
  for (const files of [null, [], Array.from({ length: 101 }, (_, i) => ({ path: `${i}.txt`, content: '' }))]) {
    assert.throws(() => createProjectArchive(files), /between 1 and 100/);
  }
  for (const files of [[null], [{ path: 'one.txt', content: 1 }], [{ path: 4, content: '' }]]) {
    assert.throws(() => createProjectArchive(files), /path and text content/);
  }
  assert.throws(() => createProjectArchive([{ path: 'large.txt', content: 'a'.repeat(512 * 1024 + 1) }]), /size limit/);
  assert.throws(() => createProjectArchive([{ path: 'unicode.txt', content: '🌱'.repeat(150_000) }]), /size limit/);
  assert.throws(() => createProjectArchive(Array.from({ length: 3 }, (_, i) => ({ path: `${i}.txt`, content: 'a'.repeat(400_000) }))), /size limit/);
});

test('export API downloads the complete generated project with fixed safe headers', async () => {
  const prompt = 'Create a café boutique store with handmade products 🌱';
  const response = await fetch(`${base}/api/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }),
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  assert.equal(response.headers.get('content-disposition'), 'attachment; filename="fine-tune-project.zip"');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  const archive = new Uint8Array(await response.arrayBuffer());
  assert.equal(Number(response.headers.get('content-length')), archive.byteLength);
  assert.deepEqual(decode(archive), Object.fromEntries(generateMockProject(prompt).files.map((file) => [file.path, file.content])));
});

test('export API cannot inject submitted files, filenames or host paths into the archive', async () => {
  const prompt = 'Build a portfolio showing /etc/passwd and ../secrets safely';
  const response = await fetch(`${base}/api/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, files: [{ path: '../.env', content: 'injected' }], filename: '../secret.zip' }),
  });
  assert.equal(response.status, 200);
  const decoded = decode(new Uint8Array(await response.arrayBuffer()));
  assert.deepEqual(Object.keys(decoded).sort(), ['README.md', 'index.html']);
  assert.match(decoded['index.html'], /portfolio/i);
  assert.ok(!Object.values(decoded).some((content) => content.includes('injected')));
});

test('export API applies prompt, content-type, malformed JSON and request-size validation', async () => {
  const cases = [
    ['{}', 'application/json', 400],
    ['{"prompt":"short"}', 'application/json', 400],
    ['{"prompt":9}', 'application/json', 400],
    ['[]', 'application/json', 400],
    ['{invalid', 'application/json', 400],
    ['hello world', 'text/plain', 415],
    [JSON.stringify({ prompt: 'a'.repeat(5000) }), 'application/json', 413],
  ];
  for (const [body, contentType, expected] of cases) {
    const response = await fetch(`${base}/api/export`, { method: 'POST', headers: { 'Content-Type': contentType }, body });
    assert.equal(response.status, expected);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('export API rejects unsupported methods and cannot expose host files', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const response = await fetch(`${base}/api/export`, { method });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'POST');
  }
  assert.equal((await fetch(`${base}/api/export/.env`)).status, 404);
});
