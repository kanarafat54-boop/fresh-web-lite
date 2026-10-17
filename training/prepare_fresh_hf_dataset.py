"""Optional Hugging Face dataset adapter for inspection/export, not Fresh-native training.

Fresh Unified's native model currently uses the repository's custom tokenizer. This
adapter is an optional interoperability path and must not be confused with the
canonical Fresh tokenizer or checkpoint pipeline.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from fresh_corpus_policy import load_authorization_registry, validate_row_authorization


def format_instruction(row: dict) -> dict:
    if not row.get("input") or not row.get("target"):
        raise ValueError("each row must contain non-empty input and target")
    metadata = row.get("metadata") or {}
    system = metadata.get("system", "You are Fresh AI. Be accurate, safe, and explicit about uncertainty.")
    text = f"System: {system}\nUser: {row['input']}\nAssistant: {row['target']}"
    return {"id": row["id"], "text": text, "metadata": metadata}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, help="Canonical Fresh JSONL corpus")
    parser.add_argument("--output", required=True, help="Formatted JSONL export")
    parser.add_argument("--tokenizer", default=None, help="Optional local HF tokenizer directory; must match a separately selected HF model")
    parser.add_argument("--max-length", type=int, default=2048)
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    src = Path(args.input)
    out = Path(args.output)
    rows = []
    seen = set()
    registry = load_authorization_registry()
    for line_no, line in enumerate(src.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not row.get("id") or row["id"] in seen:
            raise ValueError(f"row {line_no}: missing or duplicate ID")
        validate_row_authorization(row, registry, line_no)
        seen.add(row["id"])
        rows.append(format_instruction(row))
    if not rows:
        raise ValueError("dataset is empty")

    # Validation/export is dependency-free. Tokenization is opt-in and local-only
    # so this utility never downloads an arbitrary model or tokenizer implicitly.
    tokenized_count = None
    if args.tokenizer:
        try:
            from datasets import Dataset
            from transformers import AutoTokenizer
        except ImportError as exc:
            raise SystemExit("Optional HF path requires: pip install -r training/requirements-hf.txt") from exc
        tokenizer = AutoTokenizer.from_pretrained(args.tokenizer, local_files_only=True)
        if tokenizer.pad_token is None:
            if tokenizer.eos_token is None:
                raise ValueError("Tokenizer has neither pad_token nor eos_token")
            tokenizer.pad_token = tokenizer.eos_token
        dataset = Dataset.from_list(rows)
        encoded = dataset.map(
            lambda batch: tokenizer(batch["text"], truncation=True, max_length=args.max_length),
            batched=True,
            remove_columns=["text", "metadata"],
        )
        out.parent.mkdir(parents=True, exist_ok=True)
        encoded.save_to_disk(str(out))
        tokenized_count = len(encoded)
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows), encoding="utf-8")

    print(f"Fresh HF dataset adapter: PASS ({len(rows)} examples)")
    print(f"output={out}")
    if tokenized_count is not None:
        print(f"tokenized_examples={tokenized_count}")
        print("Tokenizer was loaded from local files only; verify it matches the selected HF model.")
    else:
        print("Formatted text only; no tokenizer or model weights were loaded.")
    print("This adapter does not create or promote a Fresh Unified checkpoint.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
