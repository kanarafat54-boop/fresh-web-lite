"""Torch-free helpers for Fresh Unified training: sequence packing, LR schedule, data order.

Kept separate from the trainer so it can be unit-tested without a GPU or PyTorch.
"""
from __future__ import annotations

import math
from typing import Iterable, Iterator

import numpy as np

PAD, BOS, EOS, SEP = 0, 1, 2, 3


def row_to_ids(row: dict, encode) -> list[int]:
    """[BOS] input [SEP] target [EOS] using any callable `encode(str) -> list[int]`."""
    return [BOS] + list(encode(row["input"])) + [SEP] + list(encode(row["target"])) + [EOS]


def to_stream(rows: Iterable[dict], encode, vocab_size: int) -> np.ndarray:
    """Concatenate all rows into one uint16 token stream (vocab must fit in uint16)."""
    if vocab_size > 65535:
        raise ValueError("vocab too large for uint16 stream")
    chunks = [np.asarray(row_to_ids(r, encode), dtype=np.uint16) for r in rows]
    return np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.uint16)


def n_blocks(stream_len: int, seq_len: int) -> int:
    """Number of (input, label) blocks of length seq_len available in a stream."""
    return max(0, (stream_len - 1) // seq_len)


def get_block(stream: np.ndarray, index: int, seq_len: int) -> tuple[np.ndarray, np.ndarray]:
    start = index * seq_len
    x = stream[start:start + seq_len].astype(np.int64)
    y = stream[start + 1:start + seq_len + 1].astype(np.int64)
    if len(x) != seq_len or len(y) != seq_len:
        raise IndexError("block out of range")
    return x, y


def block_order(count: int, epoch: int, seed: int) -> np.ndarray:
    """Deterministic per-epoch shuffle, so resuming mid-epoch reproduces the same order."""
    return np.random.default_rng(seed * 1_000_003 + epoch).permutation(count)


def cosine_lr(step: int, *, warmup: int, max_steps: int, peak: float, floor_ratio: float = 0.1) -> float:
    if step < warmup:
        return peak * (step + 1) / max(1, warmup)
    if step >= max_steps:
        return peak * floor_ratio
    progress = (step - warmup) / max(1, max_steps - warmup)
    return peak * (floor_ratio + (1 - floor_ratio) * 0.5 * (1 + math.cos(math.pi * progress)))


def steps_for(blocks: int, batch_blocks: int, epochs: float) -> int:
    return max(1, int(blocks // batch_blocks * epochs))


def iter_batches(stream: np.ndarray, seq_len: int, batch_blocks: int, start_step: int, seed: int) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    """Yield (x, y) arrays of shape (batch_blocks, seq_len), resuming at `start_step`."""
    count = n_blocks(len(stream), seq_len)
    per_epoch = count // batch_blocks
    if per_epoch == 0:
        raise ValueError("stream too small for one batch")
    step = start_step
    while True:
        epoch, within = divmod(step, per_epoch)
        order = block_order(count, epoch, seed)
        idx = order[within * batch_blocks:(within + 1) * batch_blocks]
        pairs = [get_block(stream, int(i), seq_len) for i in idx]
        yield np.stack([p[0] for p in pairs]), np.stack([p[1] for p in pairs])
        step += 1
