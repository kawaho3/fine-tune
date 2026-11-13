# fine-tune — Independent AI Full-Stack App Builder

> **Status: planning / documentation foundation (13 November 2026).** This repository does **not yet** contain a running application, trained model, cloud infrastructure, or verified integrations. It is the source of truth for the product we intend to build.

## Our mission

Build an independently operated, commercial AI platform that takes a natural-language request and creates, edits, tests, previews, and ultimately deploys **working full-stack web applications**. We aim to compete with the user experience and capabilities of **Lovable, Replit Agent, and Bolt.new**. “No. 1” is our ambition, not a verified market ranking or a performance claim.

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
| ML engineers | [Model strategy](docs/MODEL_TRAINING.md), [evaluation](docs/TESTING_AND_EVALUATION.md) |
| Security and ops | [Security architecture](docs/SECURITY_ARCHITECTURE.md), [costs](docs/COSTS_AND_OPERATIONS.md) |
| Contributors | [Onboarding](docs/DEVELOPER_ONBOARDING.md), [CONTRIBUTING.md](CONTRIBUTING.md) |

## Architectural direction (proposed, not implemented)

One **original monorepo**, using selected third-party projects as separately versioned libraries/services. Do **not** concatenate entire copies of bolt.diy, Dyad, OpenHands, Onlook, and other products.

- **Frontend:** Next.js / TypeScript, shadcn/ui, Monaco; evaluate Puck vs. Onlook approaches for visual editing.
- **Application backend:** FastAPI or appropriately separated TypeScript services, PostgreSQL, job queue.
- **Agent:** OpenHands Software Agent SDK as first candidate; retain a replaceable adapter.
- **Runtime:** securely isolated per-project workspaces, Playwright tests and preview proxy.
- **Models:** provider abstraction; Ollama locally, vLLM where appropriate; future QLoRA adapter.
- **Deployment:** review Coolify for user-approved deployments, separate from agent execution.
- **Observability:** OpenTelemetry and optional tracing/evaluation system.

All dependencies require **license, security, compatibility, and operational reviews** before adoption; see the [reuse audit](docs/REUSE_AUDIT.md).

## Repository right now

This repository started with just a README. Our first deliverable is an honest, reusable specification and contribution workflow. There is **no working application or install command yet**. Follow the [roadmap](docs/ROADMAP.md) and the [open issues](https://github.com/kawaho3/fine-tune/issues) to build the first vertical slice. Do not report unimplemented features as complete.

## Development principles

1. **Reuse before build.** Search for maintained, commercially usable solutions before creating custom infrastructure.
2. **One owner-controlled product.** Our original business logic, UX, orchestration and product data remain modular and independently replaceable.
3. **Build and verify small slices.** Each milestone ships runnable code plus reproducible tests; no “implemented” claims without evidence.
4. **Security from day one.** Untrusted generated code never runs with host or production privileges.
5. **Credit efficiency.** Use Codex for high-value custom code; avoid repeated rewrites of commodity components.
6. **Model independence.** Never couple the core product to a single paid model provider.
7. **Differentiate on reliability.** Measure successful builds, working workflows, repair rate, latency, and user cost—not feature count alone.

## Ownership, visibility and license

This GitHub repository is **currently public**. A public repository is not the same as a private company repository. No project-wide license has been chosen or granted here; review [ownership and licenses](docs/OWNERSHIP_AND_LICENSES.md) before copying any code or accepting substantial contributions. Never commit credentials, training examples containing private customer code, or secrets.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). Start with the documentation and first engineering issues. Codex should read [AGENTS.md](AGENTS.md) before altering project files.

---

*Documentation baseline created 13 November 2026. This is a living engineering plan, not a statement of completed implementation.*