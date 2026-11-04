"""Torch-free scoring helpers for Fresh model evaluation (unit-testable without a GPU)."""
from __future__ import annotations

import math
import re
from collections import defaultdict

PASS_THRESHOLD = 0.5  # fraction of key terms that must appear for a recall answer to count as correct

SW_WORDS = {"na", "ya", "wa", "kwa", "ni", "katika", "la", "za", "cha", "huko", "pia", "kama", "hii", "huu", "yake", "wake", "nchi", "mji"}
EN_WORDS = {"the", "and", "of", "to", "in", "is", "was", "for", "with", "that", "as", "by", "on", "are", "from", "an", "it"}


def keyword_score(answer: str, keywords: list[str]) -> float:
    """Fraction of key terms present (case-insensitive substring) in the generated answer."""
    if not keywords:
        return 0.0
    text = answer.lower()
    return sum(1 for k in keywords if k.lower() in text) / len(keywords)


def guess_lang(text: str) -> str:
    words = re.findall(r"[a-zA-Z']+", text.lower())[:400]
    sw = sum(1 for w in words if w in SW_WORDS)
    en = sum(1 for w in words if w in EN_WORDS)
    return "sw" if sw > en else "en"


def group_of(row: dict) -> str:
    """Evaluation group for a validation row: fresh-docs, oasst1, dolly, wikipedia-sw, wikipedia-en, or fresh-other."""
    rid = row.get("id", "")
    if rid.startswith("fresh-docs-qa"):
        return "fresh-docs"
    if rid.startswith("oasst1-"):
        return "oasst1"
    if rid.startswith("dolly-"):
        return "dolly"
    if rid.startswith("wikipedia-"):
        return "wikipedia-" + guess_lang(row.get("target", ""))
    return "fresh-other"


def recall_summary(results: list[dict]) -> dict:
    """results: [{'score': float}] -> overall and pass-rate."""
    if not results:
        return {"questions": 0, "meanKeywordRecall": None, "passRate": None}
    scores = [r["score"] for r in results]
    return {"questions": len(scores), "meanKeywordRecall": sum(scores) / len(scores),
            "passRate": sum(1 for s in scores if s >= PASS_THRESHOLD) / len(scores)}


def perplexity_by_group(items: list[tuple[str, float, int]]) -> dict:
    """items: (group, summed_nll, token_count) -> {group: {'tokens', 'loss', 'perplexity'}} (token-weighted)."""
    nll: dict[str, float] = defaultdict(float)
    toks: dict[str, int] = defaultdict(int)
    for g, s, n in items:
        nll[g] += s
        toks[g] += n
    out = {}
    for g in sorted(nll):
        loss = nll[g] / max(1, toks[g])
        out[g] = {"tokens": toks[g], "loss": loss, "perplexity": math.exp(loss)}
    return out


def stride_sample(items: list, limit: int) -> list:
    """Deterministic evenly spaced subset (keeps coverage of all docs)."""
    if limit <= 0 or limit >= len(items):
        return list(items)
    step = len(items) / limit
    return [items[int(i * step)] for i in range(limit)]
