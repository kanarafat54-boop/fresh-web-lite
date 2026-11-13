# Fresh Unified Run 5 — independent evaluation protocol

**Status: preparation only.** Run 4 is not promoted. Do not overwrite Run 3 or Run 4 artifacts.

## Why Run 5 must be rebuilt

Run 4's recall result is contaminated: evaluation references were present among training targets even though question strings and IDs differed. The corrected generator partitions complete normalized answer groups before creating question templates. The training-mix builder also groups validation rows by normalized target content.

The final-corpus leakage audit checks held-out recall answers against BOTH the exact training split and the validation split. Run it only after the final mix is built, and before tokenization or training.

## Run 5 data preparation (Kaggle GPU notebook)

The ready-to-run notebook is [`training/notebooks/fresh_unified_training_run5_kaggle.ipynb`](../training/notebooks/fresh_unified_training_run5_kaggle.ipynb). It includes the GPU check, pinned repository checkout, dataset regeneration, final leakage audit, Run 3 artifact hash verification, tokenizer reuse, smoke test, controlled training, paired evaluation and evidence packaging.

Use the reviewed PR commit containing the answer-disjoint generator, target-grouped split, and final-corpus audit. At the time this runbook is finalized, pin the exact commit SHA in the notebook before running; do not pull a moving branch.

```bash
git clone https://github.com/kanarafat54-boop/fresh-web-lite.git
cd fresh-web-lite
git checkout 808f1703628f9db2cabae0b07d5bce4d5ad948dd
npm ci
node scripts/generate-fresh-knowledge-sft.mjs
npm run test:fresh-knowledge-sft
```

Build the SFT mix, then audit the complete training and validation splits against held-out recall references:

```bash
python3 training/build_training_mix.py \
  --recipe training/mix_recipe_sft_v1.json \
  --out-dir /kaggle/working/fresh-run5-data/mix

python3 training/audit_fresh_eval_leakage.py \
  --train /kaggle/working/fresh-run5-data/mix/train.jsonl.gz \
  --validation /kaggle/working/fresh-run5-data/mix/validation.jsonl.gz \
  --recall-eval data/fresh-eval/fresh-knowledge-recall-v1.jsonl \
  --out /kaggle/working/fresh-run5-data/recall-leakage-audit.json
```

**Stop if the audit fails or reports any answer overlap.** Preserve the JSON report and all three SHA-256 values. Do not train on a failed split.

## Preserve tokenizer identity

Run 3 and Run 4 used the same tokenizer. Fine-tuning must retain that exact tokenizer because the model's embedding rows are bound to token IDs. **Do not train a new tokenizer for Run 5.**

Attach the verified Run 3 tokenizer file and Run 3 checkpoint to the Kaggle notebook as input data. Before training, verify:

- Run 3 checkpoint SHA-256: `298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d`
- Run 3 tokenizer SHA-256: `dc820bac32dd5f3bc0b47eac545d4baa33cde93da05014b2d90d0903b0c7b06c`

Find their exact paths under `/kaggle/input`; fail closed if either file is missing or the hash differs. This cell finds each artifact once and verifies both identities:

```python
from pathlib import Path
import hashlib

def unique_input(name):
    matches = list(Path("/kaggle/input").rglob(name))
    if len(matches) != 1:
        raise RuntimeError(f"Expected exactly one {name}; found {len(matches)}")
    return matches[0]

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

RUN3_CHECKPOINT = unique_input("fresh-unified-1-run3.pt")
RUN3_TOKENIZER = unique_input("tokenizer-v2.json")
assert sha256(RUN3_CHECKPOINT) == "298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d"
assert sha256(RUN3_TOKENIZER) == "dc820bac32dd5f3bc0b47eac545d4baa33cde93da05014b2d90d0903b0c7b06c"
print("Run 3 checkpoint and tokenizer identities verified")
```

Encode the new train and validation JSONL files using the verified Run 3 tokenizer:

```bash
for split in train validation; do
  python3 training/fresh_tokenizer_v2.py encode \
    --tokenizer $RUN3_TOKENIZER \
    --input /kaggle/working/fresh-run5-data/mix/${split}.jsonl.gz \
    --output /kaggle/working/fresh-run5-data/${split}.bin
done
```

## Controlled training configuration

Run 4's recorded settings were: context 1024, micro-batch 8, accumulation 4, 654 optimizer steps, learning rate 0.0001, warmup 20, seed 42, evaluation every 100 steps, save every 50 steps, and no compilation. For a controlled Run 5 comparison, keep these settings initially and change only the corrected dataset. The training command is:

```bash
python3 training/train_fresh_unified_full.py \
  --train-bin /kaggle/working/fresh-run5-data/train.bin \
  --val-bin /kaggle/working/fresh-run5-data/validation.bin \
  --tokenizer $RUN3_TOKENIZER \
  --spec training/model_spec.json \
  --init-from $RUN3_CHECKPOINT \
  --mix-manifest /kaggle/working/fresh-run5-data/mix/manifest.json \
  --seq-len 1024 --micro-batch 8 --accum 4 --max-steps 654 \
  --lr 0.0001 --warmup 20 --eval-every 100 --save-every 50 --seed 42 \
  --out-dir /kaggle/working/fresh-run5-training \
  --run-id fresh-unified-1-run5
```

This is a controlled experiment, not an assumption that 654 steps are optimal. Save the run config, full logs, mix manifest, leakage report, tokenizer hash, checkpoint manifest and checkpoint SHA-256. Never overwrite Run 3/Run 4 artifacts. If GPU limits prevent completion, preserve the resumable checkpoint and label the run incomplete.

## Paired evaluation — same inputs for Run 3 and Run 5

Run the same evaluator twice against the same corrected recall set and the same final validation mix. This measures the candidate against the base checkpoint on identical data:

```bash
python3 training/eval_fresh_model.py \
  --checkpoint $RUN3_CHECKPOINT \
  --tokenizer $RUN3_TOKENIZER \
  --recall-eval data/fresh-eval/fresh-knowledge-recall-v1.jsonl \
  --validation /kaggle/working/fresh-run5-data/mix/validation.jsonl.gz \
  --limit-recall 428 --limit-per-group 100 \
  --out /kaggle/working/fresh-run5-data/eval-run3.json --label run3-baseline

python3 training/eval_fresh_model.py \
  --checkpoint /kaggle/working/fresh-run5-training/fresh-unified-1-run5.pt \
  --tokenizer $RUN3_TOKENIZER \
  --recall-eval data/fresh-eval/fresh-knowledge-recall-v1.jsonl \
  --validation /kaggle/working/fresh-run5-data/mix/validation.jsonl.gz \
  --limit-recall 428 --limit-per-group 100 \
  --out /kaggle/working/fresh-run5-data/eval-run5.json --label run5-candidate
```

## Evaluation required before any promotion

The existing evaluator covers recall and per-source held-out perplexity only. It does NOT cover safety, truthfulness/abstention, instruction following or tool use. Those gates remain mandatory:

1. answer-level leakage audit: zero overlap across training and validation;
2. Fresh factual recall with source-aware scoring (not keyword recall alone);
3. English and Swahili retention/perplexity by source;
4. truthfulness, citation/grounding and calibrated abstention;
5. instruction following, multi-turn consistency and tool-use behavior;
6. safety and privacy regression suites;
7. native inference compatibility, latency, memory and failure behavior.

A candidate must not be promoted merely because train loss falls or Fresh recall rises. Any meaningful retention regression blocks promotion until explained and corrected.

## Current release decision

Run 4 remains experimental. Run 5 is not authorized for production until independent evaluation, safety, grounding, capability and native-serving gates pass and the owner explicitly approves promotion. Production `weightsStatus` remains `training-required`.
