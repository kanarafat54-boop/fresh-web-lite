# Fresh Unified starter training run 1

## Status

- **Execution:** completed (real optimizer steps on CPU)
- **Production ready:** **no**
- **weightsStatus:** still `training-required` for production serving

## What ran

| Item | Value |
|------|--------|
| Run ID | `fresh-unified-1-starter-run1` |
| Dataset | 46 synthetic authorized examples |
| Dataset SHA-256 | `05a6764acb855f59044eac453792a1f9f13e989175bfadd49fc3324381370121` |
| Tokenizer merges | 942 (starter-trained, not production) |
| Architecture | **reduced capacity** for CPU: h128 / 2 layers / ff256 / ctx256 |
| Steps | 40 |
| Final loss | ~107.75 (expected high on tiny data + tiny model) |
| Device | cpu |
| Checkpoint SHA-256 | `86358db24d537a46d0097820ec485be5ce2453ae4e8b45904c856fb7976f7dcd` |

## Paths

- Checkpoint (local/reproducible): `artifacts/fresh-training/checkpoints/fresh-unified-1-starter-run1.pt`
- Manifest: `artifacts/fresh-training/checkpoints/fresh-unified-1-starter-run1.pt.json`
- Run record: `artifacts/fresh-training/fresh-unified-1-starter-run1-record.json`
- Tokenizer: `artifacts/fresh-training/fresh-unified-tokenizer-v1.json`
- Smoke spec: `training/model_spec_smoke.json`

## Reproduce

```bash
python3 training/train_fresh_tokenizer.py \
  --dataset data/fresh-training/synthetic-starter-v1.jsonl \
  --output artifacts/fresh-training/fresh-unified-tokenizer-v1.json

python3 training/train_fresh_unified.py \
  --dataset data/fresh-training/synthetic-starter-v1.jsonl \
  --tokenizer artifacts/fresh-training/fresh-unified-tokenizer-v1.json \
  --output artifacts/fresh-training/checkpoints/fresh-unified-1-starter-run1.pt \
  --spec training/model_spec_smoke.json \
  --train --steps 40 --seed 42
```

## Next gates before production

1. Authorized large corpus (not synthetic-only)
2. Full `model_spec.json` capacity training on GPU
3. Held-out evaluation + safety review
4. Explicit promotion + `weightsStatus` change only after those pass
