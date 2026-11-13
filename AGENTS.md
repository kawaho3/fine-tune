# Instructions for Codex and AI Coding Contributors

Read README.md, docs/IMPLEMENTATION_STATUS.md, docs/PROJECT_CHARTER.md, docs/ARCHITECTURE.md, docs/REUSE_AUDIT.md, docs/ROADMAP.md, and docs/SECURITY_ARCHITECTURE.md **before writing code**.

## Required working style

1. Begin every task by checking the current repository tree, open issues, tests, actual toolchain, and existing implementation. Do not assume a package or service exists merely because the architecture proposes it.
2. Break work into the smallest independently verifiable milestone. State acceptance criteria and what is *not* included.
3. Search and assess mature libraries before building commodity components. Assess license, updates, maintenance, costs, compatibility, and security. Do not copy proprietary competitor code.
4. Maintain one original monorepo. Integrate upstream projects as pinned dependencies/services, **not** by wholesale merging multiple products.
5. Prefer one primary agent engine, one execution strategy, one auth system, and one initial visual-editing approach until evidence justifies alternatives.
6. Isolate generated/user-controlled code. Never execute it on the production host with production secrets. No privileged Docker, broad filesystem mounts, unbounded network egress, or unrestricted commands.
7. Keep the model-provider interface replaceable; support local/self-hosted endpoints where feasible. Do not introduce mandatory paid AI APIs without an explicit product decision.
8. Do not perform large GPU model training as part of ordinary Codex Cloud coding tasks. Implement training scripts and evaluations first.
9. Do not commit secrets, private datasets, customer prompts/code without consent, model weights of uncertain license, or third-party code without notices.
10. Write tests, run relevant checks where tools permit, record exact commands/results, and be clear about tests not run. Document failures or blockers.
11. Update docs/IMPLEMENTATION_STATUS.md and affected architecture/decision docs with every material change.
12. Prefer small reviewable commits/PRs. Avoid generating elaborate scaffolding without a real vertical-slice test.

## Target vertical slice

Natural-language prompt → plan → files created → tests/build in restricted workspace → preview → export. Start with a mocked or locally served model and a simple app; add real agents, multi-tenancy, deployment, and training in stages.

## Expected PR report

- Goal / issue link
- Files and behavior changed
- Dependencies introduced, license assessment, and why needed
- Test commands with pass/fail results
- Security implications and preview evidence, if relevant
- Cost/latency implications and known limitations
- Current status document update

## Before declaring success

A generated app must actually build and run; its defined user workflow must pass tests. UI mockups or endpoint stubs are not a working full-stack product. Avoid promising deadlines, model accuracy, or cost savings without measured evidence.

See docs/CODEX_PLAYBOOK.md for reusable task prompts.