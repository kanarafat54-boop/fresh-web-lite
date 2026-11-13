# Fresh Unified 1 — Run 4 audit (2026-11-13)

## Decision

**Training execution completed; checkpoint remains an experimental candidate and is not approved for production serving.** Preserve Run 3 and Run 4 artifacts. Do not change the runtime model status or checkpoint configuration on the strength of this run.

## Artifact identity

- Run: `fresh-unified-1-run4`
- Base checkpoint SHA-256: `298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d` (Run 3)
- Run 4 checkpoint SHA-256: `1eb0ef647755cb0d0f67d67bdedfa8a4489cb884c2584d1c6dc0d5b3c1c32538`
- Tokenizer SHA-256: `dc820bac32dd5f3bc0b47eac545d4baa33cde93da05014b2d90d0903b0c7b06c`
- Parameters: 49,947,136 (architecture and tensor names/shapes preserved)
- Steps: 654 / 654
- Tokens seen: 21,430,272
- Final train loss: 2.732230
- Held-out language-model loss: 3.632761; perplexity: 37.8171
- Execution: CUDA; notebook completion record: 2026-11-13T18:26:31

The audit's technical integrity gates passed: base and tokenizer hashes, checkpoint hash/manifest agreement, tensor compatibility, finite weights/losses, exact planned step count, and matching before/after evaluation configuration.

## Evaluation results and limitations

The before/after evaluation used the same 428 Fresh recall prompts and same evaluation settings:

| Measure | Run 3 baseline | Run 4 |
|---|---:|---:|
| Mean keyword recall | 0.00555 | 0.22939 |
| Keyword pass rate | 0.0% | 19.39% |
| Dolly perplexity | 52.93 | 56.95 |
| OASST1 perplexity | 32.24 | 35.91 |
| English Wikipedia perplexity | 48.03 | 52.90 |
| Swahili Wikipedia perplexity | 20.01 | 21.80 |

The recall change is **not an independent generalization result**. The leakage audit found 428/428 evaluation references identical to training targets, even though question strings and IDs were disjoint. Treat the recall score as contaminated and do not use it as a promotion metric.

All four measured general-data perplexities increased after Run 4. This is a regression signal requiring investigation; the SFT run must not be described as a general capability improvement. These perplexities are paired before/after on the Run 4 evaluation files and must not be compared directly with Run 3's older manifest metric.

The evaluation did not cover safety, truthfulness/abstention, instruction following, tool use, or production serving.

## Corrective engineering

1. Split Fresh documentation facts by normalized answer body before generating question templates. Entire answer groups must be assigned to train or held-out evaluation, never both.
2. Group the general training mix's train/validation split by normalized target content instead of question row ID.
3. Add automated tests proving normalized answer groups cannot cross splits.
4. Rebuild the data, run a leakage audit against the exact final training corpus, and publish hashes before any further training.
5. Run independent capability, factuality, abstention, instruction-following, safety, English and Swahili retention evaluations on Run 3 and future candidates.
6. Investigate replay balance, learning rate, SFT duration, and optimizer behavior before planning Run 5.

## Runtime status

The application model contract remains `fresh-unified-1` with `weightsStatus: training-required`. Run 4 is not registered or served. Promotion still requires independent held-out evaluations, safety/grounding review, checkpoint registration, a verified native serving backend, inference smoke tests, and explicit approval.
