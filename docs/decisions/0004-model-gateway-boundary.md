# ADR 0004 — Model gateway boundary

**Status:** Accepted for Phase 1 foundation
**Date:** 2026-11-16

## Context

The product must support deterministic CI and local/self-hosted inference without coupling application or agent code directly to one model vendor. The current Node.js scaffold has no external npm runtime dependencies.

## Decision

Create a provider-independent model gateway as services/model-gateway. Keep the mock provider as the default for CI and add an Ollama adapter using the Node 22 fetch implementation. The gateway owns validation, timeout/cancellation behavior, bounded non-streaming retries, output-token budgets, provider error normalization, streaming events, and basic usage/latency measurements.

Remote Ollama endpoints are disabled by default. No model is automatically downloaded. The existing mock website generator remains separate until a later agent integration needs model inference.

## Consequences

- Agent code can depend on one stable boundary instead of Ollama or another provider directly.
- CI remains deterministic and requires no paid API or local model.
- Live Ollama behavior is not considered verified until a developer smoke test is run against an installed model.
- Future providers must implement the same provider contract and receive separate security/license review.
- This decision does not select the coding-agent or sandbox runtime; those remain separate architecture decisions.
