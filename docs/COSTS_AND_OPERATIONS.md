# Credit, Infrastructure, and Operations Strategy

## Core constraint

Minimize unnecessary Codex Astra usage and external API costs. Open-source software may have zero license fee but requires hosting, maintenance, support and sometimes paid commercial runtimes.

## Reuse-first budget policy

- Before implementing a commodity feature, compare existing libraries with a short license/maintenance/security/total-cost audit.
- Measure **hours and tokens spent on integration** versus building internally.
- Avoid simultaneously implementing duplicate editors, agent engines, sandboxes and auth systems.
- Build thin adapters and one testable vertical slice instead of giant speculative scaffolds.
- Use mock/local models in automated CI; use paid providers only when explicitly approved and metered.
- Preserve working code and test evidence; avoid repeated rewrites.

## Costs to track per project/run

Model input/output tokens and inference compute; agent iteration/retry count; sandbox runtime CPU/RAM/disk; package bandwidth; preview hosting; database/object storage; logs/traces; deployment build/runtime; support and abuse costs. Keep platform cost distinct from customer deployment cost.

## Operational controls before public launch

- Queue concurrency and workspace TTL caps.
- Per-user and per-organization usage quotas.
- Task timeouts, spending ceilings and cancellation.
- Metrics/dashboards for failure types, build time and per-success cost.
- Secure secrets storage, backups, rollback, status pages and incident escalation.
- Capacity planning for preview traffic and inference load.

## Pricing

Not decided. Do not claim a “free forever” public service or reliable GPU cost from open-source licensing alone. Compare local owned hardware versus rented GPU once workload is known.

## Codex workflow

Use a two-step process: first a **read-only architecture/reuse audit**, then a narrowly scoped implementation issue with explicit tests. Ask Codex to report files changed, dependencies used, commands run, failures, cost implications and follow-up tasks rather than repeatedly rebuilding entire modules.