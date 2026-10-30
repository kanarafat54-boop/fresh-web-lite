"""Evaluate a Fresh Unified checkpoint: Fresh-knowledge recall + per-source held-out perplexity.

  python3 training/eval_fresh_model.py --checkpoint X.pt --tokenizer tokenizer-v2.json \
     --recall-eval data/fresh-eval/fresh-knowledge-recall-v1.jsonl --validation mix/validation.jsonl.gz --out report.json

Recall: greedy answers to held-out question phrasings, scored by key-term recall (fresh_eval.py).
Perplexity: token-weighted held-out loss per group (fresh-docs, oasst1, dolly, wikipedia-sw, wikipedia-en...),
so Swahili quality is measured separately from English. Safety/truthfulness evaluation is NOT covered here.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from pathlib import Path

import fresh_eval as fe
import fresh_pack as fp


def read_jsonl(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as fh:
        return [json.loads(l) for l in fh if l.strip()]


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--tokenizer", required=True)
    ap.add_argument("--spec", default=str(Path(__file__).with_name("model_spec.json")))
    ap.add_argument("--recall-eval", required=True)
    ap.add_argument("--validation", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--label", default="eval")
    ap.add_argument("--limit-recall", type=int, default=150)
    ap.add_argument("--limit-per-group", type=int, default=100)
    ap.add_argument("--max-new-tokens", type=int, default=120)
    ap.add_argument("--seq-len", type=int, default=1024)
    args = ap.parse_args()

    import torch
    from tokenizers import Tokenizer
    from fresh_model import build_fresh_model

    device = "cuda" if torch.cuda.is_available() else "cpu"
    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    model = build_fresh_model(spec).to(device)
    ck = torch.load(args.checkpoint, map_location=device)
    model.load_state_dict(ck.get("state_dict") or ck["model"])
    model.eval()
    tok = Tokenizer.from_file(args.tokenizer)
    use_amp = device == "cuda"

    def forward(x, y=None):
        with torch.no_grad(), torch.amp.autocast("cuda", dtype=torch.float16, enabled=use_amp):
            return model(x, y)

    # ---- recall ----
    questions = fe.stride_sample(read_jsonl(Path(args.recall_eval)), args.limit_recall)
    results = []
    for q in questions:
        ids = [fp.BOS] + tok.encode(q["input"]).ids + [fp.SEP]
        start = len(ids)
        for _ in range(args.max_new_tokens):
            x = torch.tensor([ids[-spec["contextLength"]:]], device=device)
            logits, _ = forward(x)
            nxt = int(logits[0, -1].argmax())
            if nxt == fp.EOS:
                break
            ids.append(nxt)
        answer = tok.decode(ids[start:])
        results.append({"id": q["id"], "question": q["input"], "answer": answer, "keywords": q["keywords"],
                        "score": fe.keyword_score(answer, q["keywords"])})
    recall = fe.recall_summary(results)

    # ---- per-group held-out perplexity ----
    rows = read_jsonl(Path(args.validation))
    by_group: dict[str, list[dict]] = {}
    for r in rows:
        by_group.setdefault(fe.group_of(r), []).append(r)
    items = []
    for group, grows in by_group.items():
        for r in fe.stride_sample(grows, args.limit_per_group):
            ids = (fp.row_to_ids(r, lambda t: tok.encode(t).ids))[: args.seq_len + 1]
            if len(ids) < 3:
                continue
            x = torch.tensor([ids[:-1]], device=device)
            y = torch.tensor([ids[1:]], device=device)
            logits, _ = forward(x)
            nll = torch.nn.functional.cross_entropy(logits[0].float(), y[0], reduction="sum")
            items.append((group, float(nll), len(ids) - 1))
    ppl = fe.perplexity_by_group(items)

    report = {"schema": "fresh-eval-report-v1", "label": args.label, "device": device,
              "checkpointSha256": hashlib.sha256(Path(args.checkpoint).read_bytes()).hexdigest(),
              "recallEvalFile": args.recall_eval, "recall": recall, "perplexityByGroup": ppl,
              "recallExamples": results[:12],
              "notCovered": ["safety", "truthfulness/abstention", "instruction-following quality", "tool use"]}
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[{args.label}] recall: mean keyword recall {recall['meanKeywordRecall']:.3f}, pass rate {recall['passRate']:.3f} over {recall['questions']} questions")
    for g, v in ppl.items():
        print(f"[{args.label}] perplexity {g}: {v['perplexity']:.1f} ({v['tokens']:,} tokens)")
    for r in results[:3]:
        print(f"Q: {r['question']}\nA: {r['answer'][:300]}\n(score {r['score']:.2f})\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
