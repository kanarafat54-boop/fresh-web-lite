"""Provider-independent Fresh Unified training entrypoint.

This script is deliberately a real-training boundary, not a fake checkpoint
producer. It validates the canonical JSONL dataset and exits safely in dry-run
mode. Actual optimizer/model construction must be supplied by the selected
Fresh-owned backend on authorized accelerator hardware.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

MODEL_ID = "fresh-unified-1"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_dataset(path: Path) -> list[dict]:
    rows: list[dict] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_no, line in enumerate(handle, 1):
            if not line.strip():
                continue
            row = json.loads(line)
            if not row.get("id") or not row.get("input") or not row.get("target"):
                raise ValueError(f"Invalid training example at line {line_no}")
            rows.append(row)
    if not rows:
        raise ValueError("Training dataset is empty")
    if len({row["id"] for row in rows}) != len(rows):
        raise ValueError("Training dataset contains duplicate example IDs")
    return rows


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    dataset = Path(args.dataset)
    output = Path(args.output)
    if not dataset.is_file():
        raise SystemExit(f"Dataset not found: {dataset}")

    rows = load_dataset(dataset)
    digest = sha256_file(dataset)

    print(f"model={MODEL_ID}")
    print(f"examples={len(rows)}")
    print(f"dataset_sha256={digest}")

    if args.dry_run:
        print("status=planned")
        print("checkpoint=not-created")
        print("Training backend dry-run PASS; no weights were created.")
        return 0

    raise SystemExit(
        "No concrete Fresh training backend is configured. Refusing to fabricate "
        "weights or a checkpoint; provide an authorized accelerator backend."
    )


if __name__ == "__main__":
    raise SystemExit(main())
