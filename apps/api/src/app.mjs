import { readFile } from 'node:fs/promises';
import { generateMockProject, InputError } from '@fine-tune/core';

const MAX_BODY_BYTES = 4096;
const ASSETS = new Map([
  ['/', { url: new URL('../../web/public/index.html', import.meta.url), type: 'text/html; charset=utf-8' }],
  ['/app.js', { url: new URL('../../web/public/app.js', import.meta.url), type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { url: new URL('../../web/public/styles.css', import.meta.url), type: 'text/css; charset=utf-8' }],
]);

function applyHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader('Cache-Control', 'no-store');
  // The preview iframe uses sandbox=""; style-src unsafe-inline is needed for its
  // about:srcdoc static CSS, which inherits parent document policies.
  response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-src 'self' about:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
}

function sendJson(response, code, data) {
  response.statusCode = code;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(data));
}

async function readLimitedJson(request) {
  const contentType = request.headers['content-type']?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    const error = new InputError('Content-Type must be application/json.');
    error.status = 415;
    throw error;
  }
  let bytes = 0;
  const chunks = [];
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new InputError('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  let data;
  try {
    data = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new InputError('Malformed JSON.');
    error.status = 400;
    throw error;
  }
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    throw new InputError('A JSON object containing a prompt is required.');
  }
  return data;
}

export function createHandler() {
  return async (request, response) => {
    applyHeaders(response);
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    try {
      if (pathname === '/api/health' && request.method === 'GET') {
        return sendJson(response, 200, { status: 'ok', mode: 'offline_mock', model_connected: false });
      }
      if (pathname === '/api/generate' && request.method === 'POST') {
        const data = await readLimitedJson(request);
        const result = generateMockProject(data.prompt);
        return sendJson(response, 200, result);
      }
      const asset = ASSETS.get(pathname);
      if (asset && request.method === 'GET') {
        const body = await readFile(asset.url);
        response.statusCode = 200;
        response.setHeader('Content-Type', asset.type);
        return response.end(body);
      }
      if (pathname === '/api/generate' || pathname === '/api/health' || asset) {
        response.setHeader('Allow', pathname === '/api/generate' ? 'POST' : 'GET');
        return sendJson(response, 405, { error: 'Method not allowed.' });
      }
      return sendJson(response, 404, { error: 'Not found.' });
    } catch (error) {
      if (error instanceof InputError) {
        return sendJson(response, error.status ?? 400, { error: error.message });
      }
      // Do not leak server paths, stack traces or raw exception text to clients.
      console.error('Request failed:', error);
      return sendJson(response, 500, { error: 'Internal server error.' });
    }
  };
}
