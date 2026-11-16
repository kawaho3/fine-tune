const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MAX_ITERATIONS = 200;
const MAX_MESSAGE_CHARS = 100_000;

export class AgentAdapterError extends Error {
  constructor(message, { code = 'agent_error', status = null, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'AgentAdapterError';
    Object.assign(this, { code, status, retryable });
  }
}

function asInt(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new AgentAdapterError(`${name} must be an integer between ${min} and ${max}.`, { code: 'invalid_configuration' });
  }
  return value;
}

function validateObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AgentAdapterError(`${name} must be an object.`, { code: 'invalid_request' });
  }
  return value;
}

function validateId(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 200 || /[/?#]/.test(value)) {
    throw new AgentAdapterError('conversationId is invalid.', { code: 'invalid_request' });
  }
  return value.trim();
}

function validateMessage(value) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AgentAdapterError('message must be a non-empty string.', { code: 'invalid_request' });
  }
  if (value.length > MAX_MESSAGE_CHARS) {
    throw new AgentAdapterError(`message must contain at most ${MAX_MESSAGE_CHARS} characters.`, { code: 'invalid_request' });
  }
  return value;
}

function normalizeBaseUrl(value, allowRemote) {
  let url;
  try { url = new URL(value); }
  catch (cause) { throw new AgentAdapterError('OpenHands baseUrl must be a valid URL.', { code: 'invalid_configuration', cause }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new AgentAdapterError('OpenHands baseUrl must use HTTP(S) and must not contain credentials.', { code: 'invalid_configuration' });
  }
  if (!allowRemote && !LOOPBACK.has(url.hostname)) {
    throw new AgentAdapterError('Remote OpenHands Agent Server endpoints are disabled by default.', { code: 'invalid_configuration' });
  }
  url.search = '';
  url.hash = '';
  url.pathname = url.pathname.replace(/\/$/, '');
  return url;
}

function abortContext(external, timeoutMs) {
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = () => controller.abort(external?.reason);
  if (external?.aborted) onAbort(); else external?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(new DOMException('Timed out', 'TimeoutError')); }, timeoutMs);
  timer.unref?.();
  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    cleanup() { clearTimeout(timer); external?.removeEventListener('abort', onAbort); },
  };
}

function abortError() {
  return new DOMException('Aborted', 'AbortError');
}

async function waitForSignal(operation, signal) {
  if (signal?.aborted) throw signal.reason ?? abortError();
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => signal?.removeEventListener('abort', onAbort);
    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(signal.reason ?? abortError());
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    Promise.resolve().then(operation).then(
      (value) => { if (!settled) { settled = true; cleanup(); resolve(value); } },
      (error) => { if (!settled) { settled = true; cleanup(); reject(error); } },
    );
  });
}

function mapError(error, callerSignal, timedOut = false) {
  if (error instanceof AgentAdapterError) return error;
  if (callerSignal?.aborted) return new AgentAdapterError('Agent request was cancelled.', { code: 'cancelled', cause: error });
  if (timedOut || error?.name === 'TimeoutError') {
    return new AgentAdapterError('Agent request timed out.', { code: 'timeout', retryable: true, cause: error });
  }
  if (error?.name === 'AbortError') {
    return new AgentAdapterError('Agent request was cancelled.', { code: 'cancelled', cause: error });
  }
  return new AgentAdapterError('OpenHands Agent Server is unavailable.', { code: 'transport_error', retryable: true, cause: error });
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try { return JSON.parse(text); }
    catch (cause) { throw new AgentAdapterError('OpenHands returned malformed JSON.', { code: 'invalid_response', status: response.status, cause }); }
  }
  return text;
}

export class OpenHandsAgentServerAdapter {
  constructor({
    baseUrl = 'http://127.0.0.1:8000',
    apiKey = null,
    allowRemote = false,
    timeoutMs = 30_000,
    maxIterations = 25,
    fetchImpl = globalThis.fetch,
  } = {}) {
    if (typeof fetchImpl !== 'function') throw new AgentAdapterError('A fetch implementation is required.', { code: 'invalid_configuration' });
    if (apiKey !== null && (typeof apiKey !== 'string' || !apiKey)) throw new AgentAdapterError('apiKey must be a non-empty string when provided.', { code: 'invalid_configuration' });
    this.baseUrl = normalizeBaseUrl(baseUrl, allowRemote);
    this.apiKey = apiKey;
    this.timeoutMs = asInt(timeoutMs, 'timeoutMs', 1, 300_000);
    this.defaultMaxIterations = asInt(maxIterations, 'maxIterations', 1, MAX_ITERATIONS);
    this.fetchImpl = fetchImpl;
  }

  async request(method, path, { body, signal } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['X-Session-API-Key'] = this.apiKey;
    const abort = abortContext(signal, this.timeoutMs);
    let response;
    let data;
    try {
      response = await waitForSignal(() => this.fetchImpl(new URL(path.replace(/^\//, ''), this.baseUrl.toString().replace(/\/?$/, '/')), {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: abort.signal,
      }), abort.signal);
      data = await waitForSignal(() => parseBody(response), abort.signal);
    } catch (error) {
      throw mapError(error, signal, abort.timedOut());
    } finally {
      abort.cleanup();
    }
    if (!response.ok) {
      const detail = data && typeof data === 'object' && !Array.isArray(data) ? data.detail : null;
      const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
      throw new AgentAdapterError(
        typeof detail === 'string' && detail.trim() ? detail : `OpenHands request failed with HTTP ${response.status}.`,
        { code: response.status === 409 ? 'busy' : 'server_error', status: response.status, retryable },
      );
    }
    return data;
  }

  async createSession({
    agent,
    workspace = { type: 'local', working_dir: '/workspace' },
    initialMessage,
    maxIterations = this.defaultMaxIterations,
    maxBudgetPerRun = null,
    stuckDetection = true,
    hookConfig = null,
    userId = null,
    signal,
  } = {}) {
    validateObject(agent, 'agent');
    validateObject(workspace, 'workspace');
    const boundedIterations = asInt(maxIterations, 'maxIterations', 1, MAX_ITERATIONS);
    if (maxBudgetPerRun !== null && (typeof maxBudgetPerRun !== 'number' || !Number.isFinite(maxBudgetPerRun) || maxBudgetPerRun <= 0)) {
      throw new AgentAdapterError('maxBudgetPerRun must be a positive number or null.', { code: 'invalid_request' });
    }
    if (typeof stuckDetection !== 'boolean') throw new AgentAdapterError('stuckDetection must be a boolean.', { code: 'invalid_request' });
    if (hookConfig !== null) validateObject(hookConfig, 'hookConfig');
    if (userId !== null && (typeof userId !== 'string' || !userId.trim())) throw new AgentAdapterError('userId must be a non-empty string or null.', { code: 'invalid_request' });

    const body = {
      agent,
      ...(initialMessage === undefined ? {} : { initial_message: { role: 'user', content: [{ type: 'text', text: validateMessage(initialMessage) }] } }),
      max_iterations: boundedIterations,
      max_budget_per_run: maxBudgetPerRun,
      stuck_detection: stuckDetection,
      workspace,
      hook_config: hookConfig,
      user_id: userId,
    };
    const data = await this.request('POST', '/api/conversations', { body, signal });
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.id !== 'string' || !data.id) {
      throw new AgentAdapterError('OpenHands create response did not contain a conversation id.', { code: 'invalid_response' });
    }
    return data;
  }

  async getSession(conversationId, { signal } = {}) {
    return this.request('GET', `/api/conversations/${encodeURIComponent(validateId(conversationId))}`, { signal });
  }

  async sendUserMessage(conversationId, message, { run = false, signal } = {}) {
    if (typeof run !== 'boolean') throw new AgentAdapterError('run must be a boolean.', { code: 'invalid_request' });
    return this.request('POST', `/api/conversations/${encodeURIComponent(validateId(conversationId))}/events`, {
      body: { role: 'user', content: [{ type: 'text', text: validateMessage(message) }], run },
      signal,
    });
  }

  async run(conversationId, { signal } = {}) {
    return this.request('POST', `/api/conversations/${encodeURIComponent(validateId(conversationId))}/run`, { signal });
  }

  async pause(conversationId, { signal } = {}) {
    return this.request('POST', `/api/conversations/${encodeURIComponent(validateId(conversationId))}/pause`, { signal });
  }

  async interrupt(conversationId, { signal } = {}) {
    return this.request('POST', `/api/conversations/${encodeURIComponent(validateId(conversationId))}/interrupt`, { signal });
  }

  async listEvents(conversationId, { limit = 100, pageId, kind, source, sortOrder = 'TIMESTAMP' } = {}, { signal } = {}) {
    const id = encodeURIComponent(validateId(conversationId));
    const boundedLimit = asInt(limit, 'limit', 1, 1000);
    const query = new URLSearchParams({ limit: String(boundedLimit), sort_order: sortOrder });
    if (pageId) query.set('page_id', pageId);
    if (kind) query.set('kind', kind);
    if (source) query.set('source', source);
    return this.request('GET', `/api/conversations/${id}/events/search?${query}`, { signal });
  }

  async getFinalResponse(conversationId, { signal } = {}) {
    const data = await this.request('GET', `/api/conversations/${encodeURIComponent(validateId(conversationId))}/agent_final_response`, { signal });
    if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.response !== 'string') {
      throw new AgentAdapterError('OpenHands final-response payload is invalid.', { code: 'invalid_response' });
    }
    return data.response;
  }

  async deleteSession(conversationId, { signal } = {}) {
    return this.request('DELETE', `/api/conversations/${encodeURIComponent(validateId(conversationId))}`, { signal });
  }
}

export function createOpenHandsAgentAdapterFromEnv(env = process.env, overrides = {}) {
  const allowRemote = env.OPENHANDS_ALLOW_REMOTE === 'true';
  const timeoutMs = env.OPENHANDS_TIMEOUT_MS ? Number(env.OPENHANDS_TIMEOUT_MS) : 30_000;
  const maxIterations = env.OPENHANDS_MAX_ITERATIONS ? Number(env.OPENHANDS_MAX_ITERATIONS) : 25;
  return new OpenHandsAgentServerAdapter({
    baseUrl: env.OPENHANDS_BASE_URL || 'http://127.0.0.1:8000',
    apiKey: env.OPENHANDS_SESSION_API_KEY || null,
    allowRemote,
    timeoutMs,
    maxIterations,
    fetchImpl: overrides.fetchImpl ?? globalThis.fetch,
  });
}
