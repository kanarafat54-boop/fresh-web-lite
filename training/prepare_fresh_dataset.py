"""Prepare a deterministic Fresh Unified dataset split with provenance and source-policy checks."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

REQUIRED = {"id", "input", "target", "metadata"}
REGISTRY = Path(__file__).with_name("fresh_corpus_authorizations.json")


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_registry() -> dict:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    if registry.get("schema") != "fresh-corpus-authorization-registry-v1":
        raise ValueError("invalid corpus authorization registry schema")
    if registry.get("policy", {}).get("unknownIsBlocked") is not True:
        raise ValueError("unknown corpus sources must be blocked")
    if registry.get("policy", {}).get("trainingPermissionRequired") is not True:
        raise ValueError("training permission must be required")
    return {item["authorizationId"]: item for item in registry.get("sources", [])}


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    src = Path(args.input)
    out = Path(args.output)
    registry = load_registry()
    rows = []
    seen = set()
    for line_no, line in enumerate(src.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        missing = REQUIRED - row.keys()
        if missing:
            raise ValueError(f"line {line_no}: missing {sorted(missing)}")
        if row["id"] in seen:
            raise ValueError(f"duplicate example id: {row['id']}")
        meta = row["metadata"]
        for key in ("domain", "sourceType", "license", "authorizationId"):
            if not meta.get(key):
                raise ValueError(f"line {line_no}: missing provenance {key}")
        source = registry.get(meta["authorizationId"])
        if not source or source.get("status") != "eligible":
            raise ValueError(f"line {line_no}: corpus source is not eligible")
        if source.get("trainingPermission") != "verified":
            raise ValueError(f"line {line_no}: training permission is not verified")
        if not source.get("evidenceRef"):
            raise ValueError(f"line {line_no}: source evidence is missing")
        seen.add(row["id"])
        rows.append(row)
    if len(rows) < 10:
        raise ValueError("dataset is too small for the curriculum gate")

    rows.sort(key=lambda r: r["id"])
    n = len(rows)
    train_end = max(1, int(n * 0.8))
    valid_end = max(train_end + 1, int(n * 0.9)) if n > 1 else n
    splits = {
        "train": rows[:train_end],
        "validation": rows[train_end:valid_end],
        "test": rows[valid_end:],
    }
    if not splits["validation"] or not splits["test"]:
        raise ValueError("dataset must contain examples for validation and test")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({
        "schema": "fresh-unified-prepared-dataset-v1",
        "modelId": "fresh-unified-1",
        "sourceSha256": sha256(src),
        "exampleCount": len(rows),
        "authorizationPolicy": "fresh-corpus-authorization-registry-v1",
        "splitPolicy": "deterministic-id-sort-80-10-10",
        "splits": splits,
        "productionReady": False,
        "note": "Starter synthetic corpus only; not sufficient for production training.",
    }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Fresh dataset preparation: PASS ({len(rows)} examples)")
    print(f"sourceSha256={sha256(src)}")
    print("authorizationPolicy=verified")
    print("productionReady=false")


if __name__ == "__main__":
    main()
