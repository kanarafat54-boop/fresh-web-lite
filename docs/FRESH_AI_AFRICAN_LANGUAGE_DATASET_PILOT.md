# Fresh AI — African-Language Dataset Pilot

**Status: discovery and sample inspection only. No source below is authorized for training.**

This file supplements `docs/FRESH_AI_HUGGING_FACE_DATASET_CANDIDATES.md`. The hard authorization gate in `docs/FRESH_AI_CORPUS_V1_ACQUISITION.md` remains authoritative.

## First candidate to review: Luganda translation

- **Dataset:** [aceuganda/lacuna-luganda-health-corpus](https://huggingface.co/datasets/aceuganda/lacuna-luganda-health-corpus)
- **Reported license:** CC BY 4.0; verify the current card, underlying rights, attribution requirements, and suitability for commercial model training before approval.
- **Reported scope:** 38,644 English–Luganda sentence pairs, with documented review history and train/validation/test splits.
- **Observed structure:** `default/train` (~32.7K rows), `default/validation` (~2.2K), `default/test` (~2.2K), plus `flagged_and_corrected` (~1.5K).
- **Sample review:** the schema contains `translation_id`, `source_statement`, `approved_translation`, `source_language`, and `target_language`. The preview includes specialist health terminology and at least some awkward-looking translations. Require Luganda-speaking human review and terminology/quality sampling before any use.
- **Proposed use:** a bounded translation evaluation and, only after approval, a specialist translation fine-tuning experiment. Do not treat it as general-purpose Luganda knowledge.
- **Split protection:** keep validation/test rows out of training. Preserve the original test split for final evaluation; never train on the `test` split.

## Speech candidate: blocked pending technical inspection

- **Dataset:** [Professor/luganda-speech-data](https://huggingface.co/datasets/Professor/luganda-speech-data)
- **Reported license:** CC0 1.0; the card describes ~111.4 hours / 67,269 clips derived from Mozilla Common Voice 26.0.
- **Observed blocker:** Hugging Face dataset structure reported no parquet exports and the Dataset Viewer failed to generate rows. Do not ingest until files, source provenance, consent/privacy handling, audio/text alignment, and upstream terms can be independently verified.
- **Proposed use:** future Luganda ASR/TTS research only, not text-only language-model training by default.

## Swahili candidate: blocked until rights and quality are verified

- **Dataset:** [Rogendo/English-Swahili-Sentence-Pairs](https://huggingface.co/datasets/Rogendo/English-Swahili-Sentence-Pairs)
- **Observed structure:** about 210.5K rows in a single `default/train` split with English and Swahili sentence columns.
- **License:** no clear license tag was surfaced in the metadata inspected. Treat as blocked; do not download or train from it until licensing, source provenance, data quality, and split leakage are resolved. A single train split is not a substitute for a held-out evaluation set.

## Required pilot gates

1. Record an immutable dataset revision and capture the current dataset card and license evidence.
2. Complete a rights/permission review for Fresh AI's intended use, including commercial deployment and derived model artifacts.
3. Sample for language correctness, dialect/register, duplicates, harmful content, privacy issues, and encoding problems; have qualified Luganda/Swahili speakers review translations.
4. Keep source IDs and provenance in a sidecar manifest; hash source files and transformed outputs.
5. Preserve evaluation splits. Never include the held-out test set in training or tuning.
6. Run the existing Fresh corpus authorization gate before controlled acquisition or JSONL ingestion.
7. Label any experiment with dataset revision, transformation code/version, filtering rules, and exact split.
8. Do not mark `fresh-unified-1` trained or production-ready until a real training run, held-out evaluation, checkpoint integrity, serving checks, and explicit promotion all pass.

**Current outcome:** metadata and small previews were inspected via the connected Hugging Face integration. No dataset has been downloaded into Fresh Web Lite, authorized, ingested, or used for training.
