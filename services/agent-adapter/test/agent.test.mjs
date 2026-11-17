import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AgentAdapterError, OpenHandsAgentServerAdapter, createOpenHandsAgentAdapterFromEnv } from '../src/index.mjs';

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { await fn(baseUrl); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => {
      if (!chunks.length) return resolve(null);
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

function json(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(body));
}

test('creates a bounded OpenHands conversation using the v1.62 REST shape', async () => {
  await withServer(async (request, response) => {
    assert.equal(request.method, 'POST');
    assert.equal(request.url, '/api/conversations');
    assert.equal(request.headers['x-session-api-key'], 'session-key');
    const body = await readJson(request);
    assert.deepEqual(body, {
      agent: { kind: 'Agent', llm: { model: 'fixture' } },
      initial_message: { role: 'user', content: [{ type: 'text', text: 'Build the fixture app' }] },
      max_iterations: 12,
      max_budget_per_run: 1.5,
      stuck_detection: true,
      workspace: { type: 'local', working_dir: '/workspace' },
      hook_config: null,
      user_id: null,
    });
    json(response, 200, { id: 'conv-1', execution_status: 'idle' });
  }, async (baseUrl) => {
    const adapter = new OpenHandsAgentServerAdapter({ baseUrl, apiKey: 'session-key' });
    const session = await adapter.createSession({
      agent: { kind: 'Agent', llm: { model: 'fixture' } },
      initialMessage: 'Build the fixture app',
      maxIterations: 12,
      maxBudgetPerRun: 1.5,
    });
    assert.equal(session.id, 'conv-1');
  });
});

test('rejects redirects without replaying conversation data or the session key', async () => {
  const dummyKey = 'redirect-regression-dummy-key';
  let sourceRequests = 0;
  let targetRequests = 0;
  let forwardedKeys = 0;
  let failure;
  await withServer(async (request, response) => {
    await readJson(request);
    targetRequests += 1;
    if (request.headers['x-session-api-key'] === dummyKey) forwardedKeys += 1;
    json(response, 200, { id: 'redirected-conversation' });
  }, async (targetUrl) => {
    await withServer((request, response) => {
      request.resume();
      sourceRequests += 1;
      response.writeHead(307, { Location: `${targetUrl}/api/conversations` });
      response.end();
    }, async (baseUrl) => {
      const adapter = new OpenHandsAgentServerAdapter({ baseUrl, apiKey: dummyKey });
      try {
        await adapter.createSession({ agent: { kind: 'Agent', llm: { model: 'fixture' } }, initialMessage: 'Keep this fixture at the configured server.' });
      } catch (error) { failure = error; }
    });
  });
  assert.equal(sourceRequests, 1);
  assert.deepEqual({ targetRequests, forwardedKeys }, { targetRequests: 0, forwardedKeys: 0 });
  assert.ok(failure instanceof AgentAdapterError);
  assert.equal(failure.code, 'transport_error');
});

test('sends user event then runs, pauses and interrupts using stable lifecycle endpoints', async () => {
  const seen = [];
  await withServer(async (request, response) => {
    const body = await readJson(request);
    seen.push({ method: request.method, url: request.url, body });
    json(response, 200, { success: true });
  }, async (baseUrl) => {
    const adapter = new OpenHandsAgentServerAdapter({ baseUrl });
    await adapter.sendUserMessage('abc', 'Fix the failing test');
    await adapter.run('abc');
    await adapter.pause('abc');
    await adapter.interrupt('abc');
  });
  assert.deepEqual(seen, [
    { method: 'POST', url: '/api/conversations/abc/events', body: { role: 'user', content: [{ type: 'text', text: 'Fix the failing test' }], run: false } },
    { method: 'POST', url: '/api/conversations/abc/run', body: null },
    { method: 'POST', url: '/api/conversations/abc/pause', body: null },
    { method: 'POST', url: '/api/conversations/abc/interrupt', body: null },
  ]);
});

test('reads session state, events and final response', async () => {
  await withServer((request, response) => {
    if (request.url === '/api/conversations/abc') return json(response, 200, { id: 'abc', execution_status: 'finished' });
    if (request.url.startsWith('/api/conversations/abc/events/search?')) return json(response, 200, { items: [{ kind: 'MessageEvent' }], next_page_id: null });
    if (request.url === '/api/conversations/abc/agent_final_response') return json(response, 200, { response: 'Completed.' });
    json(response, 404, { detail: 'not found' });
  }, async (baseUrl) => {
    const adapter = new OpenHandsAgentServerAdapter({ baseUrl });
    assert.equal((await adapter.getSession('abc')).execution_status, 'finished');
    const events = await adapter.listEvents('abc', { limit: 20, kind: 'MessageEvent', sortOrder: 'TIMESTAMP_DESC' });
    assert.equal(events.items.length, 1);
    assert.equal(await adapter.getFinalResponse('abc'), 'Completed.');
  });
});

test('maps OpenHands HTTP failures without retrying lifecycle side effects', async () => {
  let calls = 0;
  await withServer((_request, response) => {
    calls += 1;
    json(response, 409, { detail: 'Conversation is already running' });
  }, async (baseUrl) => {
    const adapter = new OpenHandsAgentServerAdapter({ baseUrl });
    await assert.rejects(() => adapter.run('abc'), (error) => error instanceof AgentAdapterError && error.code === 'busy' && error.status === 409 && error.retryable === false);
  });
  assert.equal(calls, 1);
});

test('enforces timeout and caller cancellation', async () => {
  const fetchImpl = async (_url, init) => {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 100);
      init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason ?? new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const adapter = new OpenHandsAgentServerAdapter({ timeoutMs: 5, fetchImpl });
  await assert.rejects(() => adapter.getSession('abc'), (error) => error.code === 'timeout');

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => adapter.getSession('abc', { signal: controller.signal }), (error) => error.code === 'cancelled');
});

test('does not dispatch a lifecycle request cancelled before its fetch microtask', async () => {
  let calls = 0;
  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async () => {
    calls += 1;
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  } });
  const controller = new AbortController();
  const pending = adapter.run('abc', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, (error) => error instanceof AgentAdapterError && error.code === 'cancelled');
  assert.equal(calls, 0);
});

test('an awaited timeout survives when a custom fetch provides no event-loop handles', async () => {
  const moduleUrl = new URL('../src/index.mjs', import.meta.url).href;
  const source = `
    import { OpenHandsAgentServerAdapter } from ${JSON.stringify(moduleUrl)};
    const adapter = new OpenHandsAgentServerAdapter({ timeoutMs: 20, fetchImpl: async () => new Promise(() => {}) });
    const outcome = await adapter.getSession('fixture').then(
      () => ({ unexpectedFulfillment: true }),
      (error) => ({ name: error.name, code: error.code, retryable: error.retryable }),
    );
    console.log(JSON.stringify(outcome));
  `;
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '--eval', source], { timeout: 5000 });
  assert.deepEqual(JSON.parse(stdout), { name: 'AgentAdapterError', code: 'timeout', retryable: true });
});

test('rejects dot-segment conversation IDs before dispatching a delete', async () => {
  const calls = [];
  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async (url, init) => {
    calls.push({ method: init.method, pathname: new URL(url).pathname });
    return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  } });
  for (const id of ['.', '..', ' . ', ' .. ']) {
    await assert.rejects(() => adapter.deleteSession(id), (error) => error instanceof AgentAdapterError && error.code === 'invalid_request');
  }
  assert.deepEqual(calls, []);
  await adapter.deleteSession('conv..-1');
  assert.deepEqual(calls, [{ method: 'DELETE', pathname: '/api/conversations/conv..-1' }]);
});

test('validates endpoint safety and bounded iteration settings', async () => {
  assert.throws(() => new OpenHandsAgentServerAdapter({ baseUrl: 'https://agent.example.com' }), /disabled by default/);
  assert.throws(() => new OpenHandsAgentServerAdapter({ baseUrl: 'http://user:pass@localhost:8000' }), /must not contain credentials/);
  assert.throws(() => new OpenHandsAgentServerAdapter({ maxIterations: 201 }), /between 1 and 200/);

  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async () => new Response(JSON.stringify({ id: 'x' }), { status: 200, headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(() => adapter.createSession({ agent: {}, maxIterations: 0 }), /between 1 and 200/);
  await assert.rejects(() => adapter.sendUserMessage('bad/id', 'hello'), /conversationId is invalid/);
});

test('environment factory defaults to local OpenHands and remains dependency-free', async () => {
  let requested;
  const adapter = createOpenHandsAgentAdapterFromEnv({}, {
    fetchImpl: async (url, init) => {
      requested = { url: String(url), init };
      return new Response(JSON.stringify({ id: 'abc', execution_status: 'idle' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    },
  });
  await adapter.getSession('abc');
  assert.equal(requested.url, 'http://127.0.0.1:8000/api/conversations/abc');
});

test('bounds fragmented OpenHands response bytes and cancels on overflow', async () => {
  let calls = 0, cancelled = false;
  const encoder = new TextEncoder();
  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async () => {
    calls += 1;
    let index = 0;
    return new Response(new ReadableStream({
      pull(controller) {
        const parts = ['{"response":"', 'x'.repeat(600_000), 'x'.repeat(600_000), '"}'];
        if (index < parts.length) controller.enqueue(encoder.encode(parts[index++]));
        else controller.close();
      },
      cancel() { cancelled = true; },
    }), { headers: { 'Content-Type': 'application/json' } });
  } });
  await assert.rejects(() => adapter.getFinalResponse('abc'), (error) => error instanceof AgentAdapterError && error.code === 'response_too_large' && error.retryable === false);
  assert.equal(calls, 1);
  assert.equal(cancelled, true);
});

test('OpenHands timeout cancels a custom held-open response body', async () => {
  let cancelled = false;
  const adapter = new OpenHandsAgentServerAdapter({ timeoutMs: 10, fetchImpl: async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{')); },
    cancel() { cancelled = true; },
  }), { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(() => adapter.getSession('abc'), (error) => error.code === 'timeout');
  assert.equal(cancelled, true);
});

test('OpenHands HTTP error messages do not expose provider details or credentials', async () => {
  const secretFixture = 'sensitive-fixture-value-never-for-errors';
  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async () => new Response(JSON.stringify({ detail: secretFixture }), {
    status: 500, headers: { 'Content-Type': 'application/json' },
  }) });
  await assert.rejects(() => adapter.run('abc'), (error) => {
    assert.equal(error.code, 'server_error');
    assert.equal(error.status, 500);
    assert.equal(error.message, 'OpenHands request failed with HTTP 500.');
    assert.equal(JSON.stringify(error).includes(secretFixture), false);
    return true;
  });
});

test('malformed OpenHands JSON does not retain response excerpts in error causes', async () => {
  const adapter = new OpenHandsAgentServerAdapter({ fetchImpl: async () => new Response('sensitive-invalid-json-fixture', { headers: { 'Content-Type': 'application/json' } }) });
  await assert.rejects(() => adapter.getSession('abc'), (error) => {
    assert.equal(error.code, 'invalid_response');
    assert.equal(error.cause, undefined);
    assert.equal(error.message.includes('sensitive-invalid-json-fixture'), false);
    return true;
  });
});
