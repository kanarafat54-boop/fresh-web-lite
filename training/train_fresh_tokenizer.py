"""Train the Fresh Unified v1 tokenizer from authorized corpus data.

This is a deterministic byte-pair merge tokenizer trainer. It is intentionally
small and dependency-free so CI can exercise the real tokenizer-training
boundary without pretending the starter corpus is production-scale.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v1"
TARGET_VOCAB_SIZE = 32000
PAD_ID, BOS_ID, EOS_ID, SEP_ID = 0, 1, 2, 3
BYTE_OFFSET = 4
BASE_BYTE_COUNT = 256
SPECIAL_COUNT = 4


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_rows(path: Path) -> list[dict]:
    rows = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not row.get("input") or not row.get("target"):
            raise ValueError(f"row {n} is missing input/target")
        metadata = row.get("metadata") or {}
        if metadata.get("sourceType") != "synthetic-starter":
            raise ValueError(f"row {n} is not an authorized starter source")
        if metadata.get("license") != "internal-synthetic":
            raise ValueError(f"row {n} has an unapproved license")
        rows.append(row)
    if not rows:
        raise ValueError("dataset is empty")
    return rows


def train(dataset: Path, output: Path) -> None:
    rows = load_rows(dataset)
    sequences = []
    for row in rows:
        text = f"{row['input']}\n{row['target']}"
        sequences.append([bytes([b]) for b in text.encode("utf-8", errors="replace")])

    vocab: dict[bytes, int] = {bytes([i]): BYTE_OFFSET + i for i in range(BASE_BYTE_COUNT)}
    merges: list[dict[str, object]] = []

    while len(vocab) + SPECIAL_COUNT < TARGET_VOCAB_SIZE:
        counts: dict[tuple[bytes, bytes], int] = {}
        for seq in sequences:
            for a, b in zip(seq, seq[1:]):
                counts[(a, b)] = counts.get((a, b), 0) + 1
        if not counts:
            break
        pair, frequency = max(counts.items(), key=lambda item: (item[1], item[0][0], item[0][1]))
        if frequency < 2:
            break
        merged = pair[0] + pair[1]
        if merged in vocab:
            break
        new_id = BYTE_OFFSET + BASE_BYTE_COUNT + len(merges)
        vocab[merged] = new_id
        merges.append({"left": pair[0].hex(), "right": pair[1].hex(), "tokenId": new_id, "frequency": frequency})

        for index, seq in enumerate(sequences):
            rebuilt = []
            i = 0
            while i < len(seq):
                if i + 1 < len(seq) and seq[i] == pair[0] and seq[i + 1] == pair[1]:
                    rebuilt.append(merged)
                    i += 2
                else:
                    rebuilt.append(seq[i])
                    i += 1
            sequences[index] = rebuilt

    manifest = {
        "schema": "fresh-unified-tokenizer-artifact-v1",
        "modelId": MODEL_ID,
        "tokenizerId": TOKENIZER_ID,
        "vocabSize": TARGET_VOCAB_SIZE,
        "specialTokens": {"pad": PAD_ID, "bos": BOS_ID, "eos": EOS_ID, "sep": SEP_ID},
        "byteBase": {"offset": BYTE_OFFSET, "count": BASE_BYTE_COUNT},
        "mergeCount": len(merges),
        "datasetSha256": sha256_file(dataset),
        "trainingSource": "authorized-internal-synthetic-starter",
        "status": "starter-trained",
        "productionReady": False,
        "note": "Tokenizer training is real and deterministic, but this artifact is trained only on the tiny authorized starter corpus and is not production-quality."
    }
    artifact = {"manifest": manifest, "merges": merges}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(f"Fresh tokenizer training: PASS ({len(merges)} merges)")
    print(f"dataset_sha256={manifest['datasetSha256']}")
    print(f"artifact={output}")
    print("Production tokenizer status: NOT READY — starter corpus only.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    train(Path(args.dataset), Path(args.output))


if __name__ == "__main__":
    main()
