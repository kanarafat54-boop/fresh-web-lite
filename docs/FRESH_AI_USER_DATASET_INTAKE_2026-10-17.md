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

`data/fresh-training/user-intake-curated-v1.jsonl` contains 37 reviewed synthetic instruction/response examples across software engineering, database migration, reasoning, research, agent/tool safety, architecture, UI accessibility, privacy, training, evaluation, and truthful status reporting. `data/fresh-training/fresh-unified-expanded-v1.jsonl` combines these with the 46 authorized starter examples for an 83-example training-pipeline corpus.

The examples are internally authored synthetic examples derived from the themes of the uploaded material. They use the repository's existing internal-synthetic authorization record and do not assert third-party licensing rights for the original package.

## How to validate

Run:

```sh
node scripts/verify-fresh-user-intake-dataset.mjs
node scripts/prepare-fresh-unified-dataset.mjs data/fresh-training/user-intake-curated-v1.jsonl artifacts/fresh-training/user-intake-curated-v1.manifest.json
```

The first command checks schema, unique IDs, provenance, unsafe patterns and required domain coverage. To exercise the combined native Fresh path, run `npm run test:fresh-expanded-corpus`: it validates the 83-example combined corpus, formats an optional Hugging Face text export, trains the canonical Fresh tokenizer against the exact combined corpus, runs the PyTorch model in dry-run mode, and prepares an authorized run record. The test must not create model weights. The Hugging Face adapter is optional and uses local-only tokenizer loading; Hugging Face token IDs must not be substituted for Fresh native token IDs.

## Runtime and training boundaries

This shard is a training/evaluation input, not a model checkpoint. The 37 curated examples were also imported into the existing live `public.fresh_ai_training_examples` table using `source = user-intake-curated-v1`, `dataset_version = user-intake-curated-v1`, stable `labels.example_id` values, and an idempotent insert guard. The post-import query verified 175 total examples and exactly 37 unique intake IDs. The live `/api/ai/status` endpoint then returned HTTP 200 and reported `trainingExamples: 175`. These rows are available to the existing training-example store; this does not mean the live model has learned from them or that inference uses them as retrieval context. The new native training path now accepts the combined corpus only after each row matches the fail-closed authorization registry, including the curated examples’ `authorizationId`. `fresh-unified-1` remains `training-required` until real training, evaluation, checkpoint integrity, native serving, and promotion gates pass.

For same-day product availability, use the existing Fresh AI application request path and verify its configured runtime independently. Adding examples alone cannot make an untrained foundation model serve responses.
