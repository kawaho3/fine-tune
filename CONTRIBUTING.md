# Contributing to fine-tune

Thanks for helping build an independent AI full-stack web-app builder. **The repository includes a local deterministic mock demo and product specification, but not a finished AI app builder.**

## Before contributing

- Read [README](README.md), [charter](docs/PROJECT_CHARTER.md), [status](docs/IMPLEMENTATION_STATUS.md), [architecture](docs/ARCHITECTURE.md), [roadmap](docs/ROADMAP.md), and [security](docs/SECURITY_ARCHITECTURE.md).
- Pick an issue, or open one describing the proposed change with acceptance criteria.
- Discuss major technology decisions in an issue/ADR before integrating an entire dependency or service.
- Check [ownership and licenses](docs/OWNERSHIP_AND_LICENSES.md): the repository has **no project-wide license yet**. Publishing code does not automatically make it open source. Contributors should agree on terms with maintainers before submitting substantial code.

## Working agreement

- Build the smallest testable feature. Reuse maintained components rather than writing another editor, auth library, agent framework, or deployment engine.
- No private data, production tokens, credentials, or copyrighted code copied without permission.
- Generated code must run in a securely isolated workspace; use approved secrets handling.
- A PR needs a meaningful description, tests or a reason tests could not run, and docs/status updates.
- Avoid mixing unrelated refactors with feature work.
- Keep architecture decisions in docs/decisions.

## Proposed development flow

1. Create or select an issue with explicit acceptance checks.
2. Create a dedicated feature branch.
3. Implement the narrow task and add reproducible tests.
4. Run `npm ci --ignore-scripts` and `npm test` (Node.js 22+), and report results. See [MOCK_PROTOTYPE](docs/MOCK_PROTOTYPE.md) for the local demo.
5. Open a PR using .github/pull_request_template.md.
6. Resolve review feedback and document the actual implementation status.

## For documentation-only contributions

Fix inaccurate claims, improve comparisons, refine test criteria, and annotate candidate integrations with verified sources and license/maintenance information. Do not label unverified candidates as approved.

## Security reports

Please follow [SECURITY.md](SECURITY.md); do not publish exploitable vulnerabilities or private logs in public issues.