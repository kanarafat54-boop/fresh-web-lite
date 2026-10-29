# fresh-unified-1: training run 3 (2026-10-29)

**Status: completed. Not promoted. `weightsStatus` stays `training-required`.**

First training run that is more than a pipeline test: 49.9M-parameter decoder (RoPE, RMSNorm, SwiGLU), from-scratch weights, Fresh's own byte-level BPE tokenizer (v2), trained only on the authorized, screened mix. No outside model, pretrained vocabulary or weights.

## Setup
| Item | Value |
|---|---|
| Data | 97,383 train / 1,568 validation rows (oasst1-screened, Dolly-screened, Swahili + English Wikipedia, Fresh's own data x20) |
| Tokens | 32.3M train, 0.54M validation; 96.7M seen (3 epochs) |
| Hardware | Kaggle, one T4 (of T4 x2), fp16, `torch.compile`; ~5.9k tokens/s; 4.5 h |
| Mix hash | `44b48cf3...c04f`; train.bin `2aa79c88...9a69` (identical on Colab and Kaggle: reproducible) |
| Checkpoint | SHA-256 `298b558e...c25d` (191 MB, held outside git) |

## Results (held-out validation)
| Step | Val loss | Perplexity |
|---|---:|---:|
| 200 | 5.50 | 244 |
| 400 | 4.76 | 117 |
| 600 | 4.37 | 79 |
| 800 | 4.08 | 59 |
| 1000 | 3.90 | 49 |
| 1200 | 3.81 | 45 |
| 1400 | 3.75 | 43 |
| 1476 | **3.74** | **42.0** |

Run 2 (same data, bad initialization, step-1 loss 480): final perplexity 356. Run 3 fixed the initialization (step-1 loss 10.47) and reached 42.0. Train loss 3.54 vs validation 3.74: mild overfitting; gains were flattening, so more epochs on this corpus would help little. More and cleaner data is the lever.

## What the model can and cannot do
Samples are fluent-looking English, Spanish and Swahili in Wikipedia/chat style. They are **not correct or on-topic**: asked what Fresh Web Lite is, it answers in Spanish nonsense; asked to write about Uganda in Swahili, it produces a list about the DR Congo. It has no reliable knowledge, no instruction-following quality, and no safety or truthfulness behavior.

## Gates still open (from FRESH_AI_READINESS_AUDIT.md)
Larger lawful corpus; held-out capability, truth/grounding and safety evaluation; native serving backend; checkpoint registration; explicit promotion. Nothing here changes product behavior: Fresh AI continues to answer from its knowledge-first, truth-gated platform path.
