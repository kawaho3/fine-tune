# Implementation Status

**As of: 16 November 2026**

## Verified repository state

- The GitHub repository **kawaho3/fine-tune** is public and its default branch is `main`.
- Current `main` commit before this feature branch: `7797090aaed4d0e1aee15671da416f5c057371da`.
- Phase-0 deterministic mock scaffold was merged in PR #8.
- The provider-independent model gateway was merged in PR #9 at `7797090aaed4d0e1aee15671da416f5c057371da`.
- PR #9 final CI run #7 passed `npm ci --ignore-scripts` and the complete repository test suite: **22 passed, 0 failed** on Node v22.23.4.

## Working Phase-0 scaffold

- Original npm workspace with `apps/api`, `apps/web`, and `packages/core` (Node.js 22+).
- Local HTTP server serves a static builder interface; `POST /api/generate` returns an explicitly labeled deterministic HTML template, plan, and README without an LLM or shell commands.
- Sandboxed `iframe srcdoc` static preview, single HTML-file download, validation and HTTP security headers.
- The scaffold PR recorded **12 tests passed, 0 failed** on Node v22.16.0. That evidence predates this branch and should not be confused with a new full-suite run.

## Merged Phase-1 model foundation

`services/model-gateway` is merged as a replaceable inference boundary:

- Deterministic mock provider remains the default for offline tests and CI.
- Opt-in Ollama `/api/chat` provider using the Node.js 22 native `fetch` API; no extra npm runtime dependency.
- Request/message validation and bounded output-token budgets.
- Structured provider errors with cancellation and timeout handling.
- Bounded retries for retryable **non-streaming** provider failures.
- NDJSON streaming support without replaying a partially emitted stream.
- Provider-reported token usage mapping, latency, and attempt counts.
- Ollama endpoints are restricted to loopback hosts by default; remote endpoints require explicit operator configuration and credentials in endpoint URLs are rejected.
- Safe example environment settings and ADR 0004 document the boundary.

### Local verification for the new model gateway

Environment: Node.js v22.16.0, npm 10.9.2.

- Focused model-gateway suite: **10 passed, 0 failed**.
- Offline workspace install check: `npm ci --ignore-scripts --offline` succeeded in the reconstructed workspace with zero new third-party npm packages.
- A live Ollama server/model was **not available and was not downloaded**, so live inference is not claimed as validated. The tenth regression test verifies that the gateway timeout still fires when a custom provider ignores the abort signal.
- GitHub Actions final PR #9 run #7 completed successfully on Node v22.23.4: `npm ci --ignore-scripts` passed and the complete `npm test` run reported **22 passed, 0 failed**.

## OpenHands adapter compatibility spike

Branch: `feat/openhands-agent-adapter`.

Implemented `services/agent` as a thin, replaceable adapter over the verified OpenHands Agent Server v1.62.0 REST contract:

- bounded conversation creation with a product-side iteration cap
- user-message events
- run / pause / interrupt lifecycle controls
- conversation status, event search, final response and deletion
- `X-Session-API-Key` support without embedding credentials in URLs
- loopback-only Agent Server URLs by default; remote endpoints require explicit operator opt-in
- caller cancellation plus adapter-enforced timeouts
- no automatic retry of lifecycle side-effect calls

Local deterministic fake-server verification on Node v22.16.0: **7 passed, 0 failed**.

This is a contract/transport spike only. A real OpenHands Agent Server, real coding model, WebSocket event stream, and real workspace execution have **not** been validated by this branch.

## Upstream research recorded for the next boundaries

- OpenHands Software Agent SDK `v1.62.0`: MIT-licensed primary coding-agent candidate. The SDK is Python 3.12+; its agent server exposes a REST/WebSocket boundary. We will integrate it only behind our own replaceable agent adapter after an executable compatibility spike.
- OpenSandbox `release-1.2.0`: Apache-2.0 primary isolated-workspace candidate. It exposes TypeScript/JavaScript and Python SDKs plus lifecycle, file, command, resource and network controls.
- Direct OpenHands ↔ OpenSandbox compatibility has **not** been proven. We will not stack two overlapping workspace runtimes until a small integration/security test justifies it.

See [REUSE_AUDIT.md](REUSE_AUDIT.md).

## NOT implemented or validated

- No validated live OpenHands coding-agent run, secure application sandbox, PostgreSQL persistence, authenticated preview proxy, or deployment pipeline.
- The existing `/api/generate` mock builder is not yet wired to the model gateway.
- No real full-stack generated application has been built, run, browser-tested, repaired, previewed, and exported through the target pipeline.
- No trained model, fine-tuning dataset, public SaaS, user auth, billing, completed legal review, security audit, or project-wide distribution license.

## Next verifiable milestone

1. Keep the OpenHands adapter PR green in full repository CI.
2. Run one pinned OpenHands Agent Server compatibility fixture and verify the adapter against the real server without requiring a paid production model.
3. Compare the OpenHands workspace path against OpenSandbox with an executable restricted-workspace fixture before choosing one production execution layer.
4. Continue toward prompt → plan → generated files → isolated build/test → preview → source export.

## Rules for keeping this document accurate

- A feature becomes “implemented” only with links to code, executable verification steps, and test results.
- Record branch/commit, tool versions, skipped checks, and limitations.
- Do not inflate progress using UI mockups, unexecuted generated code, or assumed model capabilities.
- Update this document after every material milestone.
