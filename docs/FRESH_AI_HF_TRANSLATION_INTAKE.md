# Fresh AI — Hugging Face translation intake adapter

## Purpose

This adapter prepares a locally exported Hugging Face translation split for Fresh AI's native JSONL format. It is deliberately fail-closed and does not download data, change authorization, train weights, or promote a model.

## First candidate

- Dataset: [aceuganda/lacuna-luganda-health-corpus](https://huggingface.co/datasets/aceuganda/lacuna-luganda-health-corpus)
- Candidate registry ID: `hf-aceuganda-lacuna-luganda-health-corpus`
- Intended pilot: English-to-Luganda specialist health-text translation, not general-purpose Luganda knowledge.
- Reported license: CC BY 4.0; verify current license text, upstream rights, attribution, and commercial model-training permission before authorizing.
- Observed sample schema: `translation_id`, `source_statement`, `approved_translation`, `source_language`, `target_language`.
- Reported splits: 32,710 train rows, 2,237 validation rows, 2,237 test rows, plus 1,460 flagged-and-corrected rows outside the benchmark split. Both English→Luganda and Luganda→English directions are present.
- The dataset card says source material includes interviews, study documents/consent forms, PLABA, public Ministry of Health guidance, and public dialogues; much Luganda text is post-edited machine translation. Review upstream rights/consent and provenance, not only the top-level CC BY 4.0 label.
- Reported splits: train, validation, and test. Only train can be transformed for training. Keep validation/test held out.

## Authorization gates

The candidate remains `review-required` and `trainingEligible: false` until all of the following are recorded in the repository's candidate and authorization registries:

1. Rights review confirms the intended Fresh AI use, including commercial training and derivative model artifacts.
2. Privacy and safety review pass.
3. Luganda-speaking quality review passes for the dataset and the intended sample.
4. The authorization registry contains a distinct eligible record bound to this candidate, with verified training, commercial-training, and derivative-model permission.
5. The authorization evidence reference and source-license evidence URL match the candidate registry.

The adapter accepts the dataset's native CSV export or a JSONL export and parses it only after the authorization checks pass. It filters to English-to-Luganda rows and records how many reverse-direction pairs were skipped. The adapter refuses to transform the dataset unless the candidate and authorization records satisfy those gates. It requires an immutable 40-character dataset revision, the reviewed config, and `--split train`. It checks IDs, duplicate rows, row count, text length, and any embedded split field. The pilot keeps only English-to-Luganda rows; reverse Luganda-to-English rows are counted in the manifest and excluded rather than mixed into the target direction.

## Example after approval only

```sh
node scripts/prepare-fresh-hf-translation-dataset.mjs \
  --dataset /path/to/authorized-train.csv \
  --output artifacts/fresh-training/luganda-health-train.jsonl \
  --manifest artifacts/fresh-training/luganda-health-train.manifest.json \
  --dataset-id aceuganda/lacuna-luganda-health-corpus \
  --candidate-id hf-aceuganda-lacuna-luganda-health-corpus \
  --authorization-id <approved-authorization-id> \
  --revision <immutable-40-character-commit-sha> \
  --config default \
  --split train
```

The command produces a Fresh-native JSONL shard and a hash/provenance manifest. The manifest always has `productionTrainingEligible: false`, `weightsCreated: false`, and `checkpointCreated: false`. Any later training run must independently pass the existing corpus authorization, evaluation, checkpoint integrity, serving, and promotion gates.

## Current state

The dataset card and a small number of rows were inspected through the connected Hugging Face integration. No third-party dataset has been downloaded or authorized. The automated test asserts that the current review-required candidate cannot produce an output file or manifest.
