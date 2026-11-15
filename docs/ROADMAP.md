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

## Immediate task order

1. Merge the model-gateway foundation only after CI passes.
2. Prove the OpenHands adapter boundary with deterministic fixtures.
3. Choose and test one restricted workspace implementation.
4. Connect agent + workspace + Playwright into the first real vertical slice.
5. Build the held-out benchmark suite before model fine-tuning.

These are engineering gates, not launch-date commitments.
