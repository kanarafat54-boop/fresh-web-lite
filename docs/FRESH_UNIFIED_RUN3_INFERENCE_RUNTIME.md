# Fresh Unified run-3 inference runtime

## Why this runtime exists

Fresh Unified run 3 is an actual from-scratch 49,947,136-parameter checkpoint trained with Fresh's v2 byte-level BPE tokenizer. The checkpoint is stored outside Git; the repository records its SHA-256 in `training/runs/fresh-unified-1-run3.manifest.json`.

The earlier `training/serve_fresh_unified.py` loader is not compatible with this artifact: it requires tokenizer v1 and a different manifest contract. Do not point it at run 3. This runtime explicitly binds the run-3 checkpoint to tokenizer v2 and a dedicated v2 model spec.

## Local isolated inference

From the repository root, install the runtime dependencies in an isolated Python environment:

```bash
python -m pip install torch tokenizers numpy
```

Place the original, unmodified run-3 output files together in a private local directory. The expected files are:

- `fresh-unified-1-run3.pt`
- `fresh-unified-1-run3.pt.json`
- `tokenizer-v2.json`
- `tokenizer-v2.manifest.json`

Then run:

```bash
python training/serve_fresh_unified_v2.py \
  --checkpoint /path/to/run3/fresh-unified-1-run3.pt \
  --run-manifest /path/to/run3/fresh-unified-1-run3.pt.json \
  --tokenizer /path/to/run3/tokenizer-v2.json \
  --tokenizer-manifest /path/to/run3/tokenizer-v2.manifest.json \
  --prompt "Explain what Fresh Web Lite is." \
  --allow-unpromoted
```

The runner verifies checkpoint and tokenizer hashes, model/run/tokenizer identity, training completion, model dimensions, and parameter count before loading weights with safe tensor-only deserialization. It uses the actual Fresh model architecture in `training/fresh_model.py` and performs autoregressive token generation.

## Critical restrictions

- Run 3 is **experimental and unpromoted**. The explicit `--allow-unpromoted` flag is required.
- Output is for isolated engineering evaluation only. It must not be wired into Fresh AI user-facing production responses.
- The run-3 qualitative report found unreliable factual grounding and instruction following. Safety, truthfulness, capability and tool-use evaluations remain incomplete.
- `weightsStatus` therefore remains `training-required`.
- This local runner is not a hosted inference service and does not imply production deployment.
- Run 4 fine-tuning is defined by `training/notebooks/fresh_unified_finetune_kaggle.ipynb`, but the repository does not contain run-4 execution output or a verified run-4 manifest. Do not assume it completed; attach its actual output and evaluate before treating it as a new checkpoint.

## Promotion gates

A checkpoint may become the production model only after its immutable artifact and tokenizer are available, hashes and provenance are verified, held-out Fresh knowledge and general-language evaluations pass, truthfulness/abstention and safety reviews pass, capability evaluations pass, and an explicit promotion record is approved. Production serving must use a separate fail-closed runtime that accepts only the approved manifest.
