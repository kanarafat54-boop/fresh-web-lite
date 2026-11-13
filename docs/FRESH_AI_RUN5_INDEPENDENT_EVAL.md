# Fresh Unified Run 5 — independent evaluation protocol

**Status: preparation only.** Run 4 is not promoted. Do not overwrite Run 3 or Run 4 artifacts.

## Why Run 5 must be rebuilt

Run 4's recall result is contaminated: evaluation references were present among training targets even though question strings and IDs differed. The corrected generator partitions complete normalized answer groups before creating question templates. The training-mix builder also groups validation rows by normalized target content.

This protocol adds a final-corpus leakage audit. The audit must be run against the exact training mix that will be tokenized—not merely against the Fresh-docs source file.

## Run 5 data preparation (Kaggle GPU notebook)

Use the PR branch containing the answer-disjoint generator and split fixes. Pin the notebook to the reviewed commit rather than pulling an unreviewed moving branch:

```bash
git clone https://github.com/kanarafat54-boop/fresh-web-lite.git
cd fresh-web-lite
git checkout 36db696e16567d9d4505f38b07d3bbfdcf0c14b9
npm ci
node scripts/generate-fresh-knowledge-sft.mjs
npm run test:fresh-knowledge-sft
```

Build the SFT mix, then audit the complete train set against held-out recall references:

```bash
python3 training/build_training_mix.py \
  --recipe training/mix_recipe_sft_v1.json \
  --out-dir /kaggle/working/fresh-run5-data/mix

python3 training/audit_fresh_eval_leakage.py \
  --train /kaggle/working/fresh-run5-data/mix/train.jsonl.gz \
  --recall-eval data/fresh-eval/fresh-knowledge-recall-v1.jsonl \
  --out /kaggle/working/fresh-run5-data/recall-leakage-audit.json
```

**Stop if the audit fails or reports any answer overlap.** Preserve the JSON report and SHA-256 values. Do not train on a failed split.

Create a tokenizer from the final training split only, then encode both splits:

```bash
python3 training/fresh_tokenizer_v2.py train \
  --mix-train /kaggle/working/fresh-run5-data/mix/train.jsonl.gz \
  --output /kaggle/working/fresh-run5-data/tokenizer-v2.json

for split in train validation; do
  python3 training/fresh_tokenizer_v2.py encode \
    --tokenizer /kaggle/working/fresh-run5-data/tokenizer-v2.json \
    --input /kaggle/working/fresh-run5-data/mix/${split}.jsonl.gz \
    --output /kaggle/working/fresh-run5-data/${split}.bin
done
```

## Training controls

- Use the verified Run 3 checkpoint as the sole initialization; never use Run 4 as the base for this corrective comparison.
- Verify the Run 3 checkpoint SHA-256 is exactly `298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d` before loading it.
- Verify the tokenizer identity/hash and model tensor compatibility.
- Preserve the full training log, run config, dataset manifest, leakage audit, checkpoint manifest and SHA-256.
- Do not overwrite Run 3/Run 4 files. Store the candidate under a distinct `fresh-unified-1-run5` output directory.
- Run a short smoke test before the full optimizer run. A completed notebook cell is not proof of a successful training run.

The exact step count, learning rate and replay balance must be selected from the measured mix size and GPU budget. Do not copy Run 4's settings blindly: Run 4 increased perplexity on all four measured general-data groups.

## Evaluation required before any promotion

Evaluate Run 3 and Run 5 with the same tokenizer, same answer-disjoint recall set, same per-source held-out validation set, same decoding settings and same code version. Record:

1. answer-level leakage audit: zero overlap;
2. Fresh factual recall with source-aware scoring (not keyword recall alone);
3. English and Swahili retention/perplexity by source;
4. truthfulness, citation/grounding and calibrated abstention;
5. instruction following, multi-turn consistency and tool-use behavior;
6. safety and privacy regression suites;
7. native inference compatibility, latency, memory and failure behavior.

A candidate must not be promoted merely because train loss falls or Fresh recall rises. Any statistically or operationally meaningful retention regression blocks promotion until explained and corrected.

## Current release decision

Run 4 remains experimental. Run 5 is not authorized for production until the independent evaluation, safety, grounding, capability and native-serving gates pass and the owner explicitly approves promotion. Production `weightsStatus` remains `training-required`.
