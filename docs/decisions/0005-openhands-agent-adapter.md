# ADR 0005 — OpenHands Agent Server adapter boundary

**Status:** Accepted for compatibility spike
**Date:** 2026-11-16

## Context

The product needs a coding-agent engine, but the core product must not become coupled to OpenHands-specific SDK objects or require wholesale copying of OpenHands. OpenHands Software Agent SDK v1.62.0 provides a Python SDK/Agent Server plus an official TypeScript client that controls the remote Agent Server.

## Decision

Use our own `services/agent` session interface and make the first OpenHands integration a thin adapter over the v1.62.0 Agent Server REST contract.

The initial surface is intentionally small:

- create conversation
- send user event
- run / pause / interrupt
- read conversation status
- search events
- read final response
- delete conversation

Conversation iterations are bounded by our adapter. Calls have caller cancellation and adapter-enforced timeouts. Lifecycle side-effect requests are not automatically retried.

The adapter defaults to loopback-only Agent Server URLs. Remote endpoints require an explicit operator setting.

## Why not import the TypeScript client yet?

The official client is a valid future transport replacement, but its documented distribution path uses GitHub Packages. The compatibility spike should remain deterministic and zero-cost in ordinary CI while proving the product boundary first. Once a real Agent Server fixture is running, we can compare direct REST vs. the official client without changing product callers.

## Consequences

- OpenHands remains replaceable behind our interface.
- CI needs no live LLM, Docker runtime, Python service, or paid API.
- This is **not** proof that a real OpenHands Agent Server works with our selected model/workspace configuration.
- WebSocket streaming and real workspace execution are deferred to later verified milestones.
- The sandbox decision remains separate: FT-004 must compare OpenHands workspace behavior with OpenSandbox before one execution owner is selected.
