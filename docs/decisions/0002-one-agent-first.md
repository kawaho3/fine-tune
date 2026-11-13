# ADR 0002 — Start With One Agent Engine and One Model Gateway

**Status:** proposed; selection contingent on proof of concept.
**Date:** 2026-11-13.

## Context

Multiple concurrent planning/frontend/backend/test agents are tempting but increase cost, tracing complexity and tool permission risks before a reliable baseline exists.

## Decision

Evaluate OpenHands Software Agent SDK as the **primary** engine; wrap it behind our own task/session interface. Begin with one agent calling typed tools, a bounded repair loop, and a local/mockable model gateway. Separate specialist workflows only when benchmark results justify them.

## Consequences

Lower initial integration cost, simpler evaluation and reproducibility. A narrow interface is necessary to replace the agent SDK or model provider later. Multi-agent execution is a future experiment, not a required MVP dependency.