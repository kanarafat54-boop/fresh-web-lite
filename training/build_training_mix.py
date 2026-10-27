"""Build the Fresh Unified training mix from a recipe.

Every row must pass the corpus authorization registry. Missing optional sources are skipped
(listed in the manifest); missing required sources are an error. Output is deterministic
for a given recipe + inputs: train/validation JSONL.gz plus a manifest with hashes and counts.

Usage:
  python3 training/build_training_mix.py --recipe training/mix_recipe_v1.json --out-dir artifacts/fresh-training/mix-v1
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import random
from pathlib import Path

from fresh_corpus_policy import load_authorization_registry, validate_row_authorization


def read_rows(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            if line.strip():
                yield line_no, json.loads(line)


def is_validation(row_id: str, fraction: float) -> bool:
    return int(hashlib.sha256(row_id.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF < fraction


def build(recipe: dict, root: Path, registry: dict) -> tuple[list[dict], list[dict], dict]:
    train: list[dict] = []
    val: list[dict] = []
    report: dict = {"sources": {}, "skipped": []}
    seen: set[str] = set()
    for src in recipe["sources"]:
        path = root / src["path"]
        if not path.exists():
            if src.get("optional"):
                report["skipped"].append({"id": src["id"], "reason": "file not present"})
                continue
            raise FileNotFoundError(f"required source missing: {src['path']}")
        kept = 0
        for line_no, row in read_rows(path):
            if src.get("maxRows") and kept >= src["maxRows"]:
                break
            validate_row_authorization(row, registry, line_no)  # fail closed
            if row["id"] in seen:
                continue
            seen.add(row["id"])
            kept += 1
            target = val if is_validation(row["id"], recipe["validationFraction"]) else train
            copies = 1 if target is val else int(src.get("repeat", 1))
            target.extend([row] * copies)
        report["sources"][src["id"]] = {"uniqueRows": kept, "repeat": src.get("repeat", 1)}
    rnd = random.Random(recipe["seed"])
    rnd.shuffle(train)
    rnd.shuffle(val)
    return train, val, report


def write_gz(path: Path, rows: list[dict]) -> str:
    data = "".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows).encode("utf-8")
    with gzip.GzipFile(filename="", mode="wb", fileobj=path.open("wb"), mtime=0) as fh:
        fh.write(data)
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--recipe", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--root", default=".")
    args = ap.parse_args()
    recipe = json.loads(Path(args.recipe).read_text(encoding="utf-8"))
    train, val, report = build(recipe, Path(args.root), load_authorization_registry())
    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    manifest = {"schema": "fresh-training-mix-manifest-v1", "recipe": args.recipe, "seed": recipe["seed"],
                "trainRows": len(train), "validationRows": len(val), **report,
                "trainSha256": write_gz(out / "train.jsonl.gz", train),
                "validationSha256": write_gz(out / "validation.jsonl.gz", val),
                "productionTrainingEligible": False,
                "note": "Mix built from authorized, screened sources. Promotion to production training is an explicit owner step."}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
