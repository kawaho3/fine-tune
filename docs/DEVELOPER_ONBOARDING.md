# Developer Onboarding

## Where we are

Documentation-first project, 13 November 2026. There is no application to install or launch yet. If you are new, your highest-value contribution is to verify candidates, improve requirements/tests or implement Phase 0 scaffolding.

## First 30 minutes

1. Read [README](../README.md), [PROJECT_CHARTER](PROJECT_CHARTER.md), [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md) and [ROADMAP](ROADMAP.md).
2. Read [ARCHITECTURE](ARCHITECTURE.md), [REUSE_AUDIT](REUSE_AUDIT.md) and [SECURITY_ARCHITECTURE](SECURITY_ARCHITECTURE.md).
3. Read [CONTRIBUTING](../CONTRIBUTING.md), [AGENTS](../AGENTS.md) and [ownership/license policy](OWNERSHIP_AND_LICENSES.md).
4. Pick a small [issue](https://github.com/kawaho3/fine-tune/issues) with measurable acceptance criteria.
5. If proposing a new major dependency, add verification evidence to the reuse audit and record an ADR.

## Local environment (when scaffolding begins)

Proposed: Git, Node.js LTS, pnpm, Python 3.11+, Docker-compatible isolation for **local development only**, PostgreSQL, and optional Ollama. Exact versions, commands and host requirements must be pinned in the scaffold milestone; don't assume anything is operational yet. Production untrusted code must use a reviewed isolation strategy rather than arbitrary local Docker defaults.

## Envisioned first runnable command set

An upcoming Phase 0 PR will define lockfiles, workspace scripts, .env.example, database migrations and an actual README quickstart. Until then there is **no** trustworthy npm/pnpm install, dev, or test command to run.

## How to decide what to build

Use the [PRD](PRODUCT_REQUIREMENTS.md) acceptance IDs and [roadmap](ROADMAP.md). Implement one complete task, with tests and changed status, instead of building all screens with no running backend.

## Definition of a good contribution

It solves a scoped issue; has evidence of correct behavior; includes failure cases, security and license considerations; fits the architecture; and leaves enough documentation that a different developer can maintain it.

## Getting help

Open an issue with background, actual vs expected results, reproduction steps, screenshots/logs with secrets removed, and the relevant commit SHA.