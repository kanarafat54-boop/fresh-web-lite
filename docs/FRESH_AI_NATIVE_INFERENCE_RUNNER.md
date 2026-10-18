# Fresh Unified native inference

This branch contains two provider-independent entrypoints for a **promoted** `fresh-unified-1` checkpoint:

- `training/serve_fresh_unified.py`: local CLI for one prompt.
- `training/serve_fresh_unified_http.py`: small standard-library HTTP wrapper with a bearer-token boundary.

Neither downloads artifacts or falls back to an external model provider.

## Local CLI

Install the repository's supported Python training dependencies (including PyTorch), then provide local artifacts:

```bash
python training/serve_fresh_unified.py \
  --checkpoint /absolute/path/to/promoted-checkpoint.pt \
  --tokenizer /absolute/path/to/promoted-tokenizer.json \
  --spec training/model_spec.json \
  --prompt "Explain the task clearly." \
  --max-new-tokens 64
```

The checkpoint manifest must be adjacent to the checkpoint as `checkpoint.pt.json`. The runner validates model/tokenizer identity, checkpoint and tokenizer SHA-256 values, shared dataset binding, model-spec hash, explicit promotion, held-out evaluation, and production-ready tokenizer status before loading weights. The state dictionary is loaded strictly with `weights_only=True`.

## HTTP service

Configure these environment variables on a private service host:

- `FRESH_UNIFIED_CHECKPOINT_PATH`: absolute path to the promoted checkpoint.
- `FRESH_UNIFIED_TOKENIZER_PATH`: absolute path to the promoted tokenizer JSON.
- `FRESH_UNIFIED_MODEL_SPEC_PATH`: optional path to the exact hashed model spec (defaults to `training/model_spec.json`).
- `FRESH_AI_SERVING_TOKEN`: high-entropy secret with at least 32 characters.
- `FRESH_AI_SERVING_HOST`: defaults to `127.0.0.1`; only bind to a network interface behind TLS and an authenticated private network when deployed.
- `PORT` or `FRESH_AI_SERVING_PORT`: defaults to 8787.

Start it with:

```bash
python training/serve_fresh_unified_http.py
```

- `GET /healthz`: returns `200 ready` only when validated model artifacts are loaded; otherwise `503 training-required`.
- `POST /v1/generate`: requires `Authorization: Bearer <FRESH_AI_SERVING_TOKEN>` and JSON such as `{"prompt":"Hello","max_new_tokens":64}`.
- Request body is capped at 32 KiB, prompt at 16,000 characters, generation at 128 tokens. Request prompts and exception details are not logged or returned.
- Use a private network and TLS proxy; do not expose this prototype directly to the public internet. Add platform-specific rate limits, monitoring, resource quotas and secret management before production deployment.

## Deliberate blockers

The current starter checkpoint is a pipeline smoke test and **must not be served**. The training script's smoke-test manifest does not satisfy the production promotion gate. The HTTP service intentionally remains unready without valid promoted artifacts and a configured token. Do not edit a smoke-test manifest to bypass these gates.

This is a serving boundary prototype, not yet integrated into the web app's API routes or deployed as a model service. Production use requires authorized-data review, full-spec training, held-out quality/safety evaluation, a promoted tokenizer and checkpoint, secure hosting, and end-to-end tests through Fresh AI request routes. This change does not claim Fresh AI is production operational.

## Tests

```bash
python -m unittest training/test_serve_fresh_unified.py
python -m unittest training/test_serve_fresh_unified_http.py
```
