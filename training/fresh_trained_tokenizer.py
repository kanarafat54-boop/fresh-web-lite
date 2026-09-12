"""Deterministic encoder for the Fresh Unified trained-subword artifact."""
from __future__ import annotations

import json
from pathlib import Path

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v1"
PAD, BOS, EOS, SEP = 0, 1, 2, 3
BYTE_OFFSET = 4


def load_tokenizer(path: Path) -> tuple[dict, list[tuple[bytes, bytes, int]]]:
    artifact = json.loads(path.read_text(encoding="utf-8"))
    manifest = artifact.get("manifest") or {}
    if manifest.get("modelId") != MODEL_ID or manifest.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Tokenizer artifact is not bound to Fresh Unified v1")
    if manifest.get("productionReady") is not True and manifest.get("status") != "starter-trained":
        raise ValueError("Unsupported tokenizer artifact status")
    merges = []
    for merge in artifact.get("merges", []):
        left = bytes.fromhex(merge["left"])
        right = bytes.fromhex(merge["right"])
        token_id = int(merge["tokenId"])
        merges.append((left, right, token_id))
    return manifest, merges


def encode(text: str, merges: list[tuple[bytes, bytes, int]]) -> list[int]:
    symbols = [bytes([b]) for b in text.encode("utf-8", errors="replace")]
    for left, right, _token_id in merges:
        merged = left + right
        rebuilt: list[bytes] = []
        i = 0
        while i < len(symbols):
            if i + 1 < len(symbols) and symbols[i] == left and symbols[i + 1] == right:
                rebuilt.append(merged)
                i += 2
            else:
                rebuilt.append(symbols[i])
                i += 1
        symbols = rebuilt
    ids = []
    for symbol in symbols:
        if len(symbol) == 1:
            ids.append(BYTE_OFFSET + symbol[0])
        else:
            token_id = None
            for left, right, candidate_id in reversed(merges):
                if left + right == symbol:
                    token_id = candidate_id
                    break
            if token_id is None:
                raise ValueError("Tokenizer merge has no token id")
            ids.append(token_id)
    return ids
