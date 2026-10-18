"""Fail-closed local inference runner for a promoted Fresh Unified checkpoint.

This is a local CLI, not an HTTP service. It never downloads model artifacts.
A checkpoint is served only when its manifest explicitly records production
promotion and the checkpoint, tokenizer, and dataset bindings verify.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v1"
BOS, EOS, SEP, BYTE_OFFSET = 1, 2, 3, 4


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def validate_artifacts(checkpoint: Path, tokenizer_path: Path, spec_path: Path) -> tuple[dict, dict, dict, dict]:
    manifest_path = checkpoint.with_suffix(checkpoint.suffix + ".json")
    if not checkpoint.is_file() or not tokenizer_path.is_file() or not manifest_path.is_file():
        raise ValueError("Checkpoint, tokenizer, and adjacent checkpoint manifest must all exist")
    manifest = read_json(manifest_path)
    tokenizer_artifact = read_json(tokenizer_path)
    tokenizer_manifest = tokenizer_artifact.get("manifest") or {}
    spec = read_json(spec_path)

    if manifest.get("schema") != "fresh-unified-checkpoint-v1":
        raise ValueError("Unsupported checkpoint manifest schema")
    if manifest.get("modelId") != MODEL_ID or manifest.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Checkpoint model/tokenizer identity mismatch")
    if manifest.get("executionStatus") != "completed":
        raise ValueError("Checkpoint training run is not complete")
    if manifest.get("pipelineSmokeTest") is True:
        raise ValueError("Pipeline smoke-test checkpoints are forbidden for serving")
    if manifest.get("productionReady") is not True or manifest.get("promotionStatus") != "approved":
        raise ValueError("Checkpoint has not passed explicit production promotion")
    if manifest.get("evaluationStatus") != "passed":
        raise ValueError("Held-out evaluation gate has not passed")
    if manifest.get("checkpointSha256") != sha256_file(checkpoint):
        raise ValueError("Checkpoint SHA-256 mismatch")
    if manifest.get("tokenizerSha256") != sha256_file(tokenizer_path):
        raise ValueError("Tokenizer SHA-256 mismatch")
    if tokenizer_manifest.get("modelId") != MODEL_ID or tokenizer_manifest.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Tokenizer identity mismatch")
    if tokenizer_manifest.get("productionReady") is not True:
        raise ValueError("Starter or unpromoted tokenizer cannot be served")
    if manifest.get("datasetSha256") != tokenizer_manifest.get("datasetSha256"):
        raise ValueError("Checkpoint and tokenizer dataset bindings differ")
    if spec.get("modelId") != MODEL_ID or spec.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Model spec identity mismatch")
    if manifest.get("modelSpecSha256") != sha256_file(spec_path):
        raise ValueError("Model spec SHA-256 mismatch")
    return manifest, tokenizer_artifact, tokenizer_manifest, spec


def decode_token_ids(token_ids: list[int], merges: list[tuple[bytes, bytes, int]]) -> str:
    token_bytes: dict[int, bytes] = {BYTE_OFFSET + byte: bytes([byte]) for byte in range(256)}
    for left, right, token_id in merges:
        token_bytes[token_id] = left + right
    raw = b"".join(token_bytes[token_id] for token_id in token_ids if token_id in token_bytes)
    return raw.decode("utf-8", errors="replace")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", required=True, type=Path)
    parser.add_argument("--tokenizer", required=True, type=Path)
    parser.add_argument("--spec", type=Path, default=Path(__file__).with_name("model_spec.json"))
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--max-new-tokens", type=int, default=64)
    args = parser.parse_args()
    if not args.prompt.strip():
        parser.error("--prompt cannot be empty")
    if not 1 <= args.max_new_tokens <= 256:
        parser.error("--max-new-tokens must be between 1 and 256")

    try:
        manifest, tokenizer_artifact, _tokenizer_manifest, spec = validate_artifacts(
            args.checkpoint, args.tokenizer, args.spec
        )
        from fresh_trained_tokenizer import encode
        from fresh_model import build_fresh_model
        import torch

        merges = [
            (bytes.fromhex(row["left"]), bytes.fromhex(row["right"]), int(row["tokenId"]))
            for row in tokenizer_artifact.get("merges", [])
        ]
        prompt_ids = [BOS] + encode(args.prompt.strip(), merges) + [SEP]
        if len(prompt_ids) >= int(spec["contextLength"]):
            raise ValueError("Prompt exceeds the configured model context")
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model = build_fresh_model(spec).to(device)
        # weights_only prevents arbitrary Python object deserialization.
        checkpoint_data = torch.load(args.checkpoint, map_location=device, weights_only=True)
        if checkpoint_data.get("model_id") != MODEL_ID or checkpoint_data.get("tokenizer_id") != TOKENIZER_ID:
            raise ValueError("Checkpoint payload identity mismatch")
        model.load_state_dict(checkpoint_data["state_dict"], strict=True)
        model.eval()

        generated = list(prompt_ids)
        with torch.inference_mode():
            for _ in range(args.max_new_tokens):
                input_ids = torch.tensor([generated[-int(spec["contextLength"]):]], dtype=torch.long, device=device)
                logits, _ = model(input_ids)
                next_id = int(torch.argmax(logits[0, -1]).item())
                if next_id == EOS:
                    break
                generated.append(next_id)
        completion_ids = generated[len(prompt_ids):]
        print(decode_token_ids(completion_ids, merges))
        return 0
    except (OSError, ValueError, KeyError, ImportError, RuntimeError) as exc:
        print(f"Fresh Unified inference blocked: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
