const ROLES = new Set(['system', 'user', 'assistant', 'tool']);
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export class ModelGatewayError extends Error {
  constructor(message, { code = 'model_error', provider = 'unknown', retryable = false, status = null, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ModelGatewayError';
    Object.assign(this, { code, provider, retryable, status });
  }
}

function int(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ModelGatewayError(name + ' must be an integer between ' + min + ' and ' + max + '.', { code: 'invalid_configuration', provider: 'gateway' });
  }
  return value;
}

function requestShape(request) {
  const messages = request?.messages;
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 100) {
    throw new ModelGatewayError('messages must contain between 1 and 100 entries.', { code: 'invalid_request', provider: 'gateway' });
  }
  let chars = 0;
  const clean = messages.map((message, i) => {
    if (!message || typeof message !== 'object' || Array.isArray(message) || !ROLES.has(message.role) || typeof message.content !== 'string' || !message.content) {
      throw new ModelGatewayError('messages[' + i + '] is invalid.', { code: 'invalid_request', provider: 'gateway' });
    }
    chars += message.content.length;
    if (chars > 100_000) throw new ModelGatewayError('message content exceeds 100000 characters.', { code: 'invalid_request', provider: 'gateway' });
    return { role: message.role, content: message.content };
  });
  let budget;
  if (request?.budget !== undefined) {
    if (!request.budget || typeof request.budget !== 'object' || Array.isArray(request.budget)) {
      throw new ModelGatewayError('budget must be an object.', { code: 'invalid_request', provider: 'gateway' });
    }
    budget = { maxOutputTokens: int(request.budget.maxOutputTokens, 'budget.maxOutputTokens', 1, 65_536) };
  }
  if (request?.model !== undefined && (typeof request.model !== 'string' || !request.model.trim())) {
    throw new ModelGatewayError('model must be a non-empty string when provided.', { code: 'invalid_request', provider: 'gateway' });
  }
  if (request?.options !== undefined && (!request.options || typeof request.options !== 'object' || Array.isArray(request.options))) {
    throw new ModelGatewayError('options must be an object when provided.', { code: 'invalid_request', provider: 'gateway' });
  }
  return { messages: clean, model: request?.model?.trim(), options: request?.options, budget };
}

function abortContext(external, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(external?.reason);
  if (external?.aborted) onAbort(); else external?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  timer.unref?.();
  return { signal: controller.signal, timedOut: () => timedOut, cleanup() { clearTimeout(timer); external?.removeEventListener('abort', onAbort); } };
}

function abortError() {
  return new DOMException('Aborted', 'AbortError');
}

async function waitForSignal(operation, signal) {
  if (signal?.aborted) throw abortError();
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    Promise.resolve()
      .then(() => {
        if (signal?.aborted) throw abortError();
        return operation();
      })
      .then(
        (value) => {
          if (settled) return;
          settled = true;
          cleanup();
          resolve(value);
        },
        (error) => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(error);
        },
      );
  });
}

function normalized(error, provider, external, timedOut) {
  if (error instanceof ModelGatewayError) return error;
  if (external?.aborted) return new ModelGatewayError('Model request was cancelled.', { code: 'cancelled', provider, cause: error });
  if (timedOut) return new ModelGatewayError('Model request timed out.', { code: 'timeout', provider, cause: error });
  if (error?.name === 'AbortError') return new ModelGatewayError('Model request was cancelled.', { code: 'cancelled', provider, cause: error });
  return new ModelGatewayError('Model provider is unavailable.', { code: 'provider_unavailable', provider, retryable: true, cause: error });
}

async function delay(ms, signal) {
  if (!ms) return;
  await new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new ModelGatewayError('Model request was cancelled.', { code: 'cancelled', provider: 'gateway' }));
    let settled = false;
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const finish = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onAbort = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      reject(new ModelGatewayError('Model request was cancelled.', { code: 'cancelled', provider: 'gateway' }));
    };
    const timer = setTimeout(finish, ms);
    timer.unref?.();
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function usage(data) {
  const inputTokens = Number.isInteger(data?.prompt_eval_count) ? data.prompt_eval_count : null;
  const outputTokens = Number.isInteger(data?.eval_count) ? data.eval_count : null;
  if (inputTokens === null && outputTokens === null) return null;
  return { inputTokens, outputTokens, totalTokens: inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null };
}

function baseUrl(value, allowRemote) {
  let url;
  try { url = new URL(value); } catch (cause) { throw new ModelGatewayError('Ollama baseUrl must be a valid URL.', { code: 'invalid_configuration', provider: 'ollama', cause }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ModelGatewayError('Ollama baseUrl must use HTTP(S) and must not contain credentials.', { code: 'invalid_configuration', provider: 'ollama' });
  }
  if (!allowRemote && !LOOPBACK.has(url.hostname)) {
    throw new ModelGatewayError('Remote Ollama endpoints are disabled by default.', { code: 'invalid_configuration', provider: 'ollama' });
  }
  url.search = ''; url.hash = ''; url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

async function jsonResponse(response, provider) {
  let data;
  try { data = JSON.parse((await response.text()) || '{}'); }
  catch (cause) { throw new ModelGatewayError('Model provider returned invalid JSON.', { code: 'invalid_provider_response', provider, status: response.status, cause }); }
  if (!response.ok) {
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    throw new ModelGatewayError('Model provider rejected the request.', { code: 'provider_response_error', provider, retryable, status: response.status });
  }
  if (data?.error) throw new ModelGatewayError('Model provider returned an error response.', { code: 'provider_response_error', provider, status: response.status });
  return data;
}

function streamLine(line, provider) {
  let data;
  try { data = JSON.parse(line); }
  catch (cause) { throw new ModelGatewayError('Model provider returned malformed streaming JSON.', { code: 'invalid_provider_response', provider, cause }); }
  if (data?.error) throw new ModelGatewayError('Model provider returned a streaming error.', { code: 'provider_response_error', provider });
  if (data?.done === true) return { type: 'done', usage: usage(data) };
  if (typeof data?.message?.content !== 'string') throw new ModelGatewayError('Model provider returned an invalid streaming event.', { code: 'invalid_provider_response', provider });
  return { type: 'text-delta', delta: data.message.content };
}

export class MockModelProvider {
  constructor({ responseText = 'Deterministic mock model response.' } = {}) { this.name = 'mock'; this.defaultModel = 'deterministic-mock-v1'; this.responseText = responseText; }
  async generate({ signal }) { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); return { text: this.responseText, model: this.defaultModel, usage: null }; }
  async *stream({ signal }) { if (signal?.aborted) throw new DOMException('Aborted', 'AbortError'); yield { type: 'text-delta', delta: this.responseText }; yield { type: 'done', model: this.defaultModel, usage: null }; }
}

export class OllamaModelProvider {
  constructor({ baseUrl: endpoint = 'http://127.0.0.1:11434', model = null, allowRemote = false, fetchImpl = globalThis.fetch } = {}) {
    if (typeof fetchImpl !== 'function') throw new ModelGatewayError('A fetch implementation is required for Ollama.', { code: 'invalid_configuration', provider: 'ollama' });
    if (model !== null && (typeof model !== 'string' || !model.trim())) throw new ModelGatewayError('Ollama model must be a non-empty string.', { code: 'invalid_configuration', provider: 'ollama' });
    this.name = 'ollama'; this.endpoint = baseUrl(endpoint, allowRemote); this.defaultModel = model?.trim() || null; this.fetchImpl = fetchImpl;
  }
  model(requested) {
    const model = requested ?? this.defaultModel;
    if (typeof model !== 'string' || !model.trim()) throw new ModelGatewayError('An Ollama model must be configured.', { code: 'invalid_configuration', provider: 'ollama' });
    return model.trim();
  }
  async call(messages, model, stream, options, budget, signal) {
    const providerOptions = budget ? { ...options, num_predict: budget.maxOutputTokens } : options;
    return this.fetchImpl(new URL('/api/chat', this.endpoint), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, stream, ...(providerOptions ? { options: providerOptions } : {}) }), signal });
  }
  async generate({ messages, model: requested, options, budget, signal }) {
    const model = this.model(requested);
    const response = await this.call(messages, model, false, options, budget, signal);
    const data = await jsonResponse(response, this.name);
    if (typeof data?.message?.content !== 'string') throw new ModelGatewayError('Ollama response did not contain message content.', { code: 'invalid_provider_response', provider: this.name, status: response.status });
    return { text: data.message.content, model, usage: usage(data) };
  }
  async *stream({ messages, model: requested, options, budget, signal }) {
    const model = this.model(requested);
    const response = await this.call(messages, model, true, options, budget, signal);
    if (!response.ok) { await jsonResponse(response, this.name); return; }
    if (!response.body) throw new ModelGatewayError('Ollama streaming response had no body.', { code: 'invalid_provider_response', provider: this.name });
    const decoder = new TextDecoder();
    let buffer = '', finalUsage = null;
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk, { stream: true });
      let at;
      while ((at = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, at).trim(); buffer = buffer.slice(at + 1);
        if (!line) continue;
        const event = streamLine(line, this.name);
        if (event.type === 'done') finalUsage = event.usage; else yield event;
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) { const event = streamLine(buffer.trim(), this.name); if (event.type === 'done') finalUsage = event.usage; else yield event; }
    yield { type: 'done', model, usage: finalUsage };
  }
}

export class ModelGateway {
  constructor(provider, { timeoutMs = 30_000, maxRetries = 1, retryDelayMs = 100 } = {}) {
    if (!provider || typeof provider.name !== 'string' || typeof provider.generate !== 'function' || typeof provider.stream !== 'function') throw new ModelGatewayError('Provider must implement name, generate(), and stream().', { code: 'invalid_configuration', provider: 'gateway' });
    this.provider = provider;
    this.timeoutMs = int(timeoutMs, 'timeoutMs', 1, 300_000);
    this.maxRetries = int(maxRetries, 'maxRetries', 0, 5);
    this.retryDelayMs = int(retryDelayMs, 'retryDelayMs', 0, 30_000);
  }
  async generate(request) {
    const payload = requestShape(request);
    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt += 1) {
      const abort = abortContext(request?.signal, this.timeoutMs); const start = performance.now();
      try {
        const result = await waitForSignal(() => this.provider.generate({ ...payload, signal: abort.signal }), abort.signal);
        return { text: result.text, provider: this.provider.name, model: result.model ?? payload.model ?? null, usage: result.usage ?? null, latencyMs: Math.max(0, Math.round((performance.now() - start) * 100) / 100), attempts: attempt };
      } catch (error) {
        const out = normalized(error, this.provider.name, request?.signal, abort.timedOut());
        if (!out.retryable || attempt > this.maxRetries) throw out;
      } finally { abort.cleanup(); }
      await delay(this.retryDelayMs, request?.signal);
    }
  }
  async *stream(request) {
    const payload = requestShape(request);
    const abort = abortContext(request?.signal, this.timeoutMs);
    const start = performance.now();
    let iterator;
    let completed = false;
    try {
      const iterable = this.provider.stream({ ...payload, signal: abort.signal });
      if (!iterable || typeof iterable[Symbol.asyncIterator] !== 'function') {
        throw new ModelGatewayError('Provider stream() must return an async iterable.', { code: 'invalid_provider_response', provider: this.provider.name });
      }
      iterator = iterable[Symbol.asyncIterator]();
      while (true) {
        const next = await waitForSignal(() => iterator.next(), abort.signal);
        if (next.done) break;
        const event = next.value;
        if (!event || (event.type !== 'text-delta' && event.type !== 'done')) {
          throw new ModelGatewayError('Model provider returned an invalid stream event.', { code: 'invalid_provider_response', provider: this.provider.name });
        }
        if (event.type === 'text-delta') {
          if (typeof event.delta !== 'string') {
            throw new ModelGatewayError('Model provider returned a non-text stream delta.', { code: 'invalid_provider_response', provider: this.provider.name });
          }
          yield { ...event, provider: this.provider.name };
          continue;
        }
        completed = true;
        yield { ...event, provider: this.provider.name, latencyMs: Math.max(0, Math.round((performance.now() - start) * 100) / 100), attempts: 1 };
        break;
      }
      if (!completed) throw new ModelGatewayError('Model stream ended without a completion event.', { code: 'invalid_provider_response', provider: this.provider.name });
    } catch (error) {
      throw normalized(error, this.provider.name, request?.signal, abort.timedOut());
    } finally {
      abort.cleanup();
      if (iterator && typeof iterator.return === 'function') {
        Promise.resolve().then(() => iterator.return()).catch(() => {});
      }
    }
  }
}

export function createModelGateway(config = {}) {
  const name = config.provider ?? 'mock';
  if (name === 'mock') return new ModelGateway(new MockModelProvider(config.mock), config);
  if (name === 'ollama') return new ModelGateway(new OllamaModelProvider(config.ollama), config);
  throw new ModelGatewayError('Unsupported model provider: ' + String(name) + '.', { code: 'invalid_configuration', provider: 'gateway' });
}

function envInt(value, fallback, name) {
  if (value === undefined || value === '') return fallback;
  if (!/^\d+$/.test(value)) throw new ModelGatewayError(name + ' must be an integer.', { code: 'invalid_configuration', provider: 'gateway' });
  return Number(value);
}

export function createModelGatewayFromEnv(env = process.env, overrides = {}) {
  const provider = env.MODEL_PROVIDER || 'mock';
  return createModelGateway({ provider, timeoutMs: envInt(env.MODEL_TIMEOUT_MS, 30_000, 'MODEL_TIMEOUT_MS'), maxRetries: envInt(env.MODEL_MAX_RETRIES, 1, 'MODEL_MAX_RETRIES'), retryDelayMs: envInt(env.MODEL_RETRY_DELAY_MS, 100, 'MODEL_RETRY_DELAY_MS'), mock: overrides.mock, ollama: provider === 'ollama' ? { baseUrl: env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434', model: env.OLLAMA_MODEL || null, allowRemote: env.OLLAMA_ALLOW_REMOTE === 'true', fetchImpl: overrides.fetchImpl ?? globalThis.fetch } : undefined });
}
