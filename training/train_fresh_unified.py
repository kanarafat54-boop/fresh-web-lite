"""Provider-independent Fresh Unified v1 training entrypoint."""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
from pathlib import Path

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v1"
PAD, BOS, EOS, SEP = 0, 1, 2, 3


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


def load_fresh_tokenizer(path: Path):
    """Load and use the canonical Fresh trained-tokenizer implementation."""
    training_dir = Path(__file__).resolve().parent
    if str(training_dir) not in sys.path:
        sys.path.insert(0, str(training_dir))
    from fresh_trained_tokenizer import encode, load_tokenizer

    manifest, merges = load_tokenizer(path)
    if manifest.get("modelId") != MODEL_ID:
        raise ValueError("Tokenizer is not bound to fresh-unified-1")
    if manifest.get("tokenizerId") != TOKENIZER_ID:
        raise ValueError("Tokenizer ID mismatch")
    if manifest.get("vocabSize") != 32000:
        raise ValueError("Tokenizer vocabulary must be 32000")
    if manifest.get("status") != "starter-trained":
        raise ValueError("Unsupported tokenizer training status")
    if manifest.get("productionReady") is not False:
        raise ValueError("Starter tokenizer cannot be marked production-ready")
    return manifest, encode, merges


def make_examples(rows: list[dict], context: int, encode, merges):
    for row in rows:
        ids = [BOS] + encode(row["input"], merges) + [SEP] + encode(row["target"], merges) + [EOS]
        ids = ids[:context]
        if len(ids) >= 2:
            yield ids[:-1], ids[1:]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--tokenizer", required=True)
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
    tokenizer_path = Path(args.tokenizer)
    output = Path(args.output)
    spec_path = Path(__file__).with_name("model_spec.json")
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    if spec["modelId"] != MODEL_ID:
        raise SystemExit("Model spec is not bound to fresh-unified-1")
    rows = load_dataset(dataset)
    tokenizer_manifest, encode, merges = load_fresh_tokenizer(tokenizer_path)
    digest = sha256_file(dataset)
    tokenizer_digest = sha256_file(tokenizer_path)
    if tokenizer_manifest.get("datasetSha256") != digest:
        raise SystemExit("Tokenizer was not trained from this exact dataset")
    print(f"model={MODEL_ID}\nexamples={len(rows)}\ndataset_sha256={digest}")
    print(f"tokenizer={TOKENIZER_ID}\ntokenizer_sha256={tokenizer_digest}\nmerges={len(merges)}")
    print("tokenizer_binding=canonical-fresh-trained-tokenizer")

    if args.dry_run or not args.train:
        print("status=planned")
        print("checkpoint=not-created")
        print("Training backend dry-run PASS; no weights were created.")
        return 0

    random.seed(args.seed)
    torch.manual_seed(args.seed)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = FreshUnifiedLM(
        vocab_size=spec["vocabSize"],
        context_length=spec["contextLength"],
        hidden_size=spec["hiddenSize"],
        layers=spec["layers"],
        attention_heads=spec["attentionHeads"],
        feed_forward_size=spec["feedForwardSize"],
    ).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=3e-4)
    examples = list(make_examples(rows, spec["contextLength"], encode, merges))
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
    torch.save({"model_id": MODEL_ID, "tokenizer_id": TOKENIZER_ID, "state_dict": model.state_dict(), "seed": args.seed}, output)
    checkpoint_sha = sha256_file(output)
    manifest = {
        "schema": "fresh-unified-checkpoint-v1",
        "modelId": MODEL_ID,
        "tokenizerId": TOKENIZER_ID,
        "executionStatus": "completed",
        "datasetSha256": digest,
        "tokenizerSha256": tokenizer_digest,
        "checkpointSha256": checkpoint_sha,
        "steps": max(1, args.steps),
        "finalLoss": last_loss,
        "device": str(device),
        "pipelineSmokeTest": True,
        "note": "Starter corpus checkpoint using the canonical Fresh trained-subword tokenizer; not production or frontier training."
    }
    output.with_suffix(output.suffix + ".json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"status=completed\ncheckpoint={output}\ncheckpoint_sha256={checkpoint_sha}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
