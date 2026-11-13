# Codex Astra Playbook — Spend Credits on Working Results

Codex can write and test repository code in supported cloud environments. Do not assume it provides production hosting, unrestricted secrets, or a suitable GPU for fine-tuning. Verify the model/environment available to your account.

## Task 0 — Mandatory read-only reuse audit

> Inspect the current tree and these docs before changing anything. Review current upstream versions, licenses, commercial limitations, security, maintenance, hosting requirements and compatibility of the candidates listed in docs/REUSE_AUDIT.md. Choose one primary agent, sandbox, auth, visual-editing and model-serving approach. Produce a dated findings report, decisions and pinned revisions. Do NOT install dependencies or generate application code during the audit. Distinguish verified facts from assumptions.

## Task 1 — Minimal foundation after audit approval

> Implement only the smallest original monorepo scaffold needed for a deterministic vertical slice. Introduce lockfiles, local documented setup, .env.example with non-secret placeholders, mock model provider, test framework, lint/format and CI smoke tests. Document exact commands and run them. No paid API or real customer data. Update docs/IMPLEMENTATION_STATUS.md.

## Task 2 — One tested user journey

> Build a minimal prompt→plan→generated files→restricted build/test→authenticated preview→source export flow. Use the approved agent SDK and exactly one reviewed execution strategy. Include one successful fixture and one failing fixture, bounded retries, and a browser smoke test. Never claim completion unless tests passed with reported commands and outputs.

## How to scope each Codex task

- Describe **one** deliverable and acceptance tests.
- Tell Codex to inspect before editing and reuse approved dependencies.
- Specify files/modules allowed to change.
- Require evidence: commands run, pass/fail, screenshots only if available, regression risk.
- Keep a concise change log and update status/ADRs.
- If a prerequisite is unavailable, implement a tested mock and report the blocker—do not invent success.
- Do not run GPU training or uncontrolled expensive inference as side effects.

## PR review prompts

> Audit this change for licensing, tenant isolation, secret handling, cost, correctness, maintainability and test evidence. Identify fabricated claims or untested paths. Do not rewrite unrelated code. Recommend the smallest fixes.

## Explicit anti-waste rules

Do not merge full forks of bolt.diy, Dyad, OpenHands and Onlook. Do not duplicate Monaco/auth/queue/test engines. Do not generate billing, deployment, collaboration or fine-tuning components until the vertical slice proves the underlying foundations.