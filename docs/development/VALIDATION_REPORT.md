# Validation evidence

## Current recovery — 18 November 2026

Baseline `4c38f0c950fb43e189e87b0b80052f6b1e14c034`; recovery branch
`recovery/verified-builder-2026-11-18`. Testing is authorized by the latest request.

- Baseline before changes: 41 Node tests passed.
- Current Node suites: 68 passed on Node 24.22.1 and official pinned Node 22.23.5;
  affected Node 22 runtime tests reran after signal-handling refinement (6 passed).
- Python recovery security tests: 9 passed.
- Chromium Playwright journeys: 6 passed, including complete ZIP download equality.
- Frozen installation, dependency audit and whitespace checks pass.
- Real runtime prerequisite gate: nonzero, three resource-enforcement failures.
  No generated program was executed. Remote Actions results remain unavailable.

Exact commands, runtime limitations, feature/test mapping and continuation are in
[the recovery checkpoint](../recovery/REPORT.md).

## Historical post-move validation

The following evidence describes the earlier task and its commits. Its closing
statements about a later testing pause and direct-main delivery are historical;
they do not apply to the current recovery request.

Date: **17 November 2026**. Starting commit:
`4a20bb07af3a81c4da256214900e617dad69383a`.

The owner requested “test all and fix them”, lifting the earlier testing pause.
This report covers the maintained app-builder code after the folder moves.
Historical snapshots and reports retain their earlier results.

## Results

| Check | Result |
| --- | --- |
| Frozen installation, lifecycle scripts disabled | Passed; five local workspace links, no external npm runtime packages |
| Existing suite before additional regressions | 32 passed, 0 failed, 0 skipped |
| Full suite on Node.js 24.22.1 / npm 11.9.0 | **41 passed, 0 failed, 0 skipped** |
| Full suite on Node.js 22.23.5 | **41 passed, 0 failed, 0 skipped** |
| API / generator / agent / gateway test counts | 7 / 6 / 11 / 17, included in both full-suite runs |
| Normal `npm start` entrypoint | Passed real health and generation requests; validation process stopped |
| Fresh headless Chromium UI | Passed the mock flows described below |
| Workspace/lock/public export resolution | All five workspaces and three exported library entrypoints resolve |

Nine new regression tests supplement the original 32. No existing assertion was
disabled or weakened to obtain these results.

## Reproduced failures and repairs

| Before repair | Reproduction and repaired behavior |
| --- | --- |
| Malformed URL crashed the API | Raw target `http://[` closed the connection and exited with `ERR_INVALID_URL`. URL parsing is now inside the request error boundary; malformed targets receive bounded JSON `400` with security headers, and subsequent health/generation requests succeed. |
| Partial or empty Ollama stream was labeled complete | Two EOF regressions failed because no rejection occurred without `done: true`. Missing completion now raises `invalid_provider_response`; emitted deltas remain partial, with no fabricated completion or replay. |
| Retry delay could lose an awaited operation | An idle child process exited with unsettled top-level await instead of retrying. The awaited retry timer stays referenced until completion/cleanup; the operation succeeds on its second attempt. |
| Gateway timeout could disappear | An unresponsive provider in an idle child process exited before timeout handling. The referenced timer now produces a bounded timeout result and is cleaned up. |
| Pre-aborted stream invoked its factory | A regression observed one factory call despite an already-aborted signal. Cancellation is now checked before factory invocation; zero calls. |
| Agent could dispatch after immediate cancellation | Queued custom fetch was called after cancellation. The queued callback now rechecks the signal before dispatch; zero calls. |
| Agent timeout could disappear | Awaiting a custom fetch with no active handles exited prematurely. The referenced timeout now rejects as expected and is cleaned up. |
| Dot-segment conversation IDs changed DELETE paths | `.`/`..`, including trimmed variants, normalized outside the conversation item. They now fail validation before dispatch; ordinary IDs containing interior dots remain valid. |

The new regressions failed before their corresponding repairs and passed after
them. These were expected reproduction failures, not unresolved final failures.
Source edits are confined to existing API/agent/gateway helpers. Public exports,
HTTP success contracts, dependency versions and workspace layout are unchanged.

## Browser and startup scope

Existing Python Playwright and `/usr/bin/chromium` exercised a fresh headless
browser against `apps/builder-api/src/server.mjs`. The archived smoke driver was
copied outside the checkout and its old server path was updated for this run.

Verified: initial disabled download; four real portfolio/store/dashboard/restaurant
template flows; prompt count; rendered empty-sandbox iframe; plan rows and label;
HTML download filename/content matching the actual API response; controlled HTTP
error display and recovery; mobile control visibility; zero uncaught page errors.
The controlled HTTP error was a deliberate fixture. A separate `npm start` smoke
checked the normal root script and real health/generation responses. Validation
servers/process groups started here were stopped.

This validates the static mock, not a generated full-stack app, accessibility
audit, production browser support or signed-in shared desktop session.

## Commands and runtime provenance

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund --cache /workspace/.cache/npm
npm test
```

The same four files were run directly with Node 22.23.5:

```text
node --test apps/builder-api/test/app.test.mjs packages/project-generator/test/core.test.mjs services/agent-adapter/test/agent.test.mjs services/model-gateway/test/model-gateway.test.mjs
```

The official Node 22 archive was downloaded over verified HTTPS and checked
against the official SHA-256 list. It is cached outside the checkout and does not
replace the default runtime or add a project dependency.

- Archive: `node-v22.23.5-linux-x64.tar.xz`
- SHA-256: `cdeb8670a0c81f51b4dc4ac61919f9b1ad917b304bf8221eb939570663d240f8`
- The local Node 22 result validates the CI Node major; a remote Actions outcome
  has not been observed or claimed.

## Preservation and remaining limits

Fourteen baseline originals are retained in
[ORIGINALS_BEFORE_POST_MOVE_VALIDATION_4A20BB0.zip](../../AnalyseFuture/history/recovery-reports/validation/ORIGINALS_BEFORE_POST_MOVE_VALIDATION_4A20BB0.zip).
The [placement ledger](../../AnalyseFuture/history/organization/PATH_MAPPING.json) records
this report, the archive and original hashes. Earlier evidence remains untouched.

No separate build, lint or type-check script is declared, so no such run is
claimed. Upstream ZIPs are inactive references; their suites were not installed
or executed. Live Ollama inference, a real OpenHands server, generated-code
isolation, database migrations and production deployment remain unconfigured or
unimplemented. Those are integration/product gaps, not hidden skipped assertions
in the 41-test result.

The request for that earlier validation authorized testing and normal pushes.
Those validation commits omitted `[skip ci]`, allowing the existing workflow to
run. The later restructuring request pauses testing again and uses `[skip ci]`. Delivery remains directly to
`main`, without a PR, force push or history rewrite.
