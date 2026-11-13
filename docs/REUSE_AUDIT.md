# Reuse-First Public Repository Audit

**State:** initial candidate inventory, NOT a finished technical/license/security audit. Candidate links and intended uses are supplied so Codex can verify current upstream versions and licenses before integration. No integration is approved solely by appearing here.

## Decision rules

1. Reuse mature, properly licensed libraries/services in preference to inventing commodities.
2. Verify exact license + transitive obligations, maintenance, provenance, security advisories and API stability at a **pinned tag/commit**.
3. Measure integration and operational complexity; free source code can still have significant hosting, GPU or commercial runtime costs.
4. Pick **one** primary solution for an overlapping capability; add a second only on evidence.
5. Document why a component is *integrated*, *studied*, *deferred*, or *rejected*. Never clone proprietary services.

| Candidate | Public source | Intended role | Initial disposition |
| --- | --- | --- | --- |
| OpenHands Agent SDK | https://github.com/OpenHands/software-agent-sdk | Coding agent + tools | **Evaluate first**, adapter dependency |
| bolt.diy | https://github.com/stackblitz-labs/bolt.diy | UX/workflow ideas | Study; review WebContainers commercial terms |
| Dyad | https://github.com/dyad-sh/dyad | Local app-building workflow | Study; verify core vs pro licensing |
| Monaco Editor | https://github.com/microsoft/monaco-editor | Browser code editor | Integrate candidate |
| shadcn/ui | https://github.com/shadcn-ui/ui | App UI components | Integrate candidate |
| Puck | https://github.com/puckeditor/puck | Structured visual editing | Prototype candidate |
| Onlook | https://github.com/onlook-dev/onlook | Code-backed visual editing | Study/prototype alternative |
| screenshot-to-code | https://github.com/abi/screenshot-to-code | Screenshot-assisted UI creation | Study; verify image/model requirements |
| OpenSandbox | https://github.com/opensandbox-group/OpenSandbox | Isolated execution | Compare with SDK workspace strategy |
| Better Auth | https://github.com/better-auth/better-auth | Accounts and organizations | Candidate; check integration boundary |
| PostgreSQL | https://github.com/postgres/postgres | Persistent application data | Baseline candidate |
| BullMQ | https://github.com/taskforcesh/bullmq | Async job queue | Defer until tasks require queue |
| Playwright | https://github.com/microsoft/playwright | Browser testing/screenshots | Integrate candidate |
| Ollama | https://github.com/ollama/ollama | Local model serving | Baseline local candidate |
| vLLM | https://github.com/vllm-project/vllm | Higher-throughput model serving | Defer until scaling evidence |
| Coolify | https://github.com/coollabsio/coolify | Deployment control plane | Defer; operate separately |
| Yjs | https://github.com/yjs/yjs | Collaborative edits | Defer until teams |
| Hocuspocus | https://github.com/ueberdosis/hocuspocus | Yjs synchronization server | Defer until teams |
| Langfuse | https://github.com/langfuse/langfuse | Trace/evaluate agent runs | Candidate; check license by component |
| OpenTelemetry JS | https://github.com/open-telemetry/opentelemetry-js | Instrumentation | Candidate |
| Unsloth | https://github.com/unslothai/unsloth | QLoRA fine-tuning | Separate training environment; check optional component licenses |
| Convex Chef | https://github.com/get-convex/chef | Full-stack builder reference | Study only; evaluate service dependency |

## Mandatory audit template (one entry per adopted dependency)

- **Pinned revision / release date:** TBD.
- **License and notices (including bundled assets, optional modules and network-service obligations):** TBD.
- **Commercial, cloud/runtime licensing restrictions:** TBD.
- **Maintenance, security advisories, and release activity:** TBD.
- **Integration APIs, upgrades, hosting and data portability:** TBD.
- **Hardware/hosting/runtime costs and operational burden:** TBD.
- **Security review and threat surface:** TBD.
- **Proof-of-concept evidence and benchmarks:** TBD.
- **Final decision, owner, and recorded ADR:** TBD.

## Integration ordering

First: agent SDK + one sandbox strategy + Playwright + a minimal model adapter. Then: Monaco/shadcn UI + database/auth. Later: Puck OR Onlook; deployment; collaboration; distributed serving; training infrastructure.

## Red flags

Wholesale merging multiple full applications; proprietary UI copying; unreviewed licenses; SaaS API locks; exposing the Docker socket; duplicative agent/sandbox layers; “free” products with required paid cloud runtimes; abandoned libraries; importing large codebases without tests.

**Next action:** Codex should produce a verified, dated assessment with pinned commits, citations and integration spikes. This document is an audit backlog, not a substitute for that verification.