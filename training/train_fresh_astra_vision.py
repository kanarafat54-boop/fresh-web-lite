"""Train and evaluate Astra's first small Fresh-owned vision model from random weights."""
from __future__ import annotations
import argparse
import hashlib
import json
import random
from pathlib import Path
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from fresh_astra_vision_model import COLOURS, MODEL_ID, SHAPES, FreshAstraVisionCNN, image_to_tensor

def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def load_records(manifest_path: Path, dataset_root: Path) -> tuple[dict, dict[str, list[dict]]]:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != "fresh-astra-vision-dataset-v1" or manifest.get("owner") != "Fresh AI":
        raise ValueError("Unsupported Astra vision dataset manifest")
    review = manifest.get("license_review") or {}
    if review.get("review_status") != "approved" or not review.get("reviewed_by") or not review.get("evidence_uri"):
        raise ValueError("Astra vision dataset requires approved provenance review")
    if manifest.get("generator") != "fresh-astra-synthetic-vision-v1":
        raise ValueError("Only the reviewed Fresh synthetic pilot generator is accepted")
    root = dataset_root.resolve()
    splits = {"train": [], "validation": [], "test": []}
    seen: set[str] = set()
    for row in manifest.get("records", []):
        record_id = row.get("record_id")
        if not isinstance(record_id, str) or not record_id or record_id in seen:
            raise ValueError("Dataset record IDs must be non-empty and unique")
        seen.add(record_id)
        if row.get("source_type") != "created_by_fresh" or row.get("personal_data_review") != "cleared":
            raise ValueError(f"Record {record_id} is not cleared Fresh-owned synthetic data")
        if not row.get("rights_basis"):
            raise ValueError(f"Record {record_id} has no rights basis")
        if row.get("shape_label") not in SHAPES or row.get("colour_label") not in COLOURS:
            raise ValueError(f"Record {record_id} has unsupported labels")
        split = row.get("split")
        if split not in splits:
            raise ValueError(f"Record {record_id} has invalid split")
        relative = Path(str(row.get("relative_path", "")))
        if relative.is_absolute() or ".." in relative.parts or not str(relative):
            raise ValueError(f"Record {record_id} has unsafe asset path")
        asset = (root / relative).resolve()
        if not asset.is_relative_to(root) or not asset.is_file():
            raise ValueError(f"Record {record_id} asset is missing or escapes dataset root")
        if asset.stat().st_size > 2 * 1024 * 1024 or sha256_file(asset) != row.get("asset_sha256"):
            raise ValueError(f"Record {record_id} asset hash/size validation failed")
        with Image.open(asset) as image:
            image.verify()
        splits[split].append({**row, "_asset": str(asset)})
    if any(not splits[name] for name in splits):
        raise ValueError("Train, validation and test splits must all contain records")
    return manifest, splits

class AstraShapesDataset(Dataset):
    def __init__(self, rows: list[dict]):
        self.rows = rows
    def __len__(self) -> int:
        return len(self.rows)
    def __getitem__(self, index: int):
        row = self.rows[index]
        with Image.open(row["_asset"]) as image:
            tensor = image_to_tensor(image)
        return (tensor, torch.tensor(SHAPES.index(row["shape_label"]), dtype=torch.long),
                torch.tensor(COLOURS.index(row["colour_label"]), dtype=torch.long))

def evaluate(model: FreshAstraVisionCNN, rows: list[dict], batch_size: int = 32) -> dict:
    loader = DataLoader(AstraShapesDataset(rows), batch_size=batch_size, shuffle=False)
    shape_correct = colour_correct = total = 0
    model.eval()
    with torch.inference_mode():
        for images, shape_labels, colour_labels in loader:
            shape_logits, colour_logits = model(images)
            shape_correct += int((shape_logits.argmax(1) == shape_labels).sum())
            colour_correct += int((colour_logits.argmax(1) == colour_labels).sum())
            total += len(images)
    return {"examples": total, "shapeAccuracy": shape_correct / total, "colourAccuracy": colour_correct / total}

def train(manifest_path: Path, dataset_root: Path, output: Path, epochs: int = 8, seed: int = 42) -> dict:
    if epochs < 1 or epochs > 30:
        raise ValueError("epochs must be between 1 and 30")
    manifest, splits = load_records(manifest_path, dataset_root)
    random.seed(seed)
    torch.manual_seed(seed)
    torch.use_deterministic_algorithms(True)
    torch.set_num_threads(1)
    model = FreshAstraVisionCNN()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.001)
    loss_fn = torch.nn.CrossEntropyLoss()
    loader = DataLoader(AstraShapesDataset(splits["train"]), batch_size=32, shuffle=True,
                        generator=torch.Generator().manual_seed(seed))
    history = []
    for epoch in range(epochs):
        model.train()
        total_loss = 0.0
        batches = 0
        for images, shape_labels, colour_labels in loader:
            optimizer.zero_grad(set_to_none=True)
            shape_logits, colour_logits = model(images)
            loss = loss_fn(shape_logits, shape_labels) + loss_fn(colour_logits, colour_labels)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            total_loss += float(loss.detach())
            batches += 1
        history.append({"epoch": epoch + 1, "trainLoss": total_loss / max(1, batches)})
    validation = evaluate(model, splits["validation"])
    test_metrics = evaluate(model, splits["test"])
    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model_id": MODEL_ID, "architecture": "fresh-astra-vision-cnn-v1",
        "shape_labels": list(SHAPES), "colour_labels": list(COLOURS),
        "model_state": model.state_dict(), "seed": seed}, output)
    metadata = {
        "schema": "fresh-astra-vision-checkpoint-v1", "modelId": MODEL_ID, "owner": "Fresh AI",
        "architecture": "fresh-astra-vision-cnn-v1", "initialization": "random",
        "pretrainedWeightsUsed": False, "thirdPartyInferenceUsed": False, "paidComputeUsed": False,
        "datasetId": manifest["dataset_id"], "datasetManifestSha256": sha256_file(manifest_path),
        "checkpointSha256": sha256_file(output), "epochs": epochs, "seed": seed,
        "history": history, "validation": validation, "test": test_metrics,
        "productionReady": False, "scope": "synthetic geometric shape and colour classification only",
    }
    output.with_suffix(output.suffix + ".json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    return metadata

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--dataset-root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--epochs", type=int, default=8)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    metadata = train(Path(args.manifest), Path(args.dataset_root), Path(args.output), args.epochs, args.seed)
    print(json.dumps({"status": "experimental-training-completed", "modelId": metadata["modelId"],
        "checkpointSha256": metadata["checkpointSha256"], "validation": metadata["validation"],
        "test": metadata["test"], "productionReady": False}, indent=2))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
