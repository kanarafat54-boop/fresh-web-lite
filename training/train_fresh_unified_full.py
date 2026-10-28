"""Fresh Unified full training loop (GPU, resumable). Provider-independent, from-scratch weights.

Inputs are produced by build_training_mix.py (authorized rows only) and fresh_tokenizer_v2.py
(train.bin / validation.bin token streams). Writes resumable checkpoints and, at the end, a
checkpoint manifest that is explicitly NOT production-ready: promotion needs held-out
evaluation, safety review and grounding tests (see docs/FRESH_AI_READINESS_AUDIT.md).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import time
from pathlib import Path

import numpy as np

import fresh_pack as fp

MODEL_ID = "fresh-unified-1"
DEFAULT_PROMPTS = [
    "What is Fresh Web Lite?",
    "Explain the difference between known and uncertain information.",
    "Andika makala kuhusu Uganda.",
]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--train-bin", required=True)
    ap.add_argument("--val-bin", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--spec", default=str(Path(__file__).with_name("model_spec.json")))
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--run-id", default="fresh-unified-1-run2")
    ap.add_argument("--seq-len", type=int, default=1024)
    ap.add_argument("--micro-batch", type=int, default=8)
    ap.add_argument("--accum", type=int, default=8)
    ap.add_argument("--epochs", type=float, default=3.0)
    ap.add_argument("--max-steps", type=int, default=0, help="Override computed steps (use small values for a smoke test)")
    ap.add_argument("--lr", type=float, default=6e-4)
    ap.add_argument("--warmup", type=int, default=100)
    ap.add_argument("--eval-every", type=int, default=200)
    ap.add_argument("--save-every", type=int, default=200)
    ap.add_argument("--eval-blocks", type=int, default=128)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--mix-manifest", default=None)
    ap.add_argument("--compile", action="store_true", help="torch.compile the training forward pass (try in the smoke test first)")
    args = ap.parse_args()

    import torch
    from fresh_model import build_fresh_model

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    if spec["modelId"] != MODEL_ID:
        raise SystemExit("spec is not bound to fresh-unified-1")
    if args.seq_len > spec["contextLength"]:
        raise SystemExit(f"--seq-len {args.seq_len} exceeds model context {spec['contextLength']}")

    out = Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    train = np.fromfile(args.train_bin, dtype=np.uint16)
    val = np.fromfile(args.val_bin, dtype=np.uint16)
    batch_blocks = args.micro_batch * args.accum
    blocks = fp.n_blocks(len(train), args.seq_len)
    if blocks < batch_blocks:
        raise SystemExit(f"train stream too small: {blocks} blocks < batch of {batch_blocks}")
    max_steps = args.max_steps or fp.steps_for(blocks, batch_blocks, args.epochs)
    tokens_per_step = batch_blocks * args.seq_len
    print(f"train_tokens={len(train):,} val_tokens={len(val):,} blocks={blocks:,} steps={max_steps:,} tokens/step={tokens_per_step:,}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    torch.manual_seed(args.seed)
    model = build_fresh_model(spec).to(device)
    n_params = sum(p.numel() for p in model.parameters())
    print(f"device={device} params={n_params / 1e6:.1f}M")
    use_bf16 = device == "cuda" and torch.cuda.is_bf16_supported()
    amp_dtype = torch.bfloat16 if use_bf16 else torch.float16
    use_amp = device == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=use_amp and not use_bf16)

    decay = [p for p in model.parameters() if p.ndim >= 2]
    no_decay = [p for p in model.parameters() if p.ndim < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": no_decay, "weight_decay": 0.0}],
                            lr=args.lr, betas=(0.9, 0.95), fused=(device == "cuda"))

    last = out / "last.pt"
    step = 0
    resumed_loss = float("nan")
    if last.exists():
        ck = torch.load(last, map_location=device)
        model.load_state_dict(ck["model"])
        opt.load_state_dict(ck["optimizer"])
        if ck.get("scaler"):
            scaler.load_state_dict(ck["scaler"])
        step = ck["step"]
        resumed_loss = ck.get("train_loss", float("nan"))
        print(f"resumed from step {step}")

    def autocast():
        return torch.amp.autocast("cuda", dtype=amp_dtype, enabled=use_amp)

    @torch.no_grad()
    def evaluate() -> float:
        model.eval()
        count = min(args.eval_blocks, fp.n_blocks(len(val), args.seq_len))
        if count == 0:
            model.train()
            return float("nan")
        losses = []
        for i in range(0, count, args.micro_batch):
            pairs = [fp.get_block(val, j, args.seq_len) for j in range(i, min(i + args.micro_batch, count))]
            x = torch.from_numpy(np.stack([p[0] for p in pairs])).to(device)
            y = torch.from_numpy(np.stack([p[1] for p in pairs])).to(device)
            with autocast():
                _, loss = model(x, y)
            losses.append(float(loss) * len(pairs))
        model.train()
        return sum(losses) / count

    def save_last():
        tmp = out / "last.pt.tmp"
        torch.save({"model": model.state_dict(), "optimizer": opt.state_dict(), "scaler": scaler.state_dict(), "step": step,
                    "train_loss": train_loss}, tmp)
        os.replace(tmp, last)

    model.train()
    train_model = torch.compile(model) if args.compile else model
    batches = fp.iter_batches(train, args.seq_len, batch_blocks, step, args.seed)
    t0, session_tokens, train_loss, val_loss = time.time(), 0, resumed_loss, float("nan")
    while step < max_steps:
        xs, ys = next(batches)
        lr = fp.cosine_lr(step, warmup=args.warmup, max_steps=max_steps, peak=args.lr)
        for g in opt.param_groups:
            g["lr"] = lr
        opt.zero_grad(set_to_none=True)
        total = 0.0
        for m in range(args.accum):
            sl = slice(m * args.micro_batch, (m + 1) * args.micro_batch)
            x = torch.from_numpy(xs[sl]).to(device)
            y = torch.from_numpy(ys[sl]).to(device)
            with autocast():
                _, loss = train_model(x, y)
            scaler.scale(loss / args.accum).backward()
            total += float(loss.detach()) / args.accum
        scaler.unscale_(opt)
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        scaler.step(opt)
        scaler.update()
        step += 1
        session_tokens += tokens_per_step
        train_loss = total
        if not math.isfinite(total):
            raise SystemExit(f"non-finite loss at step {step}; stopping (checkpoint kept at last save)")
        if step % 10 == 0 or step == 1:
            rate = session_tokens / max(1e-9, time.time() - t0)
            print(f"step {step}/{max_steps} loss {total:.4f} lr {lr:.2e} {rate:,.0f} tok/s")
        if step % args.eval_every == 0 or step == max_steps:
            val_loss = evaluate()
            print(f"  eval step {step}: val_loss {val_loss:.4f} ppl {math.exp(val_loss):.1f}")
        if step % args.save_every == 0 or step == max_steps:
            save_last()

    if math.isnan(val_loss):
        val_loss = evaluate()
    final = out / f"{args.run_id}.pt"
    torch.save({"model_id": MODEL_ID, "tokenizer_id": "fresh-unified-tokenizer-v2", "state_dict": model.state_dict(), "seed": args.seed}, final)
    smoke = max_steps < 200
    manifest = {
        "schema": "fresh-unified-checkpoint-v1", "modelId": MODEL_ID, "runId": args.run_id, "executionStatus": "completed",
        "tokenizerId": "fresh-unified-tokenizer-v2", "tokenizerSha256": sha256_file(Path(args.tokenizer)),
        "trainBinSha256": sha256_file(Path(args.train_bin)), "valBinSha256": sha256_file(Path(args.val_bin)),
        "mixManifestSha256": sha256_file(Path(args.mix_manifest)) if args.mix_manifest else None,
        "checkpointSha256": sha256_file(final), "parameters": n_params, "steps": step, "seqLen": args.seq_len,
        "tokensSeen": step * tokens_per_step,
        "finalTrainLoss": train_loss if math.isfinite(train_loss) else None, "heldOutLoss": val_loss,
        "heldOutPerplexity": math.exp(val_loss) if math.isfinite(val_loss) else None, "device": device,
        "pipelineSmokeTest": smoke, "productionReady": False,
        "evaluation": {"heldOutLM": "done" if math.isfinite(val_loss) else "missing", "safetyReview": "pending",
                       "groundingAndTruthEval": "pending", "capabilityEval": "pending"},
        "note": "Real optimizer run on the authorized, screened mix. Not promoted: weightsStatus stays training-required until the evaluation gates pass.",
    }
    (out / f"{args.run_id}.manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))

    # Short qualitative samples (no KV cache; fine for a handful of tokens).
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(args.tokenizer)
    model.eval()
    lines = []
    for prompt in DEFAULT_PROMPTS:
        ids = [fp.BOS] + tok.encode(prompt).ids + [fp.SEP]
        for _ in range(80):
            x = torch.tensor([ids[-spec["contextLength"]:]], device=device)
            with torch.no_grad(), autocast():
                logits, _ = model(x)
            probs = torch.softmax(logits[0, -1].float() / 0.8, dim=-1)
            top = torch.topk(probs, 40)
            nxt = int(top.indices[torch.multinomial(top.values / top.values.sum(), 1)])
            if nxt == fp.EOS:
                break
            ids.append(nxt)
        text = tok.decode(ids[len(tok.encode(prompt).ids) + 2:])
        lines.append(f"PROMPT: {prompt}\nREPLY: {text}\n")
    (out / f"{args.run_id}.samples.txt").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
