"""Tokenizer contract for Fresh Unified v1.

The byte mode is intentionally a deterministic pipeline smoke-test tokenizer,
not the production 32k tokenizer. Production training must replace it with a
versioned tokenizer trained from authorized Fresh data.
"""
from __future__ import annotations

from dataclasses import dataclass

PAD_ID = 0
BOS_ID = 1
EOS_ID = 2
SEP_ID = 3
BYTE_OFFSET = 4
BYTE_VOCAB_SIZE = 260


@dataclass(frozen=True)
class FreshTokenizerMetadata:
    tokenizer_id: str = "fresh-unified-tokenizer-v1"
    mode: str = "byte-smoke"
    vocab_size: int = BYTE_VOCAB_SIZE
    production_ready: bool = False


def encode_byte_smoke(text: str, max_length: int) -> list[int]:
    raw = text.encode("utf-8", errors="replace")
    ids = [BOS_ID] + [BYTE_OFFSET + b for b in raw] + [EOS_ID]
    if len(ids) > max_length:
        ids = ids[: max_length - 1] + [EOS_ID]
    return ids
