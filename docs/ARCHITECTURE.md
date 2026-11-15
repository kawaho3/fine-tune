# Architecture — Modular Monorepo

**Status:** Phase-0 browser/API/core mock is implemented. A provider-independent model gateway is implemented on `feat/model-gateway-foundation`. Agent, production sandbox, persistence, authenticated previews, deployment, training and most target UI services remain design proposals until verified.

## Fundamental choice

One original product repository with clean boundaries and pinned third-party dependencies; not a wholesale merger of OpenHands, bolt.diy, Dyad, Onlook and other full applications.

## Current checked-in implementation

    apps/
      api/                  # minimal Node HTTP API for deterministic mock
      web/                  # static local builder UI
    packages/
      core/                 # prompt validation + deterministic static generator
    services/
      model-gateway/        # provider-independent mock + Ollama boundary (feature branch)
    docs/
    .github/workflows/

The current builder still calls `packages/core`; it is intentionally **not** described as AI generation.

## Target repository layout

    apps/
      web/                  # future production user dashboard, chat, preview
      api/                  # product HTTP/auth/projects/usage endpoints
    services/
      agent/                # OpenHands SDK adapter and task orchestration
      model-gateway/        # IMPLEMENTED foundation; mock + local Ollama
      sandbox/              # workspace provisioning and execution policy
      preview/              # authenticated preview access
      deployment/           # human-approved deploy operations
    packages/
      core/                 # existing mock foundation; evolve behind stable contracts
      ui/
      schemas/
      templates/
    training/
      datasets/
      finetune/
      evaluation/
    infrastructure/
      local/
      deployment/
    tests/
      e2e/
      integration/
      security/
    docs/

Introduce target directories only when a working milestone requires them.

## Logical target flow

    Browser → Product API → Project/session store
                       ↓
                 Agent orchestrator
                       ↕
                 Model gateway → deterministic mock
                               → local/self-hosted Ollama
                               → optional reviewed providers
                       ↓
              Workspace manager → ONE reviewed isolation strategy
                       ├─ apply code patch / read files
                       ├─ install, build and test
                       └─ preview web service → authenticated preview proxy
                       ↓
              Artifacts, diffs, logs, metrics
                       ↓
               Export or approved deployment

## Boundaries and responsibilities

- **Web UI:** capture requests, render progress, show diffs/logs, expose preview and human approval.
- **Product API:** identities, project authorization, session persistence, quotas, billing events, audit records.
- **Agent service:** plans, tool calls, patch application, bounded retries, task lifecycle, result records. OpenHands-specific logic must stay inside one adapter.
- **Model gateway:** implemented contract for model requests. It owns provider configuration, validation, cancellation/timeouts, bounded retry rules, streaming events, usage and latency. CI defaults to the deterministic mock. Ollama is opt-in and loopback-only by default.
- **Sandbox service:** future create/destroy isolation units, filesystem boundaries, command execution, network policy, CPU/RAM/disk/time budgets and artifact retrieval.
- **Preview proxy:** future authenticated routing to temporary apps; separate preview origin and blocked control-plane networks.
- **Deployment:** future gated export/deploy with scoped tokens, version identifiers, backups and rollback.
- **Data plane:** future project files/logs stored with tenant-specific authorization and retention policies.

## Current upstream decisions

### Model serving

ADR 0004 accepts a replaceable model boundary and local Ollama as the first live adapter. This choice does **not** require Ollama for CI and does not download a model automatically.

### Coding agent

OpenHands Software Agent SDK `v1.62.0` is the primary adapter candidate. It requires Python 3.12+. Its separately packaged agent server exposes REST/WebSocket interfaces, which allows the current Node product shell to remain Node while the first compatibility spike determines whether a Python process/service is actually necessary.

### Execution workspace

OpenSandbox `release-1.2.0` is the primary dedicated sandbox candidate. OpenHands also has workspace/execution abstractions. We will not run both as overlapping execution layers by default. A small, security-focused fixture must prove which boundary should own process/filesystem lifecycle before adoption.

## Proposed persistence entities

User, Organization, Membership, Project, Workspace, AgentRun, Message, ToolInvocation, Artifact, Snapshot, PreviewSession, Deployment, ProviderConfiguration, UsageEvent, AuditEvent. These are proposals; schemas are not yet implemented.

## Technology candidates

Current candidates include Next.js/TypeScript, shadcn/ui, Monaco, PostgreSQL, Better Auth, OpenHands Agent SDK, OpenSandbox, Playwright, Ollama/vLLM, and Coolify later for approved deployments. See [REUSE_AUDIT.md](REUSE_AUDIT.md). A candidate is not adopted merely because it appears in this list.

## Key technical rules

- Prove a thin OpenHands integration before multi-agent orchestration.
- Select one primary execution strategy before running generated code.
- Prototype Puck **or** Onlook before considering both.
- Avoid gratuitous Python/TypeScript microservices; introduce a Python service only when the OpenHands integration demonstrates the need.
- Never require a paid model call for unit/CI tests.
- Never execute generated/user-controlled code directly on the trusted production host.

## Failure modes

Model hallucinations; code that builds but does not work; dependency installation side effects; malicious prompt/code; sandbox escapes; cross-tenant preview leaks; runaway costs; stranded sessions; incomplete exports; bad migrations. Each requires tests and containment.

## Design records

[0001 Monorepo and reuse-first](decisions/0001-monorepo-reuse-first.md), [0002 single-agent first](decisions/0002-one-agent-first.md), [0003 sandbox boundary](decisions/0003-sandbox-boundary.md), and [0004 model gateway boundary](decisions/0004-model-gateway-boundary.md).
