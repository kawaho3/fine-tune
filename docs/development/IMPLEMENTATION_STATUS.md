# Implementation status

Updated: **18 November 2026**. Repository: `kawaho3/fine-tune`.
Recovery branch: `recovery/verified-builder-2026-11-18`; starting/default SHA
`4c38f0c950fb43e189e87b0b80052f6b1e14c034`.

| Component | Verified behavior | Source and checks |
| --- | --- | --- |
| Builder API | Bounded generation, complete static-project ZIP export, allowlisted UI, security headers | `apps/builder-api/src/`; API/export tests |
| Builder UI | Prompt/examples, plan, opaque sandboxed static preview, HTML and complete ZIP downloads, error recovery | `apps/builder-web/public/`; six Playwright journeys |
| Generator | Validated prompts, five deterministic templates, output encoding | `packages/project-generator/`; generator tests |
| Model gateway | Mock/Ollama boundary, streaming, bounded response bytes, early completion/cancellation, timeout/retry contracts | `services/model-gateway/`; mock/transport tests |
| Agent adapter | OpenHands REST lifecycle, bounded responses, redirect restrictions, cancellation/timeouts, generic remote errors | `services/agent-adapter/`; fake-server tests |
| Recovery tooling | Data-only bounded recursive Git/ZIP inventory, SHA-256 duplicates, historical rename mapping | `tools/recovery/`; nine Python security tests |
| Runtime prerequisite probe | Fixed, pinned Docker probe checks measured controls and cleans up | `tools/runtime/`; six unit tests; actual probe fails on CPU/memory/PID enforcement |

## Current validation

- Original baseline: **41/41 tests passed** before code changes.
- Current maintained Node tests: **68 passed, 0 failed/skipped**, on Node 24.22.1
  and pinned official Node 22.23.5.
- Recovery reader: **9 passed** on Python 3.12.14.
- Chromium/Playwright: **6 passed**, including preview/download equality, complete
  ZIP contents, error recovery, hostile prompt isolation, and mobile controls.
- Frozen installation and `npm audit`: pass; zero reported npm advisories.
- Local rootless Docker ignores requested per-container cgroup limits. The actual
  readiness probe exits 1: memory/CPU/PID gates fail. This is an unresolved
  environment prerequisite, not a passing sandbox test.
- GitHub API access is blocked at the proxy. Current remote CI and owner-only
  account/security settings are unverified.

## Recovery disposition

The [checkpoint](../recovery/REPORT.md), [baseline inventory](../recovery/inventory.json)
and [path map](../recovery/path-map.json) distinguish inspected bytes from verified
behavior. All original material is retained. Four disguised source snapshots are
older versions of maintained code, not missing implementations to restore.
No speculative source moves or bulk deletion were necessary: the maintained
components already occupy appropriate functional homes.

The old no-tests/direct-to-main instructions belonged to earlier tasks. This
request authorizes testing and requires a recovery branch with reviewable commits;
no automatic merge, force push, or published-history rewrite.

## Remaining product gate

The browser still calls the deterministic generator, not a coding agent. Secure
untrusted-code execution, generated full-stack builds/tests, isolated live app
previews, live Ollama/OpenHands compatibility, persistence, tenant auth,
deployment, and training remain unimplemented or unverified. The next task must
supply an execution environment that actually enforces resource limits before
running any generated programs. Do not treat mock/fake-server tests as live proof.
