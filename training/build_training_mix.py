"""Build the Fresh Unified training mix from a recipe.

Every row must pass the corpus authorization registry. Missing optional sources are skipped
(listed in the manifest); missing required sources are an error. Output is deterministic
for a given recipe + inputs: train/validation JSONL.gz plus a manifest with counts and hashes.

Validation assignment is grouped by normalized target content, not question-row ID. This
prevents paraphrased questions with the same answer from leaking across train/validation.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import random
import unicodedata
from pathlib import Path

from fresh_corpus_policy import load_authorization_registry, validate_row_authorization


def read_rows(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as fh:
        for line_no, line in enumerate(fh, 1):
            if line.strip():
                yield line_no, json.loads(line)


def normalized_target(row: dict) -> str:
    target = row.get("target")
    if isinstance(target, str) and target.strip():
        return " ".join(unicodedata.normalize("NFKC", target).casefold().split())
    return ""


def validation_group_key(row: dict) -> str:
    target = normalized_target(row)
    # Rows without a target retain deterministic ID-based splitting.
    raw = "target:" + target if target else "row:" + str(row["id"])
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def is_validation(group_key: str, fraction: float) -> bool:
    return int(hashlib.sha256(group_key.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF < fraction


def build(recipe: dict, root: Path, registry: dict) -> tuple[list[dict], list[dict], dict]:
    train: list[dict] = []
    val: list[dict] = []
    report: dict = {"sources": {}, "skipped": []}
    seen: set[str] = set()
    split_groups: set[str] = set()
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
            group_key = validation_group_key(row)
            split_groups.add(group_key)
            target = val if is_validation(group_key, recipe["validationFraction"]) else train
            copies = 1 if target is val else int(src.get("repeat", 1))
            target.extend([row] * copies)
        report["sources"][src["id"]] = {"uniqueRows": kept, "repeat": src.get("repeat", 1)}
    rnd = random.Random(recipe["seed"])
    rnd.shuffle(train)
    rnd.shuffle(val)
    report["splitGrouping"] = "normalized-target-sha256-v1"
    report["splitGroupCount"] = len(split_groups)
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
                "note": "Built from authorized sources. Promotion to production training is a separate explicit owner step."}
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
