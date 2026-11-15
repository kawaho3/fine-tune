# @fine-tune/model-gateway

Provider-independent model inference boundary for the fine-tune platform.

This service package has zero third-party npm dependencies. It establishes the contract needed by future agent orchestration without coupling the product to one model vendor.

## Providers

- mock — deterministic offline default for tests and CI.
- ollama — local/self-hosted Ollama /api/chat adapter using Node.js fetch.

Ollama endpoints are restricted to loopback hosts by default. A remote endpoint requires the explicit OLLAMA_ALLOW_REMOTE=true operator setting. User prompts cannot choose or override the provider URL.

## Configuration

MODEL_PROVIDER=mock|ollama
MODEL_TIMEOUT_MS=30000
MODEL_MAX_RETRIES=1
MODEL_RETRY_DELAY_MS=100
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=<installed model name>
OLLAMA_ALLOW_REMOTE=false

No model is downloaded automatically and no paid API is required.

## Contract

ModelGateway.generate returns text plus provider/model identity, provider-reported usage, latency and attempt count. ModelGateway.stream returns text-delta events and a final completion event. Requests may set budget.maxOutputTokens; the Ollama adapter maps it to num_predict.

The gateway validates messages, propagates caller cancellation, applies a bounded timeout, retries only retryable non-streaming provider failures, and normalizes failures into ModelGatewayError. Streaming is not replayed automatically after partial output.

## Verification

Run npm ci --ignore-scripts and npm test from the repository root. The suite uses deterministic fixtures and mocked fetch responses. A real Ollama smoke test is intentionally outside CI and must be reported separately.
