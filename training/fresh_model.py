"""Fresh Unified v1 decoder-only model.

This is the Fresh-owned neural architecture used by the training backend.
It is deliberately small enough for reproducible pipeline tests; it is not a
claim of frontier-scale capability.
"""
from __future__ import annotations

import math
import torch
from torch import nn


class RMSNorm(nn.Module):
    def __init__(self, dim: int, eps: float = 1e-6):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        rms = x.pow(2).mean(dim=-1, keepdim=True)
        return x * torch.rsqrt(rms + self.eps) * self.weight


class SwiGLU(nn.Module):
    def __init__(self, dim: int, hidden: int):
        super().__init__()
        self.gate = nn.Linear(dim, hidden, bias=False)
        self.up = nn.Linear(dim, hidden, bias=False)
        self.down = nn.Linear(hidden, dim, bias=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.down(torch.nn.functional.silu(self.gate(x)) * self.up(x))


class CausalSelfAttention(nn.Module):
    def __init__(self, dim: int, heads: int, max_seq: int):
        super().__init__()
        if dim % heads:
            raise ValueError("hidden size must be divisible by attention heads")
        self.heads = heads
        self.head_dim = dim // heads
        self.qkv = nn.Linear(dim, dim * 3, bias=False)
        self.out = nn.Linear(dim, dim, bias=False)
        self.max_seq = max_seq
        self.register_buffer("mask", torch.tril(torch.ones(max_seq, max_seq, dtype=torch.bool)), persistent=False)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        b, t, c = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        q = q.view(b, t, self.heads, self.head_dim).transpose(1, 2)
        k = k.view(b, t, self.heads, self.head_dim).transpose(1, 2)
        v = v.view(b, t, self.heads, self.head_dim).transpose(1, 2)
        scores = (q @ k.transpose(-2, -1)) / math.sqrt(self.head_dim)
        scores = scores.masked_fill(~self.mask[:t, :t], torch.finfo(scores.dtype).min)
        probs = torch.softmax(scores, dim=-1)
        y = probs @ v
        return self.out(y.transpose(1, 2).contiguous().view(b, t, c))


class TransformerBlock(nn.Module):
    def __init__(self, dim: int, heads: int, ff: int, max_seq: int):
        super().__init__()
        self.norm1 = RMSNorm(dim)
        self.attn = CausalSelfAttention(dim, heads, max_seq)
        self.norm2 = RMSNorm(dim)
        self.ff = SwiGLU(dim, ff)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.norm1(x))
        return x + self.ff(self.norm2(x))


class FreshUnifiedLM(nn.Module):
    def __init__(self, vocab_size=32000, context_length=2048, hidden_size=512,
                 layers=8, attention_heads=8, feed_forward_size=2048):
        super().__init__()
        self.vocab_size = vocab_size
        self.context_length = context_length
        self.token_embedding = nn.Embedding(vocab_size, hidden_size)
        self.position_embedding = nn.Embedding(context_length, hidden_size)
        self.blocks = nn.ModuleList([
            TransformerBlock(hidden_size, attention_heads, feed_forward_size, context_length)
            for _ in range(layers)
        ])
        self.norm = RMSNorm(hidden_size)
        self.lm_head = nn.Linear(hidden_size, vocab_size, bias=False)
        self.lm_head.weight = self.token_embedding.weight

    def forward(self, input_ids: torch.Tensor, labels: torch.Tensor | None = None):
        b, t = input_ids.shape
        if t > self.context_length:
            raise ValueError(f"sequence length {t} exceeds context {self.context_length}")
        pos = torch.arange(t, device=input_ids.device)
        x = self.token_embedding(input_ids) + self.position_embedding(pos)[None, :, :]
        for block in self.blocks:
            x = block(x)
        logits = self.lm_head(self.norm(x))
        loss = None
        if labels is not None:
            loss = nn.functional.cross_entropy(logits.reshape(-1, self.vocab_size), labels.reshape(-1), ignore_index=-100)
        return logits, loss


def build_fresh_model(spec: dict) -> FreshUnifiedLM:
    return FreshUnifiedLM(
        vocab_size=spec["vocabSize"],
        context_length=spec["contextLength"],
        hidden_size=spec["hiddenSize"],
        layers=spec["layers"],
        attention_heads=spec["attentionHeads"],
        feed_forward_size=spec["feedForwardSize"],
    )
