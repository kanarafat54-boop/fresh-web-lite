"""Fast architecture smoke test for Fresh Unified v1."""
from __future__ import annotations

import json
from pathlib import Path
import sys

import torch

from fresh_model import build_fresh_model

root = Path(__file__).resolve().parent.parent
spec = json.loads((root / "training" / "model_spec.json").read_text(encoding="utf-8"))
model = build_fresh_model(spec)
model.eval()

ids = torch.tensor([[1, 10, 11, 12, 2]], dtype=torch.long)
with torch.no_grad():
    logits, loss = model(ids, ids)

assert logits.shape == (1, ids.shape[1], spec["vocabSize"])
assert loss is not None and torch.isfinite(loss)
assert len(model.blocks) == spec["layers"]
assert model.blocks[0].attn.heads == spec["attentionHeads"]
assert model.blocks[0].attn.head_dim == spec["hiddenSize"] // spec["attentionHeads"]
print("Fresh Unified model smoke test: PASS")
print(f"architecture={spec['architecture']}")
print(f"parameters={sum(p.numel() for p in model.parameters())}")
