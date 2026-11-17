# fine-tune — Independent AI Full-Stack App Builder

> **Status: Phase-0 mock + Phase-1 gateway and agent-adapter foundations (17 November 2026).** The repository includes a runnable deterministic template demo, a provider-independent model gateway with deterministic mock and opt-in local Ollama adapters, and an OpenHands transport adapter tested against a fake server. It does **not** yet include a verified live coding agent, secure generated-code sandbox, full-stack generation pipeline, production hosting, or a verified live model run.

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

The functional layout is documented in [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md).
The latest [recovery checkpoint](docs/recovery/REPORT.md) records the independently
verified baseline, complete data inventory, security fixes, project export and
current tests. Historical reports remain preserved; their task-specific testing
pauses and direct-to-main instructions are superseded by this recovery request.

| Audience | Read first |
| --- | --- |
| Everyone | [Project charter](docs/product/PROJECT_CHARTER.md), [current status](docs/development/IMPLEMENTATION_STATUS.md) |
| Product planning | [Canonical project vision and future roadmap (TXT)](docs/product/PROJECT_VISION_AND_FUTURE_ROADMAP.txt): existing work, feasibility limits and conditional future horizons |
| Repository organization | [Current complete structure](PROJECT_STRUCTURE.md), [preservation and relocation record](AnalyseFuture/organization/REORGANIZATION.md), [historical reference inventory](AnalyseFuture/README.md) |
| Continue development | [Current continuation guide](docs/development/CONTINUATION.md): current paths, instructions and remaining milestones; [post-move validation](docs/development/VALIDATION_REPORT.md) |
| Historical recovery records | [Repository audit](AnalyseFuture/history/recovery-reports/audit/REPOSITORY_AUDIT.txt), [feature inventory](AnalyseFuture/history/recovery-reports/features/FEATURE_INVENTORY.txt), [validation results](AnalyseFuture/history/recovery-reports/validation/TEST_AND_VALIDATION_REPORT.txt), [earlier handoff](AnalyseFuture/history/recovery-reports/handoff/NEXT_DEVELOPER_INSTRUCTIONS.txt) |
| Engineers | [Architecture](docs/architecture/ARCHITECTURE.md), [product requirements](docs/product/PRODUCT_REQUIREMENTS.md), [roadmap](docs/product/ROADMAP.md) |
| Codex / AI coding agents | [AGENTS.md](AGENTS.md), [Codex playbook](docs/development/CODEX_PLAYBOOK.md) |
| Open-source integrators | [Reuse audit](docs/research/REUSE_AUDIT.md), [licensing and ownership](docs/legal/OWNERSHIP_AND_LICENSES.md) |
| All public repo references | [Complete repository list (TXT)](docs/research/RECOMMENDED_PUBLIC_REPOSITORIES.txt) |
| ML engineers | [Model strategy](docs/model-training/MODEL_TRAINING.md), [evaluation](docs/development/TESTING_AND_EVALUATION.md) |
| Security and ops | [Security architecture](docs/security/SECURITY_ARCHITECTURE.md), [costs](docs/operations/COSTS_AND_OPERATIONS.md) |
| Contributors | [Onboarding](docs/development/DEVELOPER_ONBOARDING.md), [CONTRIBUTING.md](CONTRIBUTING.md) |

## Architecture direction

Use one **original monorepo** with separately versioned, replaceable integrations. Do **not** concatenate entire copies of bolt.diy, Dyad, OpenHands, Onlook, or other products.

- **Current UI/API:** Node.js 22 local mock builder under `apps/`.
- **Current model boundary:** `services/model-gateway`, deterministic mock by default and local Ollama opt-in.
- **Agent candidate:** OpenHands Software Agent SDK behind our own adapter.
- **Runtime candidate:** compare OpenHands workspace behavior with OpenSandbox and select one primary execution path.
- **Testing:** Node unit/API tests now; Playwright required for the first real generated-app vertical slice.
- **Future product UI/data:** modern web UI, Monaco, PostgreSQL and reviewed auth once the core generation/execution workflow is working.
- **Deployment/training:** later gates, not prerequisites for the first vertical slice.

See [architecture](docs/architecture/ARCHITECTURE.md), [reuse audit](docs/research/REUSE_AUDIT.md), and [ADR 0004](docs/architecture/decisions/0004-model-gateway-boundary.md).

Active code remains in `apps/`, `packages/` and `services/`. Original upstream ZIPs
and preserved historical documents live in [AnalyseFuture](AnalyseFuture/README.md)
for future inspection. They are references, not installed or integrated features;
no original file content was discarded during the organization pass.

## Run the current local mock

Requirements: Node.js 22+ and npm. The model gateway remains dependency-free. The API uses pinned MIT-licensed `fflate` for complete source ZIP export.

```bash
npm ci --ignore-scripts
npm test
npm run dev
```

`npm test` includes maintained component tests and runtime-probe unit tests through
scoped paths; archived reference code is excluded. Additional checks:

```bash
npm run test:recovery              # Python 3.12+; bounded archive-reader tests
npx playwright install chromium    # once, or use an installed Chromium below
npm run test:browser                # actual browser journeys, owned test server
# With a preinstalled system browser:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run check
```

The UI downloads either HTML or a complete static project ZIP (`index.html` and
`README.md`). ZIP export uses the successful preview's original prompt even if
the input is edited. No generated programs are executed. Optional
`npm run check:sandbox` probes a pinned local Docker image and **fails closed**
when resource enforcement is unavailable; see the recovery checkpoint.
Both HTTP adapters reject redirects, so configure the final Ollama/Agent Server
endpoint rather than an address that redirects elsewhere. See the
[security review](AnalyseFuture/history/recovery-reports/security/SECURITY_AUDIT.txt) for evidence and unresolved limits.

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

This GitHub repository is **currently public**. Public visibility is not the same as a license grant. No project-wide license has been chosen or granted here; review [ownership and licenses](docs/legal/OWNERSHIP_AND_LICENSES.md) before copying code or accepting substantial contributions. Never commit credentials, private customer code, or secrets.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md). Prefer small reviewable PRs with executable evidence.

---

*This is a living engineering repository. Planned capabilities are not reported as implemented until verified.*
