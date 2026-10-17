# Fresh AI user dataset intake — 2026-10-17

## What was received

The user supplied a ZIP with five example records and a Markdown template containing five more sample records. They span code, instruction tuning, hidden-reasoning traces, tool calls, multimodal UI analysis, and architecture.

## Intake decision

The raw records are retained as source material only in the conversation upload; they are **not copied verbatim into the training shard**. Some are unsuitable without transformation:
- hidden chain-of-thought style traces are excluded; targets instead teach concise rationales, assumptions, calculations, and evidence;
- privileged terminal examples are reframed around real tool availability, authorization, approval, and verified outcomes;
- insecure code patterns, including hardcoded JWT secret fallbacks, are not accepted as target behavior;
- image references without actual image assets are not treated as visual supervision;
- speculative performance guarantees and unverified claims are replaced with measured, conditional engineering guidance.

## What was added

`data/fresh-training/user-intake-curated-v1.jsonl` contains 37 reviewed synthetic instruction/response examples across software engineering, database migration, reasoning, research, agent/tool safety, architecture, UI accessibility, privacy, training, evaluation, and truthful status reporting.

The examples are internally authored synthetic examples derived from the themes of the uploaded material. They use the repository's existing internal-synthetic authorization record and do not assert third-party licensing rights for the original package.

## How to validate

Run:

```sh
node scripts/verify-fresh-user-intake-dataset.mjs
node scripts/prepare-fresh-unified-dataset.mjs data/fresh-training/user-intake-curated-v1.jsonl artifacts/fresh-training/user-intake-curated-v1.manifest.json
```

The first command checks schema, unique IDs, provenance, unsafe patterns and required domain coverage. The second generates a deterministic integrity manifest; it does not train a model or create weights.

## Runtime and training boundaries

This shard is a training/evaluation input, not a live database seed and not a model checkpoint. It can be included in a future authorized training run after evaluation and dataset composition review. It does not change the live model's status: `fresh-unified-1` remains `training-required` until real training, evaluation, checkpoint integrity, native serving, and promotion gates pass.

For same-day product availability, use the existing Fresh AI application request path and verify its configured runtime independently. Adding examples alone cannot make an untrained foundation model serve responses.
