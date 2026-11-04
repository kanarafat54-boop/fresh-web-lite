# Fresh AI — Luganda corpus review notes (2026-10-27)

**Outcome: two additional Hugging Face candidates recorded for review only. No dataset has been downloaded, authorized, ingested, or used to train Fresh AI.**

This review was performed through the connected Hugging Face integration. The candidate registry remains fail-closed: every new entry has `trainingEligible: false` and all review fields pending.

## Candidate A: Luganda Foundational Literacy and Numeracy Training Data

- Dataset: [CraneAILabs/luganda-fln-training-data](https://huggingface.co/datasets/CraneAILabs/luganda-fln-training-data)
- Dataset-card license: Apache-2.0.
- Reported scope: 1,368 examples; the card lists 590 synthetic MCQs, 600 weak-section MCQs, 123 short-form items, and 55 longer-form content examples.
- Intended use if approved: a narrowly scoped education/teacher-assistance pilot, not general pretraining.
- Rights blocker: the card says source inputs include primary-school instructional materials, textbooks, grammar guides and teacher assessments; it also describes generated bilingual content. A dataset-level Apache-2.0 label does not independently establish rights to all upstream materials. Confirm the dataset creator's authority, upstream licensing/permissions, and attribution requirements.
- Quality/safety blocker: sample and audit the synthetic and weak-section subsets; require qualified Luganda-speaking educators to review language, dialect, factual accuracy, answer keys and pedagogical safety. Avoid presenting generated teaching content as authoritative without evaluation.
- Data integrity: keep source IDs, subset names, transformations and hashes. Treat the separate subsets as related data, not independent evidence of general language competence.

## Candidate B: Luganda Sentences Corpus

- Dataset: [sagepond/luganda](https://huggingface.co/datasets/sagepond/luganda)
- Reported scope: 986,379 sentence rows in `default/train` and 8,126 paragraph rows in `paragraphs/train`.
- The card says the corpus was assembled from publicly available dumps/corpora and names Wikipedia, GlotCC-V1, Glot500 and FineWeb-2 among its sources.
- **Rights blocker:** the card explicitly states that licensing and redistribution conditions depend on the original sources. The source mix includes different licensing regimes, including CC BY-SA and ODC-By. No unified license for the entire corpus was confirmed during this inspection. Do not bulk-download or train from it until source-level provenance and license obligations can be resolved.
- Quality blocker: language identification filtering is useful but not proof that every sentence is correct, natural, non-duplicated, safe or privacy-free. Sample by source, deduplicate, detect personal/sensitive material, and obtain Luganda-speaker review.
- Intended use if approved: potentially useful for Luganda language coverage after source-level rights resolution and careful quality filtering; not a translation-pair dataset.

## Related candidate already recorded

[Lacuna Luganda Health Corpus](https://huggingface.co/datasets/aceuganda/lacuna-luganda-health-corpus) reports 38,644 English–Luganda health sentence pairs and CC BY 4.0. It remains blocked pending upstream rights/consent, privacy, safety, attribution and professional Luganda quality review. CC BY 4.0 generally allows commercial reuse with attribution, but it does not itself grant privacy/publicity rights or prove that the licensor controlled every upstream element. See the [official CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/).

## Recommended next sequence

1. Resolve rights and upstream provenance before acquisition. If permission cannot be verified, exclude the source rather than guessing.
2. Select one bounded pilot with a clear task and measurable evaluation; do not merge unrelated general text, medical translation and education data into one undifferentiated corpus.
3. Pin the immutable dataset revision, configuration and exact split; record source-file hashes and the adapter version.
4. Preserve validation/test sets. Create a separately reviewed held-out set where the source has no trustworthy split.
5. Run duplicate, privacy, harmful-content, encoding, source-provenance and language-quality checks; ask fluent Luganda reviewers to evaluate a stratified sample.
6. Only after documented authorization, use the existing fail-closed intake path. Any prepared data remains a dataset artifact, not a model checkpoint.
7. Train/evaluate only on available authorized compute, then verify held-out results, checkpoint integrity, serving and explicit promotion before changing `fresh-unified-1` from training-required.

## Explicit non-claims

This work adds discovery notes and registry records only. It does not download data, change authorization flags to passed, create model weights, create a checkpoint, or establish that Fresh AI has learned Luganda.
