# Fresh AI multimodal corpus expansion and training gates

Status: design and implementation contract; not evidence of a completed training run.

## Objective

Apply useful lessons from public descriptions of multimodal foundation-model training to Fresh AI without copying another model's private dataset, assuming rights to third-party material, or pretending a data-store import has trained model weights.

Fresh's current native training path is text input/target JSONL with a Fresh-owned tokenizer and model. Keep that path as the trusted baseline while expanding authorized data in independently testable stages.

## What can be reused from the supplied Gemini overview

These are general engineering patterns, not Google's private data:

- Curate multilingual text and technical documents with provenance and deduplication.
- Treat source code as a separate quality/security-reviewed corpus.
- Add image, audio, video, and document understanding only when the actual media asset and aligned annotation are present.
- Separate pretraining-style examples from instruction tuning, preference evaluation, safety tests, and tool-use traces.
- Use synthetic examples to fill known coverage gaps, but label them synthetic and measure them separately from externally sourced data.
- Evaluate capabilities and regressions before any checkpoint is promoted.

Do not infer that Gemini's exact data mixture, source files, or rights can be reproduced. Do not ingest private consumer interactions or paid/copyrighted material without a documented lawful basis and applicable permission.

## Dataset admission contract

Every imported record must have a stable ID, a declared modality/task, source provenance, rights/authorization evidence, review status, and a content hash. An absent or unresolved authorization is a hard rejection, not a warning.

Recommended record envelope for future modality adapters:

```json
{
  "id": "stable-source-record-id",
  "task": "image-question-answering",
  "modality": ["text", "image"],
  "input": "What is shown in this diagram?",
  "target": "A labelled flow diagram showing ...",
  "assets": [{"uri": "local-or-controlled-storage-reference", "sha256": "verified-sha256"}],
  "metadata": {
    "sourceType": "licensed | public-domain | user-authorized | internal-synthetic",
    "license": "exact license or authorization record",
    "authorizationId": "registered-authorization-id",
    "reviewStatus": "pending | approved | rejected",
    "language": "en",
    "split": "train | validation | test"
  }
}
```

This is a future adapter schema example; it is not currently accepted by the text-only native trainer until a modality-aware validator and loader are implemented. Never use a placeholder URI or fabricated hash as an actual training asset.

## Staged data plan

1. **Text and code first:** improve coverage of software engineering, science, mathematics, languages, accessibility, local/global knowledge, factual grounding, and tool safety. Use public-domain, appropriately licensed, or internally authored records with source-level rights checks. Code samples must be security-reviewed and retain applicable license notices.
2. **Instruction tuning:** add reviewed prompt/target pairs and safe tool-call examples. Train concise evidence-based explanations; do not use hidden chain-of-thought dumps as targets.
3. **Preference and safety evaluation:** maintain separate pairwise preference and adversarial evaluation sets. Do not leak evaluation answers into training.
4. **Images and documents:** require the actual image/PDF asset, hash, rights record, and aligned question/answer or region/description annotations. Keep OCR text and visual supervision linked.
5. **Audio:** require audio bytes, encoding/sample-rate metadata, transcription or task labels, language and speaker-consent/rights evidence where applicable.
6. **Video:** require a real video asset plus timestamped frame/event annotations; do not treat a video URL or text description alone as video training.
7. **Promotion:** run data validation, contamination/deduplication checks, train/validation/test separation, capability and safety evaluations, checkpoint hash verification, and serving compatibility tests. Only then may an authorized promotion process change the model status.

## Hugging Face interoperability

Hugging Face `datasets` and `transformers` may be used as optional data preparation tools, not as an authority for rights or a replacement for Fresh's tokenizer.

- Load only a locally staged, reviewed JSONL shard after Fresh's authorization validator passes.
- Pin dataset revisions and tokenizer/model revisions; avoid remote code execution and do not download an arbitrary model during a release build.
- Export only the text fields supported by the current Fresh trainer. Preserve original IDs, split, source, license, and authorization metadata in a sidecar manifest.
- Never substitute third-party token IDs for Fresh native token IDs. Tokenizer training and model training must reference the same dataset hash.
- Keep private or user-provided data out of public artifacts, logs, and test fixtures unless specifically authorized.

## Current verified boundary

The repository currently has an 83-example combined text corpus and a native tokenizer/PyTorch pipeline exercised by tests. The 37 examples derived from the user's supplied themes are internally authored synthetic examples, not copied Gemini training data. The broader training-example store count is not proof that a model has learned from those rows.

`fresh-unified-1` must remain `training-required` until an actual authorized training run, held-out evaluation, checkpoint integrity verification, native-serving test, and explicit promotion all pass. A dry run or optimizer smoke test is not a production model.
