# ADR 0001 — One Original Monorepo, Reuse-First Components

**Status:** proposed architectural direction, pending implementation validation.
**Date:** 2026-11-13.

## Context

The desired product competes with leading AI full-stack builders while minimizing Codex development credits and remaining independently operable. Forking an entire competitor-like project or merging multiple whole apps creates heavy coupled dependencies, maintenance overhead and licensing risk.

## Decision

Create **one master product monorepo** containing the original UI, business logic, orchestration interfaces, data contracts, tests and infrastructure code. Reference third-party libraries and independent services through pinned dependencies and adapters. Study bolt.diy and Dyad for workflows; do not copy proprietary design/code.

## Consequences

Benefits: control, composability, clear licenses, independent upgrades, easier onboarding. Costs: initial adapter design and integration testing. Re-evaluate only with evidence showing a single upstream product fork saves more work without compromising ownership/control.

## Review triggers

Major changes in licensing, runtime restrictions, SDK APIs or measured build/maintenance cost.