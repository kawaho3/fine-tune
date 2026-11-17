# Verified recovery and implementation checkpoint

18 November 2026; selected repository `kawaho3/fine-tune`.
Branch: `recovery/verified-builder-2026-11-18`.
Baseline/default-branch SHA: `4c38f0c950fb43e189e87b0b80052f6b1e14c034`.
The initial checkout was clean. No main-branch update, automatic merge, force-push,
published-history rewrite, source deletion, or archived/generated program execution
was performed. This is a completed recovery-and-improvement checkpoint, not
completion of the entire platform or an exhaustive manual audit of upstream code.

## Preservation and findings

Before edits, created and verified an all-local-refs Git bundle and a Git source
TAR outside the checkout at `/workspace/recovery-evidence/`. After fetching all
advertised remote refs, created a second verified bundle without replacing the
first. SHA-256 values (also in that directory's `SHA256SUMS`):

| Evidence | SHA-256 |
| --- | --- |
| `fine-tune-4c38f0c.bundle` | `3d61efe3d574594006a36ebaefad575ba6508955211c52465fe0f963fb18528b` |
| `fine-tune-4c38f0c.tar` | `cc232503d93f16caeb61baa8092b7adb6649949bde257b391f7096a98754a19a` |
| `fine-tune-all-refs.bundle` | `17a2973f8837e96e23b6853fb16eff0abe8cac8061f78ba47b4829dff9468f56` |

These files are retained in this machine, not uploaded as new repository blobs.
The baseline and its preserved archives also remain reachable in Git history.
Verify checksums before restoring; clone a bundle into a separate recovery
directory rather than resetting a working checkout.

Fetched four advertised branches and two recovery tags: 48 reachable commits.
`git log --all --diff-filter=D` found no deleted files in the available history.
At `c1dba71`, actual source moves include `apps/api` → `apps/builder-api`,
`apps/web` → `apps/builder-web`, `packages/core` → `packages/project-generator`,
and `services/agent` → `services/agent-adapter`; most source moves are byte-identical.
At `df97c6a`, documentation/evidence moves and repository-link changes are visible.
The selected repository's UI/current guides now point to `kawaho3/fine-tune`.
Commit authors, directory labels and link changes do not prove authorization or
malicious activity. No confirmed exfiltration or malicious maintained source was
identified; account compromise cannot be established or ruled out from this review.

## Complete data inventory and placement

[inventory.json](inventory.json) records every baseline tracked blob and every
recursively detected ZIP/JAR member, including directories. [path-map.json](path-map.json)
maps all inspected items and records 104 Git rename observations. Counts:

| Item | Independently counted |
| --- | ---: |
| Baseline tracked files | 115 |
| Top-level ZIPs / nested JARs | 6 / 2 |
| Archive entries, including directories | 6,940 |
| Archive files | 5,915 |
| Total inventory records | 7,055 |
| Actual decompressed bytes read/hashed | 139,261,031 |
| Duplicate SHA-256 groups | 149 |

All archive payloads were inspected as data without extraction. ZIP CRC and size,
aggregate decompression, compression-ratio, nesting and entry-count checks stay
enabled. No unsupported nested compression formats were detected. One upstream
relative symlink `OpenSandbox-main/server/CLAUDE.md` points to `AGENTS.md`; it was
read as text, never followed. Two nested Gradle-wrapper JARs are identical.

Four `.mjs.txt` snapshots contain older maintained agent/gateway source and tests.
Their public exports match baseline source; restoring them would lose later
redirect, timeout, cancellation, conversation-ID and stream-completion protections.
They are retained as evidence, not blindly renamed into runtime modules.
The large archives contain actual execution/agent infrastructure. Embedded
licenses/manifests support OpenHands SDK/Agent Server 1.62.0 (MIT, Python 3.12+)
and OpenSandbox JavaScript SDK 1.2.1 (Apache-2.0). This is not blanket ownership,
safe-integration or transitive-license proof. No upstream program was installed
or executed, and its own tests remain unrun.

The inventory's per-item feature owners, imports/exports, frameworks, duplicates
and actions are **automated static candidates**, not exhaustive manual semantic
review, authorship conclusions or behavioral verification. Full byte coverage
does not establish that every external implementation is complete or usable.
All originals remain in their appropriate existing homes; nothing was retired
based on its name. New working tools and tests have functional owners:

```text
apps/builder-api/src/{app,server,project-export}.mjs
apps/builder-api/test/{app,export}.test.mjs
apps/builder-web/public/{index.html,app.js,styles.css}
packages/project-generator/{src,test}/
services/{agent-adapter,model-gateway}/{src,test}/
tools/recovery/inventory.py
tools/runtime/check-docker.mjs
tests/{browser,recovery,runtime}/
playwright.config.mjs
docs/recovery/{REPORT.md,inventory.json,path-map.json}
```

Reproduce baseline artifacts into temporary outputs and compare before replacing:

```sh
python3 tools/recovery/inventory.py \
  --ref 4c38f0c950fb43e189e87b0b80052f6b1e14c034 \
  --output /tmp/fine-tune-inventory.json --path-map /tmp/fine-tune-path-map.json
cmp docs/recovery/inventory.json /tmp/fine-tune-inventory.json
cmp docs/recovery/path-map.json /tmp/fine-tune-path-map.json
```

The artifacts deliberately inventory the immutable starting commit. New files
are accounted for by the recovery branch's Git diff and this actual tree, avoiding
a self-referential inventory that claims to hash its own final output.

## Working features and exact test boundaries

| Feature / entry point | Implementation and checks | Result / remaining integration |
| --- | --- | --- |
| Prompt validation and static planning/files | `packages/project-generator/src/index.mjs`; `core.test.mjs`, API and browser tests | Five deterministic templates, escaped HTML; no AI planning, backend or build |
| HTTP generation and assets | `apps/builder-api/src/app.mjs`, `server.mjs`; `app.test.mjs` | Health, bounds, malformed URL/JSON, methods, security headers and allowlisted assets pass |
| Static preview and HTML download | `apps/builder-web/public/`; `tests/browser/builder.spec.mjs` | Real Chromium renders opaque script-disabled iframe; HTML equals API response |
| Complete static source export | `project-export.mjs`, POST `/api/export`, UI; `export.test.mjs` and browser suite | ZIP equals every generated file; Unicode, unsafe paths, duplicate/overlap, size/count and request failures tested; no host paths or persistence |
| Model mock/Ollama generate/stream | `services/model-gateway/src/index.mjs`; `model-gateway.test.mjs` | Mock, usage, retries, failure/EOF, completion, cancellation and byte budgets pass; live inference unrun |
| Agent lifecycle | `services/agent-adapter/src/index.mjs`; `agent.test.mjs` | Fake-server create/events/run/pause/interrupt/final response and failure contracts pass; real OpenHands remains disconnected |
| Archive recovery | `tools/recovery/inventory.py`; `tests/recovery/test_inventory.py` | Nine security tests; all baseline bytes hashed; no archive execution |
| Runtime prerequisites | `tools/runtime/check-docker.mjs`; `tests/runtime/check-docker.test.mjs` | Six unit tests pass; actual Docker resource gate fails (below); no generic executor added |
| Persistence, auth/authz, database, editing/versioning, deployment, evaluations/training | No maintained callable product implementation recovered in reviewed local source snapshots | Still future work. External archive candidates are not claimed as integrated features |

## Repairs and meaningful product improvement

Ollama previously waited for transport EOF after `done:true`, emitted post-done
deltas, and left provider work running when consumers broke iteration. The gateway
now stops on first completion, cancels readers and aborts provider work on exit.
Responses are bounded to 1 MiB JSON/text, 64 KiB per NDJSON line and 16 MiB total
stream; oversized responses fail without retry. OpenHands errors no longer echo
remote `detail`, and malformed JSON causes do not retain response excerpts.
Thirteen new adapter regressions cover these cases without disabling old checks.

The browser now exports the **complete static source project** (currently HTML and
README), retaining the original preview prompt and the existing HTML download.
In-flight generations/exports have cancellation and stale-response guards. Eight
new export tests and six browser journeys verify successful and failed workflows,
including edited prompts, output equality, hostile input, recovery and mobile use.
This improves a real supported feature; it does not pretend to be AI full-stack
generation. No paid calls, model downloads or GPU training occurred.

Dependencies are exact/locked `fflate` 0.8.3 (MIT, API) and `@playwright/test`
1.65.1 (Apache-2.0, development). Installed licenses and npm metadata were checked;
the lockfile records artifact integrity. No lifecycle hooks were enabled.
See [reuse review](../research/REUSE_AUDIT.md) and
[ADR 0007](../architecture/decisions/0007-source-export-and-readiness-gates.md).
ZIP work is synchronous but size-limited; production concurrency/abuse controls
remain future work. No external model cost or production deployment is introduced.

## Commands and results

From `/workspace/fine-tune`, Node 24.22.1, npm 11.9.0, Python 3.12.14:

```sh
npm ci --ignore-scripts --cache /workspace/.npm-cache
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run check
npm audit --json --cache /workspace/.npm-cache
git diff --check
```

Baseline before edits: **41 passed**, about 0.9 s. Current Node suite:
**68 passed, 0 failed/skipped**, about 1.1 s. Python reader: **9 passed**.
Browser suite: **6 passed**, about 10.1 s with owned server startup. Browser
coverage includes actual requests, rendered content, HTML/ZIP downloads, service
errors and recovery, opaque-frame/script restrictions, and mobile controls.
`npm ci` is repeatable; audit reports zero advisories. No standalone application
build/typecheck/lint command exists, so none is reported as executed.

The same maintained Node suite passed **68/68** under official Node **22.23.5**
in a digest-pinned Docker image, using only reviewed source/tests and installed
dependencies copied via TAR stdin: no host bind mounts, inherited credentials,
network or generated programs. After signal-handler refinement the affected
Node 22 runtime subset reran: **6/6**. Container cleanup was confirmed. This is
trusted repository-test compatibility evidence, not untrusted execution isolation.

CI now runs maintained Node tests, Python recovery tests and Playwright Chromium
journeys after a frozen install. GitHub Actions success has **not** been observed:
API access is blocked, and local passing tests do not establish remote results.

## Runtime blocker and next engineering gate

`npm run check:sandbox` (or `node tools/runtime/check-docker.mjs`) returns **exit 1**
on the actual environment. It runs only reviewed fixed probe source against:

```text
node@sha256:1314fb30ec37592d5845e5a160d522c0e680972aa534549940b8d73bde88481a
```

The official image is retained locally; on a fresh machine, use
`docker pull` with that exact digest before probing. The probe never auto-pulls or
executes generated code. Eleven filesystem/identity/network checks pass, including
non-root UID, dropped capabilities, seccomp, no-new-privileges, read-only root,
bounded noexec tmpfs, absent runtime socket, clean environment, disabled external
network and blocked metadata address. Containers are cleaned up after success,
failure, timeout and cancellation. Three measured controls fail:

| Requested | Actually observed |
| --- | --- |
| RAM ≤128 MiB | Inherited 32 GiB ceiling |
| CPU ≤0.5 core | Inherited ratio 4 |
| Processes ≤32 | Unlimited |

The rootless daemon lacks per-container cgroup enforcement. `bwrap`/`unshare`
also fail UID mapping on this machine. Do not bypass with extra privileges or
execute generated apps directly on the host. Supply a runtime with enforced
resource controls, then rerun this prerequisite probe and adversarial lifecycle
tests before adopting one execution strategy. A passing probe is necessary
evidence, not production certification. Next: real agent/workspace compatibility,
deterministic project file creation/build/test inside the selected isolation,
separate-origin preview, browser checks, cancellation/broken-build cleanup, and
complete source export; only then live inference and broader product features.

## Security and owner-required actions

Reviewed maintained code/CI and available history contain no confirmed exfiltration,
unexpected host execution or suspicious install hooks. Baseline CI Actions are
SHA-pinned with `contents: read`; no privileged pull-request trigger or secret
use was found. Secret-format scans cover 226 non-ZIP historical blobs and baseline
archive members. Three archive matches were reviewed as test/redaction/TLS fixture
material; no credential values are reproduced here or in inventory artifacts.
No usable production credential was confirmed exposed. Pattern scans are limited
and do not prove the absence of secrets or credential revocation.

Read-only native Git works through the existing proxy. GitHub API requests for
issues, PRs, runs, collaborators, deploy keys, protections and Actions permissions
are denied at CONNECT (403). Therefore the owner must verify collaborators/apps,
deploy keys, branch rules, Actions permissions, automation tokens and security
audit events in GitHub settings, revoking unexpected access and rotating any
confirmed exposed credentials through secure settings. Account-security changes
were not made or claimed; source fixes cannot secure the owner's GitHub account.

No published project license/ownership assumption was changed. No production
infrastructure or data was modified. PR creation and remote CI verification
remain unavailable through the current API route; branch/commit delivery is
reported separately in the task response.
