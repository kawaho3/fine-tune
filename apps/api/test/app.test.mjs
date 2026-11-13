import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHandler } from '../src/app.mjs';

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

async function generate(body, headers = { 'Content-Type': 'application/json' }) {
  return fetch(`${base}/api/generate`, { method: 'POST', headers, body });
}

test('health is honest about model connection', async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(data, { status: 'ok', mode: 'offline_mock', model_connected: false });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
});

test('serves the UI and required assets from an allowlist only', async () => {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /fine-tune · Builder prototype/);
  assert.match(html, /<iframe[^>]*sandbox=""/);
  assert.match(html, /No live LLM/);
  assert.match((await fetch(`${base}/app.js`)).headers.get('content-type'), /text\/javascript/);
  assert.match((await fetch(`${base}/styles.css`)).headers.get('content-type'), /text\/css/);
  assert.equal((await fetch(`${base}/not-found`)).status, 404);
  assert.equal((await fetch(`${base}/.env`)).status, 404);
});

test('returns a static mock file and explicit unimplemented statuses', async () => {
  const response = await generate(JSON.stringify({ prompt: 'Build a charming boutique store with products' }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.category, 'store');
  assert.equal(data.status, 'mock_only');
  assert.equal(data.verification.browser_tests, 'not_run');
  assert.match(data.files[0].content, /Boutique Store/);
  assert.equal(data.plan[2].status, 'not_implemented');
});

test('returns validation errors on missing or incorrect prompt', async () => {
  for (const body of ['{}', '{"prompt":4}', '{"prompt":"short"}', '[]']) {
    const response = await generate(body);
    assert.equal(response.status, 400);
    assert.ok((await response.json()).error);
  }
});

test('rejects wrong content type, malformed JSON and oversized input', async () => {
  const contentType = await generate('hello world', { 'Content-Type': 'text/plain' });
  assert.equal(contentType.status, 415);
  assert.equal((await generate('{bad json')).status, 400);
  const large = await generate(JSON.stringify({ prompt: 'a'.repeat(5000) }));
  assert.equal(large.status, 413);
});

test('rejects unsupported methods and does not expose a command-execution endpoint', async () => {
  assert.equal((await fetch(`${base}/api/generate`)).status, 405);
  assert.equal((await fetch(`${base}/api/health`, { method: 'POST' })).status, 405);
  assert.equal((await fetch(`${base}/api/run`, { method: 'POST' })).status, 404);
});
