import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import { ModelGatewayError, OllamaModelProvider, ModelGateway, createModelGateway, createModelGatewayFromEnv } from '../src/index.mjs';

const messages = [{ role: 'user', content: 'Build a small task app.' }];

async function withServer(handler, fn) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try { await fn(baseUrl); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('mock provider is deterministic and reports no invented token usage', async () => {
  const gateway = createModelGateway({ provider: 'mock', mock: { responseText: 'fixture-result' } });
  const first = await gateway.generate({ messages });
  const second = await gateway.generate({ messages });
  assert.equal(first.text, 'fixture-result');
  assert.equal(second.text, first.text);
  assert.equal(first.provider, 'mock');
  assert.equal(first.model, 'deterministic-mock-v1');
  assert.equal(first.usage, null);
  assert.equal(first.attempts, 1);
  assert.ok(first.latencyMs >= 0);
});

test('validates request and provider configuration', async () => {
  const gateway = createModelGateway();
  await assert.rejects(() => gateway.generate({ messages: [] }), (error) => error instanceof ModelGatewayError && error.code === 'invalid_request');
  assert.throws(() => createModelGateway({ provider: 'missing' }), /Unsupported model provider/);
  assert.throws(() => new OllamaModelProvider({ baseUrl: 'https://models.example.com', model: 'coder' }), /Remote Ollama endpoints are disabled/);
  assert.throws(() => new OllamaModelProvider({ baseUrl: 'http://user:secret@localhost:11434', model: 'coder' }), /must not contain credentials/);
  await assert.rejects(() => gateway.generate({ messages, budget: { maxOutputTokens: 0 } }), /budget.maxOutputTokens/);
});

test('Ollama adapter sends chat request, applies budget and maps usage', async () => {
  let captured;
  const fetchImpl = async (url, init) => {
    captured = { url: String(url), init, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ message: { role: 'assistant', content: 'done' }, prompt_eval_count: 12, eval_count: 5, done: true }), { status: 200 });
  };
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'qwen-test', fetchImpl }), { maxRetries: 0 });
  const result = await gateway.generate({ messages, options: { temperature: 0 }, budget: { maxOutputTokens: 256 } });
  assert.equal(captured.url, 'http://127.0.0.1:11434/api/chat');
  assert.deepEqual(captured.body, { model: 'qwen-test', messages, stream: false, options: { temperature: 0, num_predict: 256 } });
  assert.equal(result.text, 'done');
  assert.deepEqual(result.usage, { inputTokens: 12, outputTokens: 5, totalTokens: 17 });
});

for (const mode of ['generate', 'stream']) {
  test(`Ollama ${mode} rejects redirects without replaying prompts to another server`, async () => {
    let sourceRequests = 0;
    let targetRequests = 0;
    let forwardedPrompts = 0;
    let failure;
    await withServer(async (request, response) => {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      targetRequests += 1;
      if (body.messages?.[0]?.content === messages[0].content) forwardedPrompts += 1;
      response.setHeader('Content-Type', mode === 'stream' ? 'application/x-ndjson' : 'application/json');
      response.end(JSON.stringify({ message: { content: 'redirected result' }, done: true }) + '\n');
    }, async (targetUrl) => {
      await withServer((request, response) => {
        request.resume();
        sourceRequests += 1;
        response.writeHead(307, { Location: `${targetUrl}/api/chat` });
        response.end();
      }, async (baseUrl) => {
        const gateway = new ModelGateway(new OllamaModelProvider({ baseUrl, model: 'fixture' }), { maxRetries: 0 });
        try {
          if (mode === 'generate') await gateway.generate({ messages });
          else for await (const _event of gateway.stream({ messages })) { /* Consume the native HTTP stream. */ }
        } catch (error) { failure = error; }
      });
    });
    assert.equal(sourceRequests, 1);
    assert.deepEqual({ targetRequests, forwardedPrompts }, { targetRequests: 0, forwardedPrompts: 0 });
    assert.ok(failure instanceof ModelGatewayError);
    assert.equal(failure.code, 'provider_unavailable');
    assert.equal(failure.provider, 'ollama');
  });
}

test('retries only retryable provider failures within the configured bound', async () => {
  let calls = 0;
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'coder', fetchImpl: async () => {
    calls += 1;
    if (calls === 1) return new Response(JSON.stringify({ error: 'temporary' }), { status: 503 });
    return new Response(JSON.stringify({ message: { content: 'recovered' }, done: true }), { status: 200 });
  } }), { maxRetries: 1, retryDelayMs: 0 });
  const result = await gateway.generate({ messages });
  assert.equal(result.text, 'recovered');
  assert.equal(result.attempts, 2);
  assert.equal(calls, 2);

  let badCalls = 0;
  const badGateway = new ModelGateway(new OllamaModelProvider({ model: 'coder', fetchImpl: async () => {
    badCalls += 1;
    return new Response(JSON.stringify({ error: 'bad request' }), { status: 400 });
  } }), { maxRetries: 3, retryDelayMs: 0 });
  await assert.rejects(() => badGateway.generate({ messages }), (error) => error.code === 'provider_response_error' && error.status === 400 && error.retryable === false);
  assert.equal(badCalls, 1);
});

test('default retry delay keeps an awaited operation alive in an otherwise idle process', () => {
  const script = `
    import assert from 'node:assert/strict';
    import { ModelGateway, ModelGatewayError } from ${JSON.stringify(new URL('../src/index.mjs', import.meta.url).href)};
    let calls = 0;
    const provider = {
      name: 'retry-liveness-fixture',
      async generate() {
        calls += 1;
        if (calls === 1) throw new ModelGatewayError('Temporary fixture failure.', { retryable: true });
        return { text: 'recovered' };
      },
      async *stream() {},
    };
    const result = await new ModelGateway(provider).generate({ messages: [{ role: 'user', content: 'fixture' }] });
    assert.equal(result.text, 'recovered');
    assert.equal(result.attempts, 2);
    assert.equal(calls, 2);
    console.log('retry-completed');
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'retry-completed');
});

test('in-flight timeouts keep unresponsive provider operations bounded in an otherwise idle process', () => {
  const script = `
    import assert from 'node:assert/strict';
    import { ModelGateway } from ${JSON.stringify(new URL('../src/index.mjs', import.meta.url).href)};
    const provider = {
      name: 'timeout-liveness-fixture',
      async generate() { await new Promise(() => {}); },
      async *stream() { await new Promise(() => {}); },
    };
    const gateway = new ModelGateway(provider, { timeoutMs: 10, maxRetries: 0 });
    const request = { messages: [{ role: 'user', content: 'fixture' }] };
    await assert.rejects(() => gateway.generate(request), (error) => error.code === 'timeout');
    await assert.rejects(async () => { for await (const _event of gateway.stream(request)) {} }, (error) => error.code === 'timeout');
    console.log('timeouts-completed');
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 3000 });
  assert.equal(child.error, undefined);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stdout.trim(), 'timeouts-completed');
});

test('pre-aborted streaming does not invoke the provider stream factory', async () => {
  let calls = 0;
  const provider = {
    name: 'cancelled-stream-fixture',
    async generate() { return { text: 'fixture' }; },
    stream() {
      calls += 1;
      return (async function* () { yield { type: 'done' }; })();
    },
  };
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(async () => {
    for await (const _event of new ModelGateway(provider).stream({ messages, signal: controller.signal })) {}
  }, (error) => error.code === 'cancelled');
  assert.equal(calls, 0);
});

test('timeout and caller cancellation produce structured errors and are not retried', async () => {
  let timeoutCalls = 0;
  const slowFetch = async (_url, init) => {
    timeoutCalls += 1;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(resolve, 100);
      init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
    });
    return new Response('{}');
  };
  const timeoutGateway = new ModelGateway(new OllamaModelProvider({ model: 'coder', fetchImpl: slowFetch }), { timeoutMs: 10, maxRetries: 2, retryDelayMs: 0 });
  await assert.rejects(() => timeoutGateway.generate({ messages }), (error) => error.code === 'timeout' && error.retryable === false);
  assert.equal(timeoutCalls, 1);

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => createModelGateway().generate({ messages, signal: controller.signal }), (error) => error.code === 'cancelled');
});

test('gateway timeout is enforced even when a custom provider ignores the abort signal', async () => {
  const provider = {
    name: 'noncooperative-fixture',
    async generate() {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { text: 'too late', model: 'fixture', usage: null };
    },
    async *stream() {
      await new Promise((resolve) => setTimeout(resolve, 40));
      yield { type: 'text-delta', delta: 'too late' };
      yield { type: 'done', model: 'fixture', usage: null };
    },
  };
  const gateway = new ModelGateway(provider, { timeoutMs: 5, maxRetries: 0 });

  await assert.rejects(() => gateway.generate({ messages }), (error) => error.code === 'timeout');
  await assert.rejects(async () => {
    for await (const _event of gateway.stream({ messages })) {
      // The gateway must time out before this non-cooperative provider emits.
    }
  }, (error) => error.code === 'timeout');
});

test('Ollama streaming parses NDJSON and exposes final usage', async () => {
  const body = [JSON.stringify({ message: { content: 'hel' }, done: false }), JSON.stringify({ message: { content: 'lo' }, done: false }), JSON.stringify({ done: true, prompt_eval_count: 2, eval_count: 2 })].join('\n') + '\n';
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'coder', fetchImpl: async (_url, init) => {
    assert.equal(JSON.parse(init.body).stream, true);
    return new Response(body, { status: 200 });
  } }), { maxRetries: 0 });
  const events = [];
  for await (const event of gateway.stream({ messages })) events.push(event);
  assert.deepEqual(events.slice(0, 2).map((event) => event.delta), ['hel', 'lo']);
  assert.equal(events.at(-1).type, 'done');
  assert.equal(events.at(-1).provider, 'ollama');
  assert.deepEqual(events.at(-1).usage, { inputTokens: 2, outputTokens: 2, totalTokens: 4 });
});

for (const fixture of [
  { name: 'partial NDJSON', body: JSON.stringify({ message: { content: 'partial' }, done: false }) + '\n', deltas: ['partial'] },
  { name: 'empty response body', body: '', deltas: [] },
]) {
  test(`Ollama streaming rejects EOF after ${fixture.name} without a completion event`, async () => {
    let calls = 0;
    const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => {
      calls += 1;
      return new Response(fixture.body, { status: 200 });
    } }), { maxRetries: 3 });
    const deltas = [];
    let completed = false;
    await assert.rejects(async () => {
      for await (const event of gateway.stream({ messages })) {
        if (event.type === 'text-delta') deltas.push(event.delta);
        if (event.type === 'done') completed = true;
      }
    }, (error) => error instanceof ModelGatewayError && error.code === 'invalid_provider_response' && error.provider === 'ollama');
    assert.deepEqual(deltas, fixture.deltas);
    assert.equal(completed, false);
    assert.equal(calls, 1);
  });
}

test('streaming provider errors are normalized without replaying partial output', async () => {
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'coder', fetchImpl: async () => new Response([
    JSON.stringify({ message: { content: 'partial' }, done: false }),
    JSON.stringify({ error: 'provider failed' }),
  ].join('\n') + '\n', { status: 200 }) }), { maxRetries: 3 });
  const deltas = [];
  await assert.rejects(async () => {
    for await (const event of gateway.stream({ messages })) if (event.type === 'text-delta') deltas.push(event.delta);
  }, (error) => error.code === 'provider_response_error' && error.provider === 'ollama');
  assert.deepEqual(deltas, ['partial']);
});

test('environment configuration defaults to mock and validates integer settings', async () => {
  const mock = createModelGatewayFromEnv({});
  assert.equal((await mock.generate({ messages })).provider, 'mock');
  const ollama = createModelGatewayFromEnv({ MODEL_PROVIDER: 'ollama', OLLAMA_MODEL: 'coder' }, {
    fetchImpl: async () => new Response(JSON.stringify({ message: { content: 'ok' }, done: true }), { status: 200 }),
  });
  assert.equal((await ollama.generate({ messages })).text, 'ok');
  assert.throws(() => createModelGatewayFromEnv({ MODEL_TIMEOUT_MS: 'abc' }), /MODEL_TIMEOUT_MS must be an integer/);
});

test('custom providers remain replaceable behind the same gateway contract', async () => {
  const provider = {
    name: 'custom-fixture',
    async generate() { return { text: 'custom', model: 'fixture', usage: null }; },
    async *stream() { yield { type: 'text-delta', delta: 'custom' }; yield { type: 'done', model: 'fixture', usage: null }; },
  };
  const gateway = new ModelGateway(provider, { maxRetries: 0 });
  assert.equal((await gateway.generate({ messages })).provider, 'custom-fixture');
});

function fixtureBody(parts, { close = true, onCancel = () => {} } = {}) {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < parts.length) controller.enqueue(encoder.encode(parts[index++]));
      else if (close) controller.close();
    },
    cancel: onCancel,
  });
}

test('Ollama completion finishes without EOF and cancels the remaining transport', { timeout: 1000 }, async () => {
  let cancelled = false;
  const body = fixtureBody([
    '{"message":{"content":"finished"},"done":false}\n{"done":true,"eval_count":3}\n',
  ], { close: false, onCancel() { cancelled = true; } });
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response(body) }), { timeoutMs: 100 });
  const events = await Array.fromAsync(gateway.stream({ messages }));
  assert.deepEqual(events.map((event) => event.type), ['text-delta', 'done']);
  assert.equal(events[1].usage.outputTokens, 3);
  assert.equal(cancelled, true);
});

test('Ollama ignores trailing output after the first completion event', async () => {
  const body = '{"done":true}\n{"message":{"content":"must not be emitted"},"done":false}\nmalformed tail\n';
  const provider = new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response(body) });
  const events = await Array.fromAsync(provider.stream({ messages }));
  assert.deepEqual(events, [{ type: 'done', usage: null, model: 'fixture' }]);
});

test('consumer break aborts the provider signal and cancels its transport', async () => {
  let signal, cancelled = false;
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async (_url, init) => {
    signal = init.signal;
    return new Response(fixtureBody(['{"message":{"content":"one"},"done":false}\n'], { close: false, onCancel() { cancelled = true; } }));
  } }));
  for await (const event of gateway.stream({ messages })) {
    assert.equal(event.delta, 'one');
    break;
  }
  assert.equal(signal.aborted, true);
  assert.equal(cancelled, true);
});

for (const mode of ['generate', 'stream']) {
  test(`Ollama ${mode} rejects oversized JSON responses without retrying`, async () => {
    let calls = 0, cancelled = false;
    const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => {
      calls += 1;
      return new Response(fixtureBody(['{"error":"', 'x'.repeat(600_000), 'x'.repeat(600_000), '"}'], { onCancel() { cancelled = true; } }), { status: mode === 'stream' ? 503 : 200 });
    } }), { maxRetries: 3 });
    await assert.rejects(async () => {
      if (mode === 'generate') await gateway.generate({ messages });
      else for await (const event of gateway.stream({ messages })) assert.fail(`Unexpected event ${event.type}`);
    }, (error) => error.code === 'response_too_large' && error.retryable === false && error.provider === 'ollama');
    assert.equal(calls, 1);
    assert.equal(cancelled, true);
  });
}

test('Ollama bounds fragmented NDJSON lines in bytes and cancels on overflow', async () => {
  let cancelled = false;
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response(fixtureBody([
    '{"message":{"content":"', 'é'.repeat(20_000), 'é'.repeat(20_000), '"},"done":false}\n',
  ], { onCancel() { cancelled = true; } })) }));
  await assert.rejects(async () => {
    for await (const _event of gateway.stream({ messages })) assert.fail('Oversized line must not emit output');
  }, (error) => error.code === 'response_too_large' && error.retryable === false);
  assert.equal(cancelled, true);
});

test('Ollama bounds total streamed bytes even when every line is within its limit', async () => {
  let cancelled = false;
  const line = JSON.stringify({ message: { content: 'x'.repeat(60_000) }, done: false }) + '\n';
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response(fixtureBody(Array(281).fill(line), { onCancel() { cancelled = true; } })) }));
  let count = 0;
  await assert.rejects(async () => {
    for await (const _event of gateway.stream({ messages })) count += 1;
  }, (error) => error.code === 'response_too_large' && error.retryable === false);
  assert.ok(count > 0 && count < 281);
  assert.equal(cancelled, true);
});

test('Ollama JSON response reading cancels a held-open custom body on timeout', async () => {
  let cancelled = false;
  const body = fixtureBody(['{'], { close: false, onCancel() { cancelled = true; } });
  const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response(body) }), { timeoutMs: 10 });
  await assert.rejects(() => gateway.generate({ messages }), (error) => error.code === 'timeout');
  assert.equal(cancelled, true);
});

test('malformed provider JSON does not retain response excerpts in error causes', async () => {
  for (const mode of ['generate', 'stream']) {
    const gateway = new ModelGateway(new OllamaModelProvider({ model: 'fixture', fetchImpl: async () => new Response('sensitive-invalid-json-fixture\n') }));
    await assert.rejects(async () => {
      if (mode === 'generate') await gateway.generate({ messages });
      else await Array.fromAsync(gateway.stream({ messages }));
    }, (error) => {
      assert.equal(error.code, 'invalid_provider_response');
      assert.equal(error.cause, undefined);
      assert.equal(error.message.includes('sensitive-invalid-json-fixture'), false);
      return true;
    });
  }
});
