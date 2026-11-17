# Developer Onboarding

## Where we are

The first Phase-0 offline mock prototype can now be run locally; it is **not an AI agent**. If you are new, your highest-value contribution is to verify candidates, improve requirements and tests, or work on the real-agent milestones.

## First 30 minutes

1. Read [README](../../README.md), [PROJECT_CHARTER](../product/PROJECT_CHARTER.md), [IMPLEMENTATION_STATUS](IMPLEMENTATION_STATUS.md) and [ROADMAP](../product/ROADMAP.md).
2. Read [ARCHITECTURE](../architecture/ARCHITECTURE.md), [REUSE_AUDIT](../research/REUSE_AUDIT.md) and [SECURITY_ARCHITECTURE](../security/SECURITY_ARCHITECTURE.md).
3. Read [CONTRIBUTING](../../CONTRIBUTING.md), [AGENTS](../../AGENTS.md) and [ownership/license policy](../legal/OWNERSHIP_AND_LICENSES.md).
4. Pick a small [issue](https://github.com/kawaho3/fine-tune/issues) with measurable acceptance criteria.
5. If proposing a new major dependency, add verification evidence to the reuse audit and record an ADR.

## Local quickstart (Phase-0 mock)

Requires Node.js 22+ and npm 10+; no paid model calls. The API uses locked `fflate` for ZIP export; Playwright is a development dependency.

```bash
npm ci --ignore-scripts
npm test
npm run dev
```

Open http://127.0.0.1:3000. The UI generates static HTML templates; it does **not** use an LLM, execute arbitrary code, or persist projects. See [MOCK_PROTOTYPE.md](MOCK_PROTOTYPE.md) for endpoint details and limitations.

Maintained tests use scoped root-script paths so archived JavaScript cannot
enter test discovery. `npm run test:recovery` requires Python 3.12+;
`npm run test:browser` uses Playwright Chromium (run `npx playwright install chromium`
once, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` for an installed browser).
`npm run check` runs all three. Do not unpack upstream archives or run bare test
discovery over preserved material. Complete source ZIP and HTML downloads are
available for the static preview; no generated programs are executed. Ollama and Agent Server endpoint URLs must
be final endpoints: both adapters reject HTTP redirects.

For the current file/feature locations, dependency boundaries, active constraints
and remaining work, read [CONTINUATION.md](CONTINUATION.md). The earlier
[NEXT_DEVELOPER_INSTRUCTIONS.txt](../../AnalyseFuture/history/recovery-reports/handoff/NEXT_DEVELOPER_INSTRUCTIONS.txt)
is a preserved pre-reorganization report and uses historical paths.
The detailed vision is
[PROJECT_VISION_AND_FUTURE_ROADMAP.txt](../product/PROJECT_VISION_AND_FUTURE_ROADMAP.txt).
Production deployment is not implemented; `npm start` starts the local mock only.

## How to decide what to build

Use the [PRD](../product/PRODUCT_REQUIREMENTS.md) acceptance IDs and [roadmap](../product/ROADMAP.md). Implement one complete task, with tests and changed status, instead of building all screens with no running backend.

## Definition of a good contribution

It solves a scoped issue; has evidence of correct behavior; includes failure cases, security and license considerations; fits the architecture; and leaves enough documentation that a different developer can maintain it.

## Getting help

Open an issue with background, actual vs expected results, reproduction steps, screenshots/logs with secrets removed, and the relevant commit SHA.
