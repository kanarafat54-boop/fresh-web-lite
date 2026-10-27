# Fresh AI — Hugging Face Dataset Intake Candidates

**Status: discovery only. No source in this document is authorized for training.**

This registry proposes Hugging Face datasets for review against the existing Fresh AI corpus intake gate in `docs/FRESH_AI_CORPUS_V1_ACQUISITION.md`. Public visibility or a dataset card's license label is not, by itself, project-specific authorization.

## Candidate registry

| ID | Dataset | Proposed role | Known considerations | Initial status |
|---|---|---|---|---|
| HF-FW-FINEWEB | [HuggingFaceFW/fineweb](https://huggingface.co/datasets/HuggingFaceFW/fineweb) | General text pretraining candidate | Dataset card reports ODC-By 1.0; very large (reported 18.5T+ tokens). CommonCrawl terms, attribution obligations, data quality, privacy, harmful content, and acquisition/storage cost require review. Do not download the full corpus as a first step. | review-required / blocked |
| HF-H4-ULTRACHAT-200K | [HuggingFaceH4/ultrachat_200k](https://huggingface.co/datasets/HuggingFaceH4/ultrachat_200k) | Conversational instruction-tuning candidate | Dataset card reports MIT; roughly 1.62 GB repository data. Verify the current card, source-data terms, provenance, synthetic-response quality, safety, and intended commercial use before approval. | review-required / blocked |
| HF-CAIS-MMLU | [cais/mmlu](https://huggingface.co/datasets/cais/mmlu) | Held-out evaluation only | Dataset card reports MIT and 57 subject areas. Keep evaluation splits out of training to reduce benchmark contamination; verify split policy and permitted use. | evaluation-candidate; not training |
| HF-BIGCODE-STACK-DEDUP | [bigcode/the-stack-dedup](https://huggingface.co/datasets/bigcode/the-stack-dedup) | Code-model research candidate | Multi-terabyte scale; access requires acknowledging terms/contact sharing. Original repository licenses and attribution obligations apply; sensitive data and malicious code risks remain. Select only reviewed, relevant subsets. | review-required / blocked |

## Recommended order

1. **Start with a small, permitted pilot**, not a full web-scale download. Prefer a dataset whose current terms and provenance can be reviewed and whose storage/compute requirements fit the project.
2. Review UltraChat as a potential instruction-tuning source; review FineWeb only for a later pretraining plan. These have different purposes and should not be blindly concatenated.
3. Keep MMLU as a held-out evaluation set, not a training source.
4. Treat The Stack as a later, opt-in code dataset due to scale, license obligations, and access conditions.
5. Add dedicated multilingual/African-language data only after checking language coverage, rights, provenance, and quality. Do not infer Ugandan-language coverage from an English-heavy corpus.

## Required gate before any download is promoted into training

For each exact dataset revision/configuration/split, record:

- Hugging Face dataset ID, revision/commit, configuration, and split
- dataset card URL and date reviewed
- license and upstream/source-data terms, with evidence URLs
- whether the intended Fresh AI use (including commercial use, fine-tuning, and redistribution of derived artifacts) is permitted
- access/consent requirements and acquisition method
- privacy/PII, harmful-content, security, and quality assessments
- filtering/deduplication procedure and train/validation/test separation
- dataset size, expected storage, checksum/content hash, and transformation version
- reviewer and explicit authorization decision

Only after the existing Fresh authorization registry records an approved decision may ingestion feed the canonical Fresh JSONL preparation pipeline. Preserve source metadata in a sidecar manifest; never discard provenance during text conversion. Do not copy third-party tokenizer IDs into Fresh's native training pipeline.

## Operational note

This is a candidate registry, not a claim that datasets have been downloaded, authorized, ingested, or used to train `fresh-unified-1`. Model status must remain `training-required` until an authorized training run, held-out evaluation, checkpoint-integrity checks, serving test, and explicit promotion all pass.
