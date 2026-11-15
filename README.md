# fine-tune — Independent AI Full-Stack App Builder

> **Status: Phase-0 mock + Phase-1 model-gateway foundation (16 November 2026).** The repository includes a runnable deterministic template demo and a provider-independent model gateway with deterministic mock and opt-in local Ollama adapters. It does **not** yet include a working coding agent, secure generated-code sandbox, full-stack generation pipeline, production hosting, or a verified live model run.

## Our mission

Build an independently operated, commercial AI platform that takes a natural-language request and creates, edits, tests, previews, and ultimately deploys **working full-stack web applications**. We aim to compete with the user experience and capabilities of **Lovable, Replit Agent, and Bolt.new**. “No. 1” is our ambition, not a verified market ranking or performance claim.

The product should offer:
- End-to-end website and application generation: frontend, backend, database, auth, and tests.
- Chat-driven iteration plus visual and code-level editing.
- Sandboxed execution, live previews, debugging, version history, and source export.
- User-owned source code; optional self-hosted model inference; no mandatory paid model API.
- A fine-tuned coding model **only after** we establish a measurable baseline and collect consented, validated training data.
- A sustainable commercial SaaS with security, observability, cost controls, and a developer-friendly architecture.

**North-star first demonstration:** user prompt → agent plan → generated full-stack project → isolated build/run → live preview → automated checks → downloadable source.

## Start here

| Audience | Read first |
| --- | --- |
| Everyone | [Project charter](docs/PROJECT_CHARTER.md), [current status](docs/IMPLEMENTATION_STATUS.md) |
| Engineers | [Architecture](docs/ARCHITECTURE.md), [product requirements](docs/PRODUCT_REQUIREMENTS.md), [roadmap](docs/ROADMAP.md) |
| Codex / AI coding agents | [AGENTS.md](AGENTS.md), [Codex playbook](docs/CODEX_PLAYBOOK.md) |
| Open-source integrators | [Reuse audit](docs/REUSE_AUDIT.md), [licensing and ownership](docs/OWNERSHIP_AND_LICENSES.md) |
| All public repo references | [Complete repository list (TXT)](docs/RECOMMENDED_PUBLIC_REPOSITORIES.txt) |
| ML engineers | [Model strategy](docs/MODEL_TRAINING.md), [evaluation](docs/TESTING_AND_EVALUATION.md) |
| Security and ops | [Security architecture](docs/SECURITY_ARCHITECTURE.md), [costs](docs/COSTS_AND_OPERATIONS.md) |
| Contributors | [Onboarding](docs/DEVELOPER_ONBOARDING.md), [CONTRIBUTING.md](CONTRIBUTING.md) |

## Architecture direction

Use one **original monorepo** with separately versioned, replaceable integrations. Do **not** concatenate entire copies of bolt.diy, Dyad, OpenHands, Onlook, or other products.

- **Current UI/API:** Node.js 22 local mock builder under `apps/`.
- **Current model boundary:** `services/model-gateway`, deterministic mock by default and local Ollama opt-in.
- **Agent candidate:** OpenHands Software Agent SDK behind our own adapter.
- **Runtime candidate:** compare OpenHands workspace behavior with OpenSandbox and select one primary execution path.
- **Testing:** Node unit/API tests now; Playwright required for the first real generated-app vertical slice.
- **Future product UI/data:** modern web UI, Monaco, PostgreSQL and reviewed auth once the core generation/execution workflow is working.
- **Deployment/training:** later gates, not prerequisites for the first vertical slice.

See [architecture](docs/ARCHITECTURE.md), [reuse audit](docs/REUSE_AUDIT.md), and [ADR 0004](docs/decisions/0004-model-gateway-boundary.md).

## Run the current local mock

Requirements: Node.js 22+ and npm. The current repository adds no third-party npm package for the model gateway.

```bash
npm ci --ignore-scripts
npm test
npm run dev
```

Open http://127.0.0.1:3000. The browser demo still uses a deterministic static generator; it is **not yet connected** to the model gateway.

## Model gateway

The model gateway exists so future agent code is not coupled directly to a provider. CI and ordinary tests use the deterministic mock. Local Ollama is optional and must be configured explicitly; the repository does not download a model.

Example settings are in `.env.example`. Ollama defaults to loopback-only endpoints, and enabling a remote endpoint requires an explicit operator setting. A live Ollama inference has not yet been verified by this repository.

## Development principles

1. **Reuse before build.** Search for maintained, commercially usable solutions before creating custom infrastructure.
2. **One owner-controlled product.** Our original business logic, UX, orchestration and product data remain modular and independently replaceable.
3. **Build and verify small slices.** Each milestone ships runnable code plus reproducible tests; no “implemented” claims without evidence.
4. **Security from day one.** Untrusted generated code never runs with host or production privileges.
5. **Credit efficiency.** Spend coding work on missing product logic instead of rewriting mature utilities.
6. **Model independence.** Never couple the core product to a single paid model provider.
7. **Differentiate on reliability.** Measure successful builds, working workflows, repair rate, latency, and user cost—not feature count alone.

## Ownership, visibility and license

This GitHub repository is **currently public**. Public visibility is not the same as a license grant. No project-wide license has been chosen or granted here; review [ownership and licenses](docs/OWNERSHIP_AND_LICENSES.md) before copying code or accepting substantial contributions. Never commit credentials, private customer code, or secrets.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Prefer small reviewable PRs with executable evidence.

---

*This is a living engineering repository. Planned capabilities are not reported as implemented until verified.*
