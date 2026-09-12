"""Provider-independent Fresh Unified v1 training entrypoint."""
from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path

MODEL_ID = "fresh-unified-1"
PAD = 0
BOS = 1
EOS = 2
SEP = 3
BYTE_OFFSET = 4
VOCAB_SIZE = 260


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_dataset(path: Path) -> list[dict]:
    rows = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        row = json.loads(line)
        if not row.get("id") or not row.get("input") or not row.get("target"):
            raise ValueError(f"Invalid training example at line {line_no}")
        rows.append(row)
    if not rows or len({r["id"] for r in rows}) != len(rows):
        raise ValueError("Dataset is empty or contains duplicate IDs")
    return rows


def encode(text: str) -> list[int]:
    return [BYTE_OFFSET + b for b in text.encode("utf-8")]


def make_examples(rows: list[dict], context: int):
    for row in rows:
        ids = [BOS] + encode(row["input"]) + [SEP] + encode(row["target"]) + [EOS]
        if len(ids) > context:
            ids = ids[:context]
        if len(ids) < 2:
            continue
        yield ids[:-1], ids[1:]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--train", action="store_true")
    parser.add_argument("--steps", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    try:
        import torch
        from fresh_model import FreshUnifiedLM
    except ImportError as exc:
        raise SystemExit(f"PyTorch training backend unavailable: {exc}") from exc

    dataset = Path(args.dataset)
    output = Path(args.output)
    if not dataset.is_file():
        raise SystemExit(f"Dataset not found: {dataset}")
    rows = load_dataset(dataset)
    digest = sha256_file(dataset)
    print(f"model={MODEL_ID}\nexamples={len(rows)}\ndataset_sha256={digest}")

    if args.dry_run or not args.train:
        print("status=planned")
        print("checkpoint=not-created")
        print("Training backend dry-run PASS; no weights were created.")
        return 0

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FreshUnifiedLM(vocab_size=VOCAB_SIZE, context_length=2048, hidden_size=256,
                           layers=4, attention_heads=8, feed_forward_size=1024).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)
    examples = list(make_examples(rows, 2048))
    if not examples:
        raise SystemExit("No trainable examples")

    model.train()
    last_loss = None
    for step in range(max(1, args.steps)):
        inp, labels = examples[step % len(examples)]
        x = torch.tensor(inp, dtype=torch.long, device=device).unsqueeze(0)
        y = torch.tensor(labels, dtype=torch.long, device=device).unsqueeze(0)
        optimizer.zero_grad(set_to_none=True)
        _, loss = model(x, y)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        optimizer.step()
        last_loss = float(loss.detach().cpu())

    output.parent.mkdir(parents=True, exist_ok=True)
    torch.save({"model_id": MODEL_ID, "state_dict": model.state_dict(), "seed": args.seed}, output)
    checkpoint_sha = sha256_file(output)
    manifest = {
        "schema": "fresh-unified-checkpoint-v1",
        "modelId": MODEL_ID,
        "executionStatus": "completed",
        "datasetSha256": digest,
        "checkpointSha256": checkpoint_sha,
        "steps": max(1, args.steps),
        "finalLoss": last_loss,
        "device": str(device),
        "pipelineSmokeTest": True,
        "note": "Small architecture and starter corpus; not a production or frontier checkpoint."
    }
    output.with_suffix(output.suffix + ".json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"status=completed\ncheckpoint={output}\ncheckpoint_sha256={checkpoint_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
