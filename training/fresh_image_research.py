"""Experimental Fresh-owned text-conditioned image research baseline.

This is a tiny 16x16 pixel-distribution model for CPU research only.
It trains from random initialization on a reviewed local dataset. It does not
download weights, call an inference provider, or claim production quality.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

import torch
from PIL import Image
from torch import nn

MODEL_ID = "fresh-image-research-0"
WIDTH = 16
HEIGHT = 16
CHANNELS = 3
BINS = 16
MAX_PROMPT_CHARS = 512
MAX_ASSET_BYTES = 10 * 1024 * 1024
MAX_RECORDS = 5000
MAX_STEPS = 5000


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_object(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return value


def prompt_bytes(prompt: str) -> list[int]:
    raw = prompt.strip().encode("utf-8")[:MAX_PROMPT_CHARS]
    if not raw:
        raise ValueError("Prompt/caption cannot be empty")
    return [byte + 1 for byte in raw]


class FreshImageResearchModel(nn.Module):
    """Small caption-conditioned per-channel pixel-bin predictor."""

    def __init__(self) -> None:
        super().__init__()
        self.embedding = nn.Embedding(257, 32, padding_idx=0)
        self.decoder = nn.Sequential(
            nn.Linear(32, 128),
            nn.ReLU(),
            nn.Linear(128, WIDTH * HEIGHT * CHANNELS * BINS),
        )

    def forward(self, token_ids: torch.Tensor) -> torch.Tensor:
        mask = token_ids.ne(0).unsqueeze(-1)
        embedded = self.embedding(token_ids)
        pooled = (embedded * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1)
        return self.decoder(pooled).view(-1, WIDTH * HEIGHT * CHANNELS, BINS)


def load_reviewed_records(manifest_path: Path, dataset_root: Path, split: str) -> tuple[dict, list[dict]]:
    manifest = read_object(manifest_path)
    if manifest.get("schema_version") != "1.0.0" or manifest.get("owner") != "Fresh AI":
        raise ValueError("Unsupported Fresh image dataset manifest")
    review = manifest.get("license_review") or {}
    if review.get("review_status") != "approved" or not review.get("reviewed_by") or not review.get("evidence_uri"):
        raise ValueError("Dataset license review must be approved with reviewer and evidence")
    records = manifest.get("records")
    if not isinstance(records, list) or not records or len(records) > MAX_RECORDS:
        raise ValueError(f"Dataset must contain between 1 and {MAX_RECORDS} records")
    seen_ids: set[str] = set()
    selected = []
    root = dataset_root.resolve()
    for row in records:
        if not isinstance(row, dict):
            raise ValueError("Each dataset record must be an object")
        record_id = row.get("record_id")
        if not record_id or record_id in seen_ids:
            raise ValueError("Dataset record IDs must be non-empty and unique")
        seen_ids.add(record_id)
        if row.get("personal_data_review") != "cleared":
            raise ValueError(f"Record {record_id} has not passed personal-data review")
        if row.get("source_type") not in {"created_by_fresh", "explicitly_licensed", "documented_permission"}:
            raise ValueError(f"Record {record_id} has an unsupported source type")
        if not row.get("rights_basis"):
            raise ValueError(f"Record {record_id} is missing rights_basis")
        if row.get("source_type") != "created_by_fresh" and not row.get("permission_evidence_uri"):
            raise ValueError(f"Record {record_id} is missing permission evidence")
        relative = Path(str(row.get("relative_path", "")))
        if relative.is_absolute() or ".." in relative.parts or not str(relative):
            raise ValueError(f"Record {record_id} has an unsafe relative_path")
        asset = (root / relative).resolve()
        if not asset.is_relative_to(root) or not asset.is_file():
            raise ValueError(f"Record {record_id} asset is missing or escapes dataset root")
        if asset.stat().st_size > MAX_ASSET_BYTES:
            raise ValueError(f"Record {record_id} exceeds the 10 MB asset limit")
        if sha256_file(asset).lower() != str(row.get("asset_sha256", "")).lower():
            raise ValueError(f"Record {record_id} SHA-256 mismatch")
        if not isinstance(row.get("caption"), str) or not row["caption"].strip():
            raise ValueError(f"Record {record_id} needs a non-empty caption")
        if len(row["caption"]) > MAX_PROMPT_CHARS:
            raise ValueError(f"Record {record_id} caption exceeds {MAX_PROMPT_CHARS} characters")
        if row.get("split") == split:
            selected.append({**row, "_asset_path": str(asset)})
    if not selected:
        raise ValueError(f"No records found for split={split}")
    return manifest, selected


def image_target(path: Path) -> torch.Tensor:
    with Image.open(path) as source:
        image = source.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)
        pixels = list(image.getdata())
    return torch.tensor([min(BINS - 1, channel // 16) for pixel in pixels for channel in pixel], dtype=torch.long)


def encoded_batch(captions: list[str]) -> torch.Tensor:
    sequences = [prompt_bytes(caption) for caption in captions]
    width = max(len(sequence) for sequence in sequences)
    batch = torch.zeros((len(sequences), width), dtype=torch.long)
    for index, sequence in enumerate(sequences):
        batch[index, : len(sequence)] = torch.tensor(sequence, dtype=torch.long)
    return batch


def train(args: argparse.Namespace) -> int:
    manifest_path = Path(args.manifest)
    dataset_root = Path(args.dataset_root)
    manifest, rows = load_reviewed_records(manifest_path, dataset_root, "train")
    samples = [(row["caption"], image_target(Path(row["_asset_path"]))) for row in rows]
    random.seed(args.seed)
    torch.manual_seed(args.seed)
    model = FreshImageResearchModel()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()
    steps = max(1, min(int(args.steps), MAX_STEPS))
    model.train()
    last_loss = None
    for step in range(steps):
        indices = [random.randrange(len(samples)) for _ in range(min(args.batch_size, len(samples)))]
        captions = [samples[index][0] for index in indices]
        targets = torch.stack([samples[index][1] for index in indices])
        logits = model(encoded_batch(captions))
        loss = criterion(logits.reshape(-1, BINS), targets.reshape(-1))
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        last_loss = float(loss.detach().cpu())
        if (step + 1) % max(1, steps // 10) == 0 or step + 1 == steps:
            print(f"step={step + 1}/{steps} loss={last_loss:.4f}")

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "model_id": MODEL_ID,
        "model_state": model.state_dict(),
        "seed": args.seed,
        "width": WIDTH,
        "height": HEIGHT,
        "channels": CHANNELS,
        "bins": BINS,
    }, output)
    metadata = {
        "schema": "fresh-image-research-checkpoint-v1",
        "modelId": MODEL_ID,
        "status": "experimental-research-only",
        "productionReady": False,
        "promotionStatus": "not-eligible",
        "datasetId": manifest["dataset_id"],
        "datasetManifestSha256": sha256_file(manifest_path),
        "checkpointSha256": sha256_file(output),
        "trainingRecordCount": len(samples),
        "steps": steps,
        "seed": args.seed,
        "finalLoss": last_loss,
        "dimensions": [WIDTH, HEIGHT],
        "pretrainedWeightsUsed": False,
        "thirdPartyInferenceUsed": False,
        "paidComputeUsed": False,
    }
    output.with_suffix(output.suffix + ".json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print("status=completed-experimental-training")
    print(f"checkpoint={output}")
    print(f"checkpoint_sha256={metadata['checkpointSha256']}")
    print("production_ready=false")
    return 0


def sample(args: argparse.Namespace) -> int:
    checkpoint = Path(args.checkpoint)
    metadata_path = checkpoint.with_suffix(checkpoint.suffix + ".json")
    metadata = read_object(metadata_path)
    if metadata.get("schema") != "fresh-image-research-checkpoint-v1" or metadata.get("modelId") != MODEL_ID:
        raise ValueError("Unsupported Fresh image research checkpoint")
    if metadata.get("checkpointSha256") != sha256_file(checkpoint):
        raise ValueError("Checkpoint SHA-256 mismatch")
    if metadata.get("productionReady") is not False or metadata.get("pretrainedWeightsUsed") is not False:
        raise ValueError("Only unpromoted, from-scratch research checkpoints are supported")
    payload = torch.load(checkpoint, map_location="cpu", weights_only=True)
    if payload.get("model_id") != MODEL_ID:
        raise ValueError("Checkpoint payload model ID mismatch")
    model = FreshImageResearchModel()
    model.load_state_dict(payload["model_state"], strict=True)
    model.eval()
    with torch.inference_mode():
        logits = model(encoded_batch([args.prompt]))
        bins = logits.argmax(dim=-1).reshape(HEIGHT, WIDTH, CHANNELS).to(torch.uint8)
        pixels = (bins * 17).clamp(0, 255).numpy()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(pixels, mode="RGB").save(output, format="PNG")
    with Image.open(output) as result:
        result.verify()
    with Image.open(output) as result:
        if result.format != "PNG" or result.size != (WIDTH, HEIGHT) or result.mode != "RGB":
            raise ValueError("Generated PNG failed output validation")
    print("status=experimental-sample-created")
    print(f"png={output}")
    print(f"dimensions={WIDTH}x{HEIGHT}")
    print("production_ready=false")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)
    train_parser = subparsers.add_parser("train")
    train_parser.add_argument("--manifest", required=True)
    train_parser.add_argument("--dataset-root", required=True)
    train_parser.add_argument("--output", required=True)
    train_parser.add_argument("--steps", type=int, default=100)
    train_parser.add_argument("--batch-size", type=int, default=4)
    train_parser.add_argument("--seed", type=int, default=42)
    sample_parser = subparsers.add_parser("sample")
    sample_parser.add_argument("--checkpoint", required=True)
    sample_parser.add_argument("--prompt", required=True)
    sample_parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        if args.command == "train":
            if args.batch_size < 1 or args.batch_size > 32:
                raise ValueError("batch-size must be between 1 and 32")
            return train(args)
        if not args.prompt.strip() or len(args.prompt) > MAX_PROMPT_CHARS:
            raise ValueError(f"Prompt must contain 1 to {MAX_PROMPT_CHARS} characters")
        return sample(args)
    except (OSError, ValueError, KeyError, RuntimeError, json.JSONDecodeError) as exc:
        print(f"Fresh image research blocked: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
