# Fresh Unified local inference runner

`training/serve_fresh_unified.py` is a local, provider-independent inference CLI for a **promoted** `fresh-unified-1` checkpoint. It does not expose a network endpoint and never downloads model weights.

## Run

Install the repository's supported Python training dependencies (including PyTorch), then provide the actual local artifacts:

```bash
python training/serve_fresh_unified.py \
  --checkpoint /absolute/path/to/promoted-checkpoint.pt \
  --tokenizer /absolute/path/to/promoted-tokenizer.json \
  --spec training/model_spec.json \
  --prompt "Explain the task clearly." \
  --max-new-tokens 64
```

The checkpoint manifest must be adjacent to the checkpoint as `checkpoint.pt.json`. The runner validates model/tokenizer identity, checkpoint and tokenizer SHA-256 values, shared dataset binding, model-spec hash, explicit promotion, held-out evaluation, and production-ready tokenizer status before loading weights. The model state dictionary is loaded strictly with `weights_only=True`; artifacts are local-only.

## Deliberate blockers

The current starter checkpoint is a pipeline smoke test and **must not be served**. The training script's smoke-test manifest does not satisfy the production promotion gate. A future promotion process must independently complete authorized-data review, full-spec training, held-out quality/safety evaluation, and model/tokenizer/spec integrity checks before issuing an approved production manifest. Do not edit a smoke-test manifest to bypass those gates.

The runner is an inference CLI, not yet the HTTP service used by the web app. Integrating it into web requests requires a separately deployed, resource-bounded model-serving service and end-to-end tests. This change does not claim Fresh AI is production operational.

## Gate tests

```bash
python -m unittest training/test_serve_fresh_unified.py
```
