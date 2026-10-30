"""Experimental local inference for Fresh Unified run-3/v2 checkpoints.

This is a real checkpoint loader and autoregressive decoder, not a mock or
production HTTP service. Run 3 is explicitly unpromoted: callers must pass
--allow-unpromoted, and this runner must never be exposed as production API.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v2"
RUN_ID = "fresh-unified-1-run3"
BOS, EOS, SEP = 1, 2, 3
EXPECTED_PARAMETERS = 49_947_136


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return value


def validate_run3_artifacts(
    checkpoint: Path,
    tokenizer_path: Path,
    tokenizer_manifest_path: Path,
    run_manifest_path: Path,
    spec_path: Path,
    *,
    allow_unpromoted: bool,
) -> dict[str, Any]:
    for path in (checkpoint, tokenizer_path, tokenizer_manifest_path, run_manifest_path, spec_path):
        if not path.is_file():
            raise ValueError(f"Required Fresh run-3 artifact is missing: {path}")

    run = read_object(run_manifest_path)
    tokenizer_manifest = read_object(tokenizer_manifest_path)
    spec = read_object(spec_path)

    if run.get("schema") != "fresh-unified-checkpoint-v1":
        raise ValueError("Unsupported checkpoint manifest schema")
    if run.get("modelId") != MODEL_ID or run.get("runId") != RUN_ID:
        raise ValueError("Checkpoint is not the expected Fresh Unified run-3 artifact")
    if run.get("executionStatus") != "completed" or run.get("pipelineSmokeTest") is not False:
        raise ValueError("Run-3 training did not complete as a full training run")
    if run.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Run-3 checkpoint is not bound to tokenizer v2")
    if run.get("productionReady") is not False:
        raise ValueError("Unexpected run-3 promotion state; require a separately reviewed production loader")
    if not allow_unpromoted:
        raise ValueError("Run 3 is not promoted. Pass --allow-unpromoted for isolated research/evaluation only.")

    if run.get("checkpointSha256") != sha256_file(checkpoint):
        raise ValueError("Run-3 checkpoint SHA-256 mismatch")
    if run.get("tokenizerSha256") != sha256_file(tokenizer_path):
        raise ValueError("Run-3 tokenizer SHA-256 mismatch")
    if tokenizer_manifest.get("schema") != "fresh-unified-tokenizer-v2":
        raise ValueError("Unsupported Fresh tokenizer manifest")
    if tokenizer_manifest.get("modelId") != MODEL_ID or tokenizer_manifest.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Tokenizer identity mismatch")
    if tokenizer_manifest.get("tokenizerSha256") != sha256_file(tokenizer_path):
        raise ValueError("Tokenizer manifest digest mismatch")
    if spec.get("schema") != "fresh-unified-model-spec-v2":
        raise ValueError("Run-3 requires the v2 model specification")
    if spec.get("modelId") != MODEL_ID or spec.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Model specification identity mismatch")
    if spec.get("vocabSize") != 32000 or spec.get("contextLength") != 2048:
        raise ValueError("Run-3 model specification dimensions mismatch")
    if spec.get("hiddenSize") != 512 or spec.get("layers") != 8 or spec.get("attentionHeads") != 8 or spec.get("feedForwardSize") != 2048:
        raise ValueError("Run-3 architecture dimensions mismatch")
    if run.get("parameters") != EXPECTED_PARAMETERS:
        raise ValueError("Run-3 parameter count does not match the reviewed architecture")
    if run.get("evaluation", {}).get("safetyReview") != "passed":
        # Experimental inference is allowed only for isolated research, never user-facing production.
        if not allow_unpromoted:
            raise ValueError("Safety evaluation has not passed")
    return run


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--tokenizer", required=True, type=Path)
    parser.add_argument("--tokenizer-manifest", required=True, type=Path)
    parser.add_argument("--run-manifest", required=True, type=Path)
    parser.add_argument("--spec", type=Path, default=Path(__file__).with_name("model_spec_v2.json"))
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--max-new-tokens", type=int, default=64)
    parser.add_argument("--temperature", type=float, default=0.8)
    parser.add_argument("--top-k", type=int, default=40)
    parser.add_argument("--allow-unpromoted", action="store_true",
                        help="Explicitly allow isolated research/evaluation of an unpromoted checkpoint")
    args = parser.parse_args()

    if not args.prompt.strip():
        parser.error("--prompt cannot be empty")
    if not 1 <= args.max_new_tokens <= 256:
        parser.error("--max-new-tokens must be between 1 and 256")
    if not 0.1 <= args.temperature <= 2.0:
        parser.error("--temperature must be between 0.1 and 2.0")
    if not 1 <= args.top_k <= 200:
        parser.error("--top-k must be between 1 and 200")

    try:
        run = validate_run3_artifacts(
            args.checkpoint, args.tokenizer, args.tokenizer_manifest,
            args.run_manifest, args.spec, allow_unpromoted=args.allow_unpromoted,
        )
        import torch
        from tokenizers import Tokenizer
        from fresh_model import build_fresh_model

        tokenizer = Tokenizer.from_file(str(args.tokenizer))
        spec = read_object(args.spec)
        if tokenizer.get_vocab_size() != spec["vocabSize"]:
            raise ValueError("Tokenizer vocabulary size does not match the model")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = build_fresh_model(spec).to(device)
        # Safe tensor-only deserialization; never load arbitrary Python objects.
        payload = torch.load(args.checkpoint, map_location=device, weights_only=True)
        if payload.get("model_id") != MODEL_ID or payload.get("tokenizer_id") != TOKENIZER_ID:
            raise ValueError("Checkpoint payload identity mismatch")
        model.load_state_dict(payload["state_dict"], strict=True)
        model.eval()

        prompt_ids = [BOS] + tokenizer.encode(args.prompt.strip()).ids + [SEP]
        if len(prompt_ids) >= spec["contextLength"]:
            raise ValueError("Prompt exceeds the model context length")
        generated = list(prompt_ids)
        with torch.inference_mode():
            for _ in range(args.max_new_tokens):
                input_ids = torch.tensor([generated[-spec["contextLength"]:]], dtype=torch.long, device=device)
                logits, _ = model(input_ids)
                next_logits = logits[0, -1].float() / args.temperature
                values, indices = torch.topk(next_logits, min(args.top_k, next_logits.numel()))
                probabilities = torch.softmax(values, dim=-1)
                next_id = int(indices[torch.multinomial(probabilities, 1)].item())
                if next_id == EOS:
                    break
                generated.append(next_id)
        answer = tokenizer.decode(generated[len(prompt_ids):]).strip()
        print(json.dumps({
            "modelId": MODEL_ID,
            "runId": RUN_ID,
            "checkpointSha256": run["checkpointSha256"],
            "status": "experimental-unpromoted",
            "productionServing": False,
            "device": str(device),
            "answer": answer,
            "warning": "Research/evaluation output only. Run 3 failed qualitative grounding and instruction-following expectations; do not present as trusted assistant output.",
        }, ensure_ascii=False, indent=2))
        return 0
    except (OSError, ValueError, KeyError, ImportError, RuntimeError) as exc:
        print(f"Fresh Unified run-3 inference blocked: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
