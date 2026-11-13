"""Audit a Fresh recall evaluation set against the exact training corpus.

The audit compares normalized answer bodies, not question wording or row IDs. It is
intended to run AFTER the final train mix has been built and BEFORE tokenization/training.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import re
import unicodedata
from pathlib import Path


DOCS_PREFIX = re.compile(r'^Per docs/[^\s]+ \(.+?\), section ".*?": ', re.DOTALL)


def normalize_answer(value: str) -> str:
    value = DOCS_PREFIX.sub("", value)
    return " ".join(unicodedata.normalize("NFKC", value).casefold().split())


def read_jsonl(path: Path) -> list[dict]:
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def audit_rows(train_rows: list[dict], eval_rows: list[dict]) -> dict:
    train_answers = {
        normalize_answer(row.get("target", ""))
        for row in train_rows
        if normalize_answer(row.get("target", ""))
    }
    eval_answers = [
        normalize_answer(row.get("reference", row.get("target", "")))
        for row in eval_rows
    ]
    eval_answers = [answer for answer in eval_answers if answer]
    overlap = sorted(set(eval_answers) & train_answers)
    eval_inputs = [" ".join(unicodedata.normalize("NFKC", str(row.get("input", ""))).casefold().split())
                   for row in eval_rows]
    train_inputs = {" ".join(unicodedata.normalize("NFKC", str(row.get("input", ""))).casefold().split())
                    for row in train_rows}
    input_overlap = sorted(set(eval_inputs) & train_inputs)
    return {
        "schema": "fresh-eval-leakage-audit-v1",
        "trainRows": len(train_rows),
        "evaluationPrompts": len(eval_rows),
        "uniqueEvaluationAnswers": len(set(eval_answers)),
        "uniqueTrainingAnswers": len(train_answers),
        "answerOverlapCount": len(overlap),
        "questionOverlapCount": len(input_overlap),
        "answerOverlapSamples": overlap[:5],
        "questionOverlapSamples": input_overlap[:5],
        "passed": not overlap and not input_overlap,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--train", required=True, help="Final training JSONL or JSONL.GZ")
    parser.add_argument("--recall-eval", required=True, help="Held-out recall JSONL")
    parser.add_argument("--out", default=None, help="Optional JSON report path")
    args = parser.parse_args()
    train_path, eval_path = Path(args.train), Path(args.recall_eval)
    report = audit_rows(read_jsonl(train_path), read_jsonl(eval_path))
    report["trainSha256"] = sha256_file(train_path)
    report["recallEvalSha256"] = sha256_file(eval_path)
    report["trainPath"] = str(train_path)
    report["recallEvalPath"] = str(eval_path)
    rendered = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        output = Path(args.out)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(rendered + "\n", encoding="utf-8")
    print(rendered)
    if not report["passed"]:
        raise SystemExit("FRESH EVAL LEAKAGE AUDIT FAILED: remove overlapping answer groups and rebuild before training")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
