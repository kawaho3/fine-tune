# ADR 0007 — Complete static source export and measured runtime prerequisites

Date: 18 November 2026. Status: accepted for the recovery checkpoint.

## Context

The current generator returns a complete static file list, but the browser only
downloads HTML. The available Docker daemon accepts resource flags without
enforcing their per-container cgroups. Neither fact justifies executing agent
output or claiming a working full-stack builder.

## Decision

Use exact, locked MIT `fflate` 0.8.3 inside the existing API to serialize the
generator's in-memory files. Accept a prompt, never uploaded file paths. Apply
portable path, duplicate/overlap, count and UTF-8 byte bounds. Export the successful
preview's prompt, not later input edits. Keep the HTML contract and inert preview.
Use pinned Apache-2.0 Playwright 1.65.1 for actual browser journeys.

Keep one fixed, digest-pinned trusted Docker prerequisite probe under tools/.
Measure non-root execution, filesystem/network restrictions and actual cgroup
limits. Fail closed and clean up on failure, timeout or cancellation. Do not add a
generic process executor or expose Docker through the API. The probe is not a
production sandbox certification, even if it passes on another environment.

Retain all historical/archive source after content/hash inspection. Existing
maintained components already have appropriate homes; speculative restoration of
older source would discard fixes. No blanket upstream integration or licensing
change follows from archive placement or claimed authorship.

## Consequences and acceptance

Complete static source export is usable and tested without live models or runtime
privileges. ZIP compression is bounded but remains synchronous in the local mock
API. Production request concurrency/rate limits remain future work. Cross-tenant
previews and arbitrary code execution remain unavailable. A resource-enforcing
runtime and real agent/workspace compatibility fixture are the next dependency
gates. See the [recovery checkpoint](../../recovery/REPORT.md) and
[reuse review](../../research/REUSE_AUDIT.md) for exact evidence and limitations.
