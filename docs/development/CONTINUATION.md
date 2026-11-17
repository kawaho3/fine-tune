# Current continuation guide

Updated **18 November 2026**. Read [AGENTS.md](../../AGENTS.md), the
[status](IMPLEMENTATION_STATUS.md), and [recovery checkpoint](../recovery/REPORT.md).
Use the existing isolated checkout; create no worktree unless requested.

## Current authorization

The latest recovery request supersedes the old static-only testing pause and
instructions to push directly to main. Keep work on the recovery branch, make
reviewable commits, and do not merge automatically, force-push, or rewrite history.
Keep archive contents inert; inspect them as data before selective integration.
Preserve unique source, requirements, security evidence, and uncertain provenance.

## Reproduce

From the repository root (Node 22+, npm, Python 3.12+):

```sh
npm ci --ignore-scripts
npm test
npm run test:recovery
npx playwright install chromium
npm run test:browser
npm run dev
```

Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium` for the current
machine's installed browser. `npm run check` runs Node, recovery and browser tests.
The browser runner starts and stops its own server on port 3100 and refuses to
reuse an unrelated server. The developer server defaults to port 3000; set HOST
and PORT explicitly when needed. No credentials, paid APIs or live model are
required for deterministic development. No project build step currently exists.

Runtime code stays in the five npm workspaces. API export owns ZIP serialization;
recovery and runtime diagnostics live in tools/, with cross-cutting tests in
tests/. Baseline inventory artifacts deliberately target the starting commit, not
new files created by this checkpoint. Regenerate into temporary outputs using the
exact command in the recovery report when checking preservation.

## Next dependency-ordered work

1. Provide a supported runtime with actual per-workspace CPU, RAM and PID limits.
   Pull the pinned image documented in the report, then run `npm run check:sandbox`.
   A passing prerequisite probe still needs adversarial lifecycle/isolation tests;
   it does not enable arbitrary execution or certify a production sandbox.
2. Review/pin one agent/workspace integration and verify a real server contract.
   Keep existing model/agent transport interfaces replaceable.
3. Implement a deterministic fixture that creates project files, builds/tests
   inside that runtime, presents a separate-origin preview, and exports complete
   source. Test cancellation, broken builds, cleanup and the browser journey.
4. Only then add live local inference and later persistence/auth/deployment.

Do not restore older disguised adapter snapshots wholesale: they lack later
security fixes. The reference archives were read and hashed but never executed;
their own suites remain unrun. GitHub account controls require owner verification
because the current proxy blocks the API. No credentials should be supplied in chat.
