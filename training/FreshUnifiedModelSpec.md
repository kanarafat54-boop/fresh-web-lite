# Fresh Unified Model Specification v1

## Identity

- Model ID: `fresh-unified-1`
- Owner: Fresh AI
- Provider independent: yes
- External model required: no
- Status: architecture-defined / training-required

## v1 training architecture

The first executable Fresh-owned training target is a decoder-only causal language model. This is the text foundation for the unified model; multimodal encoders/decoders and action heads remain separate training stages until their contracts are implemented.

The architecture is intentionally modest for the first reproducible run so that the pipeline can be tested on accessible accelerator hardware rather than pretending a frontier-scale model can be trained from the starter corpus.

| Component | v1 target |
|---|---:|
| vocabulary | 32,000 tokens |
| context length | 2,048 tokens |
| hidden size | 512 |
| transformer layers | 8 |
| attention heads | 8 |
| feed-forward size | 2,048 |
| positional encoding | rotary (RoPE) |
| normalization | RMSNorm |
| activation | SiLU gated feed-forward |
| objective | next-token causal language modeling |
| precision | bf16 when supported |

## Tokenizer contract

Tokenizer ID: `fresh-unified-tokenizer-v1`.

The tokenizer must be trained from authorized Fresh training data and stored with a versioned vocabulary/merges artifact. No vendor tokenizer is implicitly part of the Fresh model identity.

Special tokens must include explicit beginning/end-of-sequence and padding semantics. The tokenizer artifact must be hashed and recorded in every checkpoint manifest.

## Training stages

1. data validation and provenance
2. tokenizer training
3. foundation causal-language-model pretraining
4. instruction tuning
5. reasoning and tool-use training
6. truth/verification and safety tuning
7. preference alignment
8. multimodal and agent stages
9. independent evaluation
10. serving gate

A checkpoint may not be promoted to `ready` merely because optimization completed. Evaluation, safety, provenance, and integrity gates must pass.

## Scope boundary

The 13-example synthetic starter corpus is a pipeline smoke-test fixture. It is not sufficient for meaningful pretraining. Production-quality intelligence requires a much larger authorized corpus and appropriate compute.

This specification does not copy or depend on OpenAI, Gemini, or another private model's weights or training data.
