# Product Requirements Document (PRD)

**Maturity:** proposed specification; no feature is marked delivered without verification in IMPLEMENTATION_STATUS.md.

## Primary user journey

1. User creates a project and writes a request (e.g. “build a store with products, cart, login and admin”).
2. Agent clarifies or establishes scope, shows a plan and proposed stack.
3. Agent generates frontend, backend, data schema and migrations inside a restricted workspace.
4. Platform builds/runs the result and displays a browser preview, file explorer, terminal/build logs, and test outcomes.
5. User iterates by chat or authorized visual edits; platform preserves changes and provides rollback.
6. User exports a complete Git repository or approves a deployment.

## Requirements register

| ID | Priority | Requirement | Acceptance evidence |
| --- | --- | --- | --- |
| FR-01 | P0 | Create a project from a prompt | Project/session persisted; plan visible |
| FR-02 | P0 | Generate an editable application repository | Inspectable source files; build succeeds |
| FR-03 | P0 | Secure, per-project code execution | Isolation checks, quotas, no platform secrets |
| FR-04 | P0 | Live browser preview and execution logs | User can open tested preview URL |
| FR-05 | P0 | Automatic build/test feedback and repair | Reproducible tests and bounded repair attempts |
| FR-06 | P0 | Download or export generated source | Valid archive/repository containing build instructions |
| FR-07 | P1 | Full-stack API, database and migration workflow | CRUD scenario passes integration tests |
| FR-08 | P1 | User auth and project authorization | Cross-user access tests pass |
| FR-09 | P1 | Code editor, diffs and version history | Changes persist; rollback works |
| FR-10 | P1 | Model provider abstraction (local-first) | Mock + self-hosted provider tested |
| FR-11 | P1 | Structured visual editing | Selected edits reflected in source and preview |
| FR-12 | P2 | GitHub import/sync and deployment approvals | Branch/export/deploy acceptance tests |
| FR-13 | P2 | Teams, roles, collaboration, usage/billing | Role isolation and metering tests |
| FR-14 | P2 | Domain management, backups and recovery | Verified recovery exercise |
| FR-15 | P2 | Fine-tuned model option | Outperforms baseline on held-out evaluation |

## User experience principles

Prompt-first, editable results, clear progress and costs, inspectable plans, human approval for risky actions, and a direct path from preview to exported code. A real app matters more than a mockup.

## Quality attributes

- **Security:** tenant isolation, untrusted execution restrictions, scoped credentials, auditable deployment actions.
- **Reliability:** bounded retries, recoverable projects, deterministic dependency installs where feasible.
- **Performance:** measure time to first preview, end-to-end completion time, test pass rate, and cost per successful build.
- **Portability:** exported source should not secretly depend on proprietary runtime APIs unless explicitly disclosed.
- **Accessibility:** keyboard navigation, semantic controls, and automated accessibility smoke checks.
- **Maintainability:** TypeScript/Python boundaries, documented contracts, pinned dependencies, tests and ADRs.

## Definition of the first vertical slice

Given a fixed prompt for a basic application and an approved model configuration, the agent must create files, run a build in a restricted workspace, serve a preview, run browser/API smoke tests, and produce a complete downloadable project. Verification must be repeatable locally or in CI. Mocked model runs are allowed only when clearly labeled as mocks.

## Open product decisions

Brand name; repo license; first supported app templates and tech stacks; hosted vs self-hosted tiers; authentication and deployment provider selection; design editor approach; data retention and pricing. None is finalized in this document.