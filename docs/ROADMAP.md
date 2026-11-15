# Engineering Roadmap — Gates, Not Promises

**No launch dates or completion percentages are claimed.** Progress is determined by acceptance evidence in [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

## Current execution state — 16 November 2026

- Phase-0 deterministic Node monorepo/mock scaffold: **merged** in PR #8.
- Provider-independent model gateway: **implemented on `feat/model-gateway-foundation` and awaiting repository CI/review**.
- OpenHands agent adapter: not implemented; compatibility spike is next.
- Restricted workspace/sandbox: not implemented; OpenHands workspace vs OpenSandbox remains to be proven.
- Real prompt → build → browser tests → preview → export vertical slice: not implemented.

## Phase 0 — Decisions and reproducible baseline

- Verify external repositories, exact licenses, transitive obligations and costs.
- Choose one agent engine, model adapter, sandbox strategy and initial app template.
- Define product architecture, API contracts, threat model and end-to-end benchmark tasks.
- Set up deterministic local development, formatting, CI and test framework.
- **Exit:** approved ADRs, minimal repo scaffold, checks passing in CI.

Phase-0 is partly complete; the broad dependency/license audit and final workspace choice remain open.

## Phase 1 — First real vertical slice (P0)

- Provider-independent model gateway with deterministic mock and local-provider adapter.
- Prompt/project UI; project persistence; agent plan and file operations.
- Minimal working app template; sandbox build/run; preview proxy; logs.
- Browser smoke test; bounded repair; export entire generated source.
- Start with deterministic fixtures, then add a separately verified local-model smoke test.
- **Exit:** end-to-end demo repeatable from a clean checkout, including failure handling.

## Phase 2 — Useful full-stack builder (P1)

- APIs, PostgreSQL schema/migrations, authentication patterns and CRUD scenarios.
- Monaco editor, diffs, snapshots, test repair loop, stable project sessions.
- Expanded provider support and usage accounting based on measured needs.
- **Exit:** held-out CRUD benchmark builds and passes behavioral tests.

## Phase 3 — Editing and developer workflow (P1)

- Evaluate screenshot-to-code, Puck vs Onlook visual editing.
- GitHub import/export, incremental changes, regression checks and rollback.
- **Exit:** users can edit existing projects without losing source changes; recovery tested.

## Phase 4 — Commercial platform (P2)

- Tenant accounts/organizations, quotas, multi-user permissions, audit logs.
- Approved deployment, domains, secrets management, backups and billing.
- Monitoring, abuse prevention, incident response and cost budgets.
- **Exit:** security review, isolation tests, operational playbook, controlled private beta.

## Phase 5 — Model improvement (P2)

- Opt-in coding trajectory collection, de-identification and license checks.
- Baseline evaluation, QLoRA experiment, held-out benchmark and regression review.
- Provider rollout/canary strategy and model versioning.
- **Exit:** custom adapter improves verified completion/cost/latency vs baseline before adoption.

## Dependencies and scheduling rules

Sandbox security precedes executing untrusted apps; authentication precedes public shared projects; observability precedes commercial beta; baseline evaluation precedes fine-tuning. No phase needs to wait for an entire competitor feature list. Plan work in small independent issues.

## Prioritized implementation checklist

| Task | Description | Depends on | Primary files/modules | Expected result / acceptance | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| FT-001 | Verify the monorepo baseline and CI | — | root workspaces, `.github/workflows/ci.yml` | clean install + existing mock/API tests pass | `npm ci --ignore-scripts`, `npm test` | **Done**; scaffold merged in PR #8 |
| FT-002 | Provider-independent model gateway | FT-001 | `services/model-gateway`, env config, ADR 0004 | deterministic mock; opt-in Ollama; timeout/cancel/retry/usage/stream contracts; no mandatory paid API | unit/contract + full repository CI | **In review** in PR #9 |
| FT-003 | OpenHands adapter compatibility spike | FT-002 | future `services/agent`, schemas, integration tests | one replaceable session interface can plan/emit events against deterministic fixtures; SDK details stay inside adapter | adapter contract tests; cancellation/error fixture | **Next** |
| FT-004 | Select one restricted workspace strategy | FT-003 | future `services/sandbox`, ADR, security tests | create/write/read/run/timeout/artifact/cleanup with explicit isolation policy; choose OpenHands workspace or OpenSandbox based on evidence | lifecycle + traversal + timeout + isolation fixtures | Not started |
| FT-005 | Deterministic prompt → build vertical slice | FT-003, FT-004 | agent, sandbox, templates, API | fixture creates a real minimal app, runs build/backend checks and exports complete source | integration tests incl. intentionally broken fixture | Not started |
| FT-006 | Browser verification and preview boundary | FT-005 | Playwright, future preview service | generated app is reachable only through reviewed preview boundary and required user flow passes | Playwright smoke + preview-origin/security tests | Not started |
| FT-007 | Held-out benchmark harness | FT-005 | `training/evaluation` or test harness | versioned tasks and measurable build/functional/repair/latency/cost results | reproducible benchmark fixture in CI | Not started |
| FT-008 | Product editing/data layer | FT-006 | modern web UI, Monaco, PostgreSQL/auth after review | persistent projects, diffs/history and CRUD scenario without breaking prior tests | unit/integration/e2e | Later |
| FT-009 | Commercial operations | FT-008 | tenant authz, quotas, deployment, audit/billing | controlled multi-tenant beta gates with operational/security review | authz, backup/recovery, abuse and deployment tests | Later |
| FT-010 | Fine-tuning experiment | FT-007 | datasets/finetune/evaluation | adapter is adopted only if held-out metrics improve vs. baseline | train/validation/held-out evaluation | Later |

These are engineering gates, not launch-date commitments. Each task must update [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) with actual evidence before it is marked done.
