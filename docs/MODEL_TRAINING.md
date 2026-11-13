# Model Strategy and Future Fine-Tuning

## Do not fine-tune first

The product needs a reliable agent loop, tool integration, sandboxed execution and held-out task evaluation **before** training. Prompting/retrieval/tooling improvements can outperform a poor fine-tune and cost less.

## Candidate baselines

Evaluate licensed open-weight coding models such as Qwen2.5-Coder-7B-Instruct and newer Qwen coding-capable models, with current license, GPU requirements, context size and benchmark results verified at selection time. Ollama can serve local prototypes; vLLM is a production serving candidate. There is **no selected or downloaded model yet**.

## Training data principles

Record whole, permitted engineering trajectories rather than code-only completions: user request, accepted plan, model/tool interactions, code diffs, test commands, error outputs, verified fixes and final acceptance. Obtain user permission before training on any customer content. Keep private code, secrets, credentials and licenses with restricted terms out of training sets.

Suggested initial experiment: curate hundreds to a few thousand high-quality *consented and verified* trajectories, starting small; the quantity is a hypothesis, not a proven threshold.

## Proposed dataset record

- Task ID and stack/task category.
- Initial request and allowed design references.
- Environment/template versions and dependency lockfile.
- Tool calls and sanitized output.
- Patch/diff and run outcome.
- Build/test evidence and human quality assessment.
- License/provenance/consent metadata.
- Split identifier (train, validation or sealed test).

Prefer JSONL or structured records with schema versioning. Redact PII/secrets and actively detect duplicated or leaked benchmark tasks.

## Training approach

1. Establish baseline success rate, cost, latency and repair behavior.
2. Build high-quality examples from authorized projects and reviewed synthetic tasks.
3. Hold out test tasks by project/template and prevent near-duplicate leakage.
4. Train a QLoRA adapter (e.g. Unsloth/PEFT), not a base model from scratch.
5. Compare baseline vs adapter under the **same** sandbox, prompts and budgets.
6. Gate deployment on gains without security, cost or regression deterioration.
7. Publish an internal model card: data provenance, scope, limits and evaluation results.

## Hardware and cost

Training requires a suitable GPU and memory. A normal Codex Cloud coding environment should be used to write the pipeline, **not assumed** to support GPU training. Cost estimates require a chosen model, sequence length, GPU, duration and dataset size.

## Model safety and rights

Do not assume an open-weight license automatically permits every commercial redistribution or fine-tuning use. Validate base-model license and dataset rights for each experiment. Never use models to exfiltrate workspace secrets.