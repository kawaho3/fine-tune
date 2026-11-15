import test from 'node:test';
import assert from 'node:assert/strict';
import { ModelGatewayError, OllamaModelProvider, ModelGateway, createModelGateway, createModelGatewayFromEnv } from '../src/index.mjs';

const messages = [{ role: 'user', content: 'Build a small task app.' }];

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
