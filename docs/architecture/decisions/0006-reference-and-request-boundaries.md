# ADR 0006 — Reference material and request boundaries

**Status:** Accepted for the repository recovery pass.
**Date:** 2026-11-17.

## Context

Preserved upstream source is useful evidence, but broad Node test discovery could
execute future unpacked reference tests. The existing adapter endpoint checks
also applied only to initial URLs: native fetch followed redirects, and real
two-server fixtures reproduced prompt and dummy session-key forwarding.

## Decision

- Keep upstream projects compressed under `AnalyseFuture/references/upstream/`.
- Store source snapshots with an additional `.txt` suffix and no active imports.
- Explicitly name the four maintained test files in the npm test command.
- Reject HTTP redirects in the common Agent Server request and Ollama call paths.
- Retain one canonical future vision at the requested `AnalyseFuture` path and
  keep the previous docs path as a compatibility pointer.

## Consequences and validation

New test files must be added explicitly. A temporary archive test failed under
bare Node discovery but was excluded by `npm test`. Three redirect regressions
failed before the HTTP fix and passed after it; the complete suite now has 32
passing tests. Operators must configure final endpoint URLs. Public class and
HTTP API contracts remain unchanged; custom fetch implementations must honor
standard redirect options. This does not prove account security, isolate real
agent execution, or authorize executing archived code.

## Location amendment — 17 November 2026

The later whole-repository structure review places the maintained canonical vision
with [product planning](../../product/PROJECT_VISION_AND_FUTURE_ROADMAP.txt).
The obsolete compatibility pointer is retained under
`AnalyseFuture/history/organization/compatibility/`. This supersedes only the
vision-location decision above; upstream quarantine, inert snapshots, explicit
test discovery and redirect rejection are unchanged. This location-only pass runs
no tests; earlier evidence above applies to its original baseline.

## Recovery amendment — 18 November 2026

The latest request authorizes safe testing. Root discovery now scopes globs to
maintained component and runtime-unit test directories, so new files in those
owners are included without searching preserved archives. The corresponding
Python/archive and Playwright suites are explicit separate commands in CI.
[ADR 0007](0007-source-export-and-readiness-gates.md) records current export and
execution-prerequisite boundaries. Earlier date-specific restrictions above are
historical, not current instructions.
