# Offline Mock Prototype — Phase 0

This PR introduces **working project scaffolding** (not a full-stack AI builder). It deliberately avoids external dependencies so the team can verify the browser → API → deterministic provider seam without paid AI API calls.

## Run locally

Requirements: Node.js 22+ and npm 10+. The project has **no external npm dependencies** at this stage.

```bash
npm ci --ignore-scripts
npm test
npm run dev
```

Open <http://127.0.0.1:3000>. `HOST` and `PORT` can be set as environment variables (see `.env.example`); the application does not automatically load a `.env` file. `npm test` uses Node's built-in test runner and makes no external calls.

## What works

- Real, working UI with request form, predefined examples, status messages, plan list, downloadable HTML file, and an embedded sandboxed **static** preview.
- `POST /api/generate` validates an incoming prompt, chooses a deterministic template and returns `index.html` and a short README. No model inference occurs.
- `GET /api/health` exposes `model_connected: false` and `mode: offline_mock`.
- Static files are served from an explicit allowlist. HTTP method limits, request body size cap, validation errors, CSP and security headers are included.
- Node unit/API tests cover template choice, determinism, HTML escaping, basic API errors, status honesty, asset allowlisting and sandboxed iframe markup.

## Explicit non-capabilities

- Not a trained model or AI agent; no OpenHands integration, backend/application database generation, arbitrary-code execution, Playwright run, secure production workspace, login, persistence, ZIP project export, or deployment.
- Generated files are returned in an API response; the UI currently downloads the HTML file only. Build and browser tests are **not run** on generated content. Nothing is saved on the server.
- The iframe has an empty `sandbox` attribute to disable scripts, top-level navigation and same-origin privilege. This is a safe preview of **static** mock HTML, not a replacement for isolated production app execution.
- The interface should not be exposed publicly without authentication, rate limits and deployment review. It binds to localhost by default.

## Design intent

The shared `@fine-tune/core` package exposes a deterministic function `generateMockProject(prompt)` that can be replaced by a proper, tested model/agent adapter in a later milestone. The Node HTTP shell is purposefully minimal; it should be replaced or wrapped when the team adopts Next.js and a final backend framework. This prototype is a **disposable integration seam**, not the final commercial production stack.

## Next engineering step

Finish the dependency/license/security audit, then integrate one reviewed agent SDK and one vetted sandbox strategy. Use generated projects with actual build and browser checks before claiming full-stack functionality. See issues #1, #3–#7.
