# Reuse-First Public Repository Audit

**State:** dated research is now recorded for the two primary infrastructure candidates. The wider inventory remains an audit backlog. No component is approved solely because its repository is public.

## Decision rules

1. Reuse mature, properly licensed libraries/services in preference to inventing commodities.
2. Verify exact license + transitive obligations, maintenance, provenance, security advisories and API stability at a **pinned tag/commit**.
3. Measure integration and operational complexity; free source code can still have significant hosting, GPU or commercial runtime costs.
4. Pick **one** primary solution for an overlapping capability; add a second only on evidence.
5. Document why a component is *integrated*, *studied*, *deferred*, or *rejected*. Never clone proprietary competitors.

## Verified primary-candidate research — 16 November 2026

### OpenHands Software Agent SDK

- Upstream: https://github.com/OpenHands/software-agent-sdk
- Audited release: **v1.62.0**.
- License at that tag: **MIT**. Preserve its copyright/license notice when distributing covered software.
- Core package metadata at v1.62.0 declares Python **>=3.12** and includes the model/tool dependencies required by the SDK.
- The separately packaged `openhands-agent-server` is also v1.62.0 and exposes a FastAPI/REST/WebSocket server around the SDK.
- Intended reusable capability: agent lifecycle, conversation/event handling, tool execution, workspace integration and coding-agent orchestration.
- Product decision: **primary coding-agent candidate, not yet integrated**. Product code must depend on our own agent-session interface, with OpenHands-specific code kept in one adapter.
- Compatibility risk: current product scaffold is Node.js while the SDK core is Python. The agent-server boundary may avoid embedding Python in the product API, but this must be proven with an executable spike.
- Cost/operations risk: model inference and workspace/container execution still require separately provisioned compute and reviewed model/provider configuration.
- Security risk: tool/workspace permissions remain our responsibility at the product boundary; successful package import is not proof of safe execution.

### OpenSandbox

- Upstream: https://github.com/opensandbox-group/OpenSandbox
- Audited stable reference: **release-1.2.0**.
- License at that reference: **Apache License 2.0**. Distribution must follow its license/notice conditions; trademark rights are not granted.
- The documented JavaScript/TypeScript SDK is `@alibaba-group/opensandbox`; Python is also supported.
- Relevant reusable capability: sandbox create/connect/kill lifecycle, command execution and streaming, files, timeouts, resource limits/metrics, network policy, endpoint exposure, Docker and Kubernetes-oriented backends.
- Product decision: **primary dedicated sandbox candidate, not yet integrated**.
- Security posture: the project exposes useful controls, but “using OpenSandbox” alone is not evidence of production multi-tenant isolation. We still require non-root execution, filesystem boundaries, egress/metadata blocking, CPU/RAM/disk/time limits, preview-origin isolation, cleanup and malicious-fixture tests.
- Operations risk: production operation adds a control plane, runtime/container images and potentially Kubernetes or other infrastructure.

### OpenHands workspace vs OpenSandbox

Both projects can participate in code execution/workspace workflows, so importing both execution layers without evidence would create duplicate lifecycle ownership and more attack surface.

**Decision:** first build a narrow OpenHands agent adapter fixture and a separate workspace contract. Then test whether the selected OpenHands workspace path alone satisfies the first restricted-development milestone. Adopt OpenSandbox as the production workspace implementation only when the fixture demonstrates a concrete isolation/lifecycle advantage and a clean API boundary. Direct OpenHands ↔ OpenSandbox compatibility is **unverified**; do not invent an integration.

## Candidate inventory

| Candidate | Public source | Intended role | Current disposition |
| --- | --- | --- | --- |
| OpenHands Agent SDK | https://github.com/OpenHands/software-agent-sdk | Coding agent + tools | **Primary agent candidate**; adapter spike next |
| bolt.diy | https://github.com/stackblitz-labs/bolt.diy | UX/workflow ideas | Study; review WebContainers commercial terms |
| Dyad | https://github.com/dyad-sh/dyad | Local app-building workflow | Study; verify core vs pro licensing |
| Monaco Editor | https://github.com/microsoft/monaco-editor | Browser code editor | Integrate candidate |
| shadcn/ui | https://github.com/shadcn-ui/ui | App UI components | Integrate candidate |
| Puck | https://github.com/puckeditor/puck | Structured visual editing | Prototype candidate |
| Onlook | https://github.com/onlook-dev/onlook | Code-backed visual editing | Study/prototype alternative |
| screenshot-to-code | https://github.com/abi/screenshot-to-code | Screenshot-assisted UI creation | Study; verify image/model requirements |
| OpenSandbox | https://github.com/opensandbox-group/OpenSandbox | Isolated execution | **Primary sandbox candidate**; security/compatibility spike required |
| Better Auth | https://github.com/better-auth/better-auth | Accounts and organizations | Candidate; check integration boundary |
| PostgreSQL | https://github.com/postgres/postgres | Persistent application data | Baseline candidate |
| BullMQ | https://github.com/taskforcesh/bullmq | Async job queue | Defer until tasks require queue |
| Playwright | https://github.com/microsoft/playwright | Browser testing/screenshots | Integrate candidate |
| Ollama | https://github.com/ollama/ollama | Local model serving | First live model adapter; mock remains CI default |
| vLLM | https://github.com/vllm-project/vllm | Higher-throughput model serving | Defer until scaling evidence |
| Coolify | https://github.com/coollabsio/coolify | Deployment control plane | Defer; operate separately |
| Yjs | https://github.com/yjs/yjs | Collaborative edits | Defer until teams |
| Hocuspocus | https://github.com/ueberdosis/hocuspocus | Yjs synchronization server | Defer until teams |
| Langfuse | https://github.com/langfuse/langfuse | Trace/evaluate agent runs | Candidate; check license by component |
| OpenTelemetry JS | https://github.com/open-telemetry/opentelemetry-js | Instrumentation | Candidate |
| Unsloth | https://github.com/unslothai/unsloth | QLoRA fine-tuning | Separate training environment; check optional component licenses |
| Convex Chef | https://github.com/get-convex/chef | Full-stack builder reference | Study only; evaluate service dependency |

The complete 24-repository inventory is maintained in [RECOMMENDED_PUBLIC_REPOSITORIES.txt](RECOMMENDED_PUBLIC_REPOSITORIES.txt). Researching that inventory does **not** mean integrating all candidates.

## Mandatory audit template for an adopted dependency

- **Pinned revision / release date**
- **License and notices**, including bundled assets and optional modules
- **Commercial/cloud/runtime restrictions**
- **Maintenance and security advisories**
- **Integration APIs and upgrade boundary**
- **Hardware/hosting/runtime cost**
- **Security review and threat surface**
- **Proof-of-concept evidence and benchmarks**
- **Final decision and ADR**

## Integration ordering

Current order: provider-independent model gateway → OpenHands adapter spike → one reviewed workspace strategy → Playwright-backed vertical slice. Then Monaco/shadcn UI + database/auth. Later Puck **or** Onlook; deployment; collaboration; distributed serving; training infrastructure.

## Red flags

Wholesale merging multiple full applications; proprietary UI copying; unreviewed licenses; SaaS API locks; exposing the Docker socket; duplicative agent/sandbox layers; “free” products with required paid cloud runtimes; abandoned libraries; importing large codebases without tests.
