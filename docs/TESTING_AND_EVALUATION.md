# Testing, Benchmarking, and Definition of Done

## Two separate evaluation layers

1. **Platform engineering:** unit, integration, API contract, end-to-end, security, accessibility, performance and recovery tests.
2. **Coding-agent capability:** held-out natural-language tasks graded by runnable builds, behavioral tests, visual intent, follow-up-edit regressions, latency and cost.

## First task suite

Create 30–50 representative held-out prompts covering landing pages, dashboards, auth + profile flows, CRUD apps, API integrations with mocks, database-backed workflows, responsive layout, failure repairs and incremental modifications. Split by task and template to avoid training/test contamination.

## Primary metrics

- Build success = generated project builds without manual patches.
- Functional pass rate = required user workflows pass browser/API tests.
- End-to-end completion = project passes all required checks within bounded retries.
- First preview latency = time from prompt submission to usable preview.
- Cost per **successful** run = model, GPU, sandbox, storage and retry cost divided by completed successful tasks.
- Edit regression rate = previously passing workflows broken after a follow-up prompt.
- Safety violation rate = isolated workspace or credential policy violations.

Suggested stretch targets (not achieved): 90% build success, 80% aggregate behavioral checks, 75% end-to-end workflows on the initial bounded test suite. Calibrate to task difficulty and sample size; do not selectively report easy tasks.

## Minimum test evidence per feature

Exact commit, deterministic fixture/prompt, dependency versions, test commands, pass/fail output, screenshots or preview URLs when safe, cost/latency observations, known skips and environment.

## First vertical slice acceptance

- Create a project from a predetermined prompt.
- Agent or deterministic mocked model produces files.
- Build and tests run inside an isolated workspace with quotas.
- Preview is reachable through authorized routing.
- Export contains source and reproducible startup instructions.
- A broken build generates useful error output; retries are bounded and observable.
- Tests assert project isolation and that secrets are not included in exported artifacts.

## Anti-patterns

Don't claim completion from screenshots or model text. Don't use the same tasks for fine-tune training and public evaluation. Don't hide failures from averages. Don't declare deployment secure because a container starts.