# @fine-tune/agent

Thin, replaceable agent-session boundary for the fine-tune platform.

## Current adapter

The first compatibility spike targets **OpenHands Software Agent SDK / Agent Server v1.62.0** through its documented REST contract. The product does not import or copy OpenHands internals.

Supported surface:

- create a bounded conversation
- append a user message
- run / pause / interrupt
- read conversation state
- search events
- read the final agent response
- delete a conversation
- caller cancellation and gateway-enforced request timeouts

The adapter intentionally does **not** add WebSocket streaming, real LLM credentials, generated-code execution, Docker, or a production sandbox in this milestone.

## Why REST first?

OpenHands v1.62.0 publishes an official TypeScript client and an Agent Server REST/WebSocket API. The TypeScript client is distributed through GitHub Packages and controls a remote Agent Server; the canonical agent implementation remains in the Python SDK/server.

This spike proves our own stable product boundary first. It avoids coupling product code to OpenHands-specific objects and avoids adding an authenticated package-registry dependency to ordinary CI before we need it. We can replace the transport with the official TypeScript client later without changing callers.

## Configuration

```
OPENHANDS_BASE_URL=http://127.0.0.1:8000
OPENHANDS_TIMEOUT_MS=30000
OPENHANDS_MAX_ITERATIONS=25
OPENHANDS_ALLOW_REMOTE=false
# OPENHANDS_SESSION_API_KEY=local-session-key
```

Remote Agent Server URLs are disabled by default. Secrets belong in the runtime secret store, never in committed environment files.

## Verification

The contract tests use a local fake HTTP server and make no paid model calls. A real OpenHands Agent Server integration test is a separate milestone and must not be reported as complete until it actually runs.
