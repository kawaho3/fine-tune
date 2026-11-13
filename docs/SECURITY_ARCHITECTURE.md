# Security Architecture and Threat Model

**Status:** requirements to implement and verify; not an audited secure design.

## Trust boundaries

1. Public users / browsers → product API.
2. Product API and identity service → database / control plane.
3. Agent and model tool results → sandbox orchestration.
4. Untrusted generated code and its dependencies → isolated execution workspace.
5. Sandbox preview service → authenticated proxy → user's browser.
6. Approved deployment worker → customer deployment destination.
7. Training data collector → opt-in sanitized dataset store.

## Main threats

- Prompt injection or malicious dependencies causing tool misuse or data theft.
- Generated code escaping containers or contacting internal metadata/admin services.
- Cross-tenant project, preview, artifact, or chat data exposure.
- Secrets leaking through logs, tool outputs, model prompts, browser previews or Git exports.
- SSRF, remote shell command abuse, supply-chain compromise and excessive GPU/CPU/network spending.
- Unauthorized deploys, destructive migrations, data loss and compromised OAuth tokens.

## Control requirements

- **Isolation:** separate execution identity, ephemeral restricted filesystem, non-root process, resource/timeout quotas, strict network egress, blocked metadata/control-plane addresses. Evaluate stronger VM isolation for multi-tenant untrusted workloads. Docker defaults alone are not proof of security.
- **Authorization:** enforce tenant/project membership on every API, snapshot, preview, event stream, tool call and deployment; test IDOR/access bypasses.
- **Credentials:** separate deployment/runtime/user tokens; secret manager; short-lived scoped tokens; never expose platform secrets in a generated project's environment.
- **Agent permissions:** explicit tool allowlist, limits on command execution and file paths; approval gates for external write actions, billing, deployments, data deletion and production migrations.
- **Supply chain:** pin dependencies, review licenses, scan lockfiles/images, sandbox package scripts and verify provenance when possible.
- **Observability:** redact sensitive fields; retain audit trails and usage cost events; alert on resource spikes and forbidden egress.
- **Data policy:** document retention, deletion, encryption, backups, opt-in training and licensing before customers onboard.
- **Browser isolation:** sandbox previews under separate origins/domains, CSP, authenticated access, no privileged cookies shared with main app.

## Security test plan

Negative cross-tenant authorization tests; egress/SSRF and metadata-block tests; CPU, RAM and disk exhaustion tests; malicious package script fixture; prompt-injection fixture; secret leak scans; preview origin tests; destructive action approval tests; backup/restore exercise.

## Release gates

No public deployment of arbitrary code execution until isolation and authorization tests pass and a security review is completed. Red-team and incident response procedures are required before accepting real customer data.