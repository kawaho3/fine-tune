# Architecture — Proposed Modular Monorepo

**Status: design proposal. No listed app/service has been created or tested yet.**

## Fundamental choice

One original product repository with clean boundaries and pinned third-party dependencies; not a wholesale merger of OpenHands, bolt.diy, Dyad, Onlook and other full applications.

## Planned repository layout

    apps/
      web/                  # Next.js user dashboard, chat, preview
      api/                  # HTTP/auth/projects/usage endpoints (framework TBD)
    services/
      agent/                # OpenHands SDK adapter and task orchestration
      model-gateway/        # Local and optional external model providers
      sandbox/              # Workspace provisioning and execution policy
      preview/              # Authenticated preview access
      deployment/           # Human-approved deploy operations
    packages/
      ui/                   # Shared branded components
      schemas/              # API/event contracts
      templates/            # Audited starter project templates
    training/
      datasets/             # Manifests and synthetic examples only; no private data
      finetune/             # QLoRA adapter training scripts
      evaluation/           # Held-out benchmark tasks and harness
    infrastructure/
      local/                # Local developer infrastructure (future)
      deployment/           # IaC and runtime definitions (future)
    tests/
      e2e/
      integration/
      security/
    docs/

This is a target map, **not current checked-in directories**.

## Logical flow

    Browser → Product API → Project/session store (PostgreSQL)
                       ↓
                 Agent orchestrator
                       ↕
                 Model gateway → local Ollama or vLLM
                       ↓
              Workspace manager → isolated sandbox
                       ├─ apply code patch / read files
                       ├─ install, build and test
                       └─ preview web service → authenticated preview proxy
                       ↓
              Artifacts, diffs, logs, metrics
                       ↓
               Export or approved deployment

A background queue can drive long-running jobs. One primary agent engine should be used initially, with an adapter isolating SDK-specific details.

## Boundaries and responsibilities

- **Web UI:** capture requests, render progress, show diffs/logs, expose preview and human approval.
- **Product API:** identities, project authorization, session persistence, quotas, billing events, audit records.
- **Agent service:** plans, tool calls, patch application, bounded retries, task lifecycle, result records.
- **Model gateway:** streaming tokens, provider configuration, capability checks, usage estimates, tracing; no sensitive secrets exposed to prompts.
- **Sandbox service:** create/destroy isolation units, enforce filesystem and network restrictions, CPU/RAM/disk/time budgets.
- **Preview proxy:** authenticated routing to temporary apps; block internal control-plane networks.
- **Deployment:** gated export/deploy, scoped tokens, version identifiers, backups and rollback.
- **Data plane:** project files and logs stored with tenant-specific authorization and retention policies.

## Proposed persistence entities

User, Organization, Membership, Project, Workspace, AgentRun, Message, ToolInvocation, Artifact, Snapshot, PreviewSession, Deployment, ProviderConfiguration, UsageEvent, AuditEvent. Data model and ownership will be specified before implementation.

## Technology candidates

Next.js + TypeScript; shadcn/ui; Monaco; PostgreSQL; Better Auth; FastAPI where Python agent integration is easiest; OpenHands Agent SDK as first candidate; Ollama/vLLM model gateways; Playwright; isolation via selected sandbox strategy; Coolify later for deployment. See [REUSE_AUDIT.md](REUSE_AUDIT.md) — none is yet a locked integration.

## Key technical decisions and checks

- **Agent framework:** prove a thin OpenHands integration before adding multi-agent orchestration.
- **Execution:** compare SDK workspace capabilities and OpenSandbox on isolation, local dev, resource limits, reliability, and maintenance; choose one primary provisioning path.
- **Visual editor:** Puck is schema/structured-component oriented; Onlook represents code-backed editing. Prototype one before combining.
- **Backend language:** minimize gratuitous microservices; keep API contracts explicit if both TS and Python are needed.
- **Provider choice:** allow mocked/locally served models in CI and never require paid calls to run unit tests.

## Failure modes

Model hallucinations; code that builds but does not work; dependency installation side effects; malicious prompt/code; sandbox escapes; cross-tenant preview leaks; runaway costs; stranded sessions; incomplete exports; bad migrations. Each requires tests and containment.

## Design records

[0001 Monorepo and reuse-first](decisions/0001-monorepo-reuse-first.md), [0002 single-agent first](decisions/0002-one-agent-first.md), and [0003 sandbox boundary](decisions/0003-sandbox-boundary.md).