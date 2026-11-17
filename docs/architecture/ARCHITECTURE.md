# Architecture — Modular Monorepo

**Status (17 November 2026):** Phase-0 browser/API/core mock, the provider-independent model gateway and the thin OpenHands Agent Server transport adapter are present on `main`. The adapter has fake-server contract tests; a live coding-agent run is unverified. Production sandbox, persistence, authenticated previews, deployment, training and most target UI services remain proposals until verified.

## Fundamental choice

One original product repository with clean boundaries and pinned third-party dependencies; not a wholesale merger of OpenHands, bolt.diy, Dyad, Onlook and other full applications.

## Current checked-in implementation

    apps/
      builder-api/          # minimal Node HTTP API for deterministic mock
      builder-web/          # static local builder UI
    packages/
      project-generator/    # prompt validation + deterministic static generator
    services/
      agent-adapter/        # OpenHands transport adapter; fake-server tests only
      model-gateway/        # merged provider-independent mock + Ollama boundary
    docs/
    .github/workflows/
    AnalyseFuture/          # preserved archives and historical documents; not runtime code

The current builder still calls `packages/project-generator`; it is intentionally **not** described as AI generation.

The complete functional layout and placement decisions are in
[PROJECT_STRUCTURE.md](../../PROJECT_STRUCTURE.md). The current recovery adds
complete static-project ZIP export at `POST /api/export`, using the existing
deterministic generator and bounded in-memory serialization. The UI retains its
successful prompt for export and keeps the script-disabled opaque iframe.
`tools/recovery` owns data-only inventory; `tools/runtime` owns a fail-closed
Docker prerequisite check. Neither tool executes archive or generated programs.
Current test evidence and unresolved runtime controls are recorded in the
[recovery checkpoint](../recovery/REPORT.md). Source package paths and public
library exports are retained.

The original upstream ZIPs are kept in `AnalyseFuture/references/upstream/`.
Historical documents and an inventory preserve the pre-organization contents.
Use [PROJECT_STRUCTURE.md](../../PROJECT_STRUCTURE.md) for the active layout and
[CONTINUATION.md](../development/CONTINUATION.md) for current paths and next steps.
The [earlier repository review](../../AnalyseFuture/history/organization/REPOSITORY_STRUCTURE.md) preserves historical
layouts and recovery scope. Keep upstream source compressed to avoid accidental
execution or discovery of unpacked third-party code.

The follow-up full audit inventories the 65-file `e40fa80` starting state and
all 39 commits reachable after explicitly fetching every remote branch. Its
[feature/dependency map](../../AnalyseFuture/history/recovery-reports/features/DEPENDENCY_MAP.txt) explains the actual
cross-folder call paths. These are deliberate boundaries, not competing engines.
The canonical product vision is now
[docs/product/PROJECT_VISION_AND_FUTURE_ROADMAP.txt](../product/PROJECT_VISION_AND_FUTURE_ROADMAP.txt).
The obsolete compatibility pointer is preserved as historical evidence under
`AnalyseFuture/history/organization/compatibility/`.

Both adapter HTTP paths now reject redirects, and the test script explicitly
lists active tests. See [ADR 0006](decisions/0006-reference-and-request-boundaries.md).

## Target repository layout

    apps/
      builder-web/          # future production user dashboard, chat, preview
      builder-api/          # product HTTP/auth/projects/usage endpoints
    services/
      agent-adapter/        # OpenHands boundary; add orchestration only when proven
      model-gateway/        # IMPLEMENTED foundation; mock + local Ollama
      sandbox/              # workspace provisioning and execution policy
      preview/              # authenticated preview access
      deployment/           # human-approved deploy operations
    packages/
      project-generator/    # existing mock foundation; evolve behind stable contracts
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

OpenHands Software Agent SDK `v1.62.0` is the primary agent candidate. The first adapter uses the Agent Server REST contract for bounded conversation lifecycle operations while keeping OpenHands-specific details inside `services/agent-adapter`. The real Agent Server still requires its Python runtime; our product API does not need to embed that Python implementation. A real-server compatibility test remains required before this is treated as a working agent integration.

### Execution workspace

OpenSandbox `release-1.2.0` is the primary dedicated sandbox candidate. OpenHands also has workspace/execution abstractions. We will not run both as overlapping execution layers by default. A small, security-focused fixture must prove which boundary should own process/filesystem lifecycle before adoption.

## Proposed persistence entities

User, Organization, Membership, Project, Workspace, AgentRun, Message, ToolInvocation, Artifact, Snapshot, PreviewSession, Deployment, ProviderConfiguration, UsageEvent, AuditEvent. These are proposals; schemas are not yet implemented.

## Technology candidates

Current candidates include Next.js/TypeScript, shadcn/ui, Monaco, PostgreSQL, Better Auth, OpenHands Agent SDK, OpenSandbox, Playwright, Ollama/vLLM, and Coolify later for approved deployments. See [REUSE_AUDIT.md](../research/REUSE_AUDIT.md). A candidate is not adopted merely because it appears in this list.

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

[0001 Monorepo and reuse-first](decisions/0001-monorepo-reuse-first.md), [0002 single-agent first](decisions/0002-one-agent-first.md), [0003 sandbox boundary](decisions/0003-sandbox-boundary.md), [0004 model gateway boundary](decisions/0004-model-gateway-boundary.md), and [0005 OpenHands adapter boundary](decisions/0005-openhands-agent-adapter.md).
