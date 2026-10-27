"""Screen a canonical Fresh JSONL corpus before it can be used for training.

Stdlib only. Never calls a model or the network. For each row it:
  * DROPS rows holding secrets (API keys, private keys, tokens, card numbers),
  * DROPS rows that look pasted from another company's AI (outside-model provenance),
  * DROPS rows matching the optional local blocklist (training/screening_blocklist.txt),
  * REDACTS emails, phone numbers and IPs (replaced by placeholders),
  * DROPS exact and near duplicates (normalized text, prefix key).
Writes the screened JSONL (optionally .gz) and a JSON report with counts per reason.

Usage:
  python3 training/screen_corpus.py --input data/fresh-training/oasst1.jsonl.gz \
      --output data/fresh-training/oasst1.screened.jsonl.gz --report training/screening-reports/oasst1.json
"""
from __future__ import annotations

import argparse
import collections
import gzip
import hashlib
import json
import re
from pathlib import Path
from typing import Iterable, Iterator

SECRET_PATTERNS = {
    "private-key": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    "aws-key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
    "github-token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{30,}\b"),
    "openai-style-key": re.compile(r"\bsk-[A-Za-z0-9_-]{20,}\b"),
    "slack-token": re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}\b"),
    "jwt": re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    "password-assignment": re.compile(r"(?i)\b(password|passwd|api[_-]?key|secret)\s*[:=]\s*['\"]?[^\s'\"]{8,}"),
}
OUTSIDE_AI_MARKERS = re.compile(
    r"(?i)\b(as an ai language model|as a large language model|i am an ai language model|"
    r"i'?m an ai language model|openai|chat ?gpt|gpt-?[345]|bard|gemini ai|claude by anthropic|"
    r"i('| a)m sorry, but i (can(no|')t|am unable)|my training data (only )?(goes|extends|ends) )"
)
EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE = re.compile(r"(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]\d{3,4}[\s.-]?\d{0,4}(?![\w.])")
IPV4 = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
CARD = re.compile(r"\b(?:\d[ -]?){13,19}\b")
WS = re.compile(r"\s+")


def luhn_ok(digits: str) -> bool:
    total, alt = 0, False
    for ch in reversed(digits):
        d = int(ch)
        if alt:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        total += d
        alt = not alt
    return total % 10 == 0


def has_card(text: str) -> bool:
    for m in CARD.finditer(text):
        digits = re.sub(r"\D", "", m.group())
        if 13 <= len(digits) <= 19 and luhn_ok(digits):
            return True
    return False


def load_blocklist(path: Path | None) -> list[re.Pattern]:
    if not path or not path.exists():
        return []
    return [re.compile(re.escape(l.strip()), re.I) for l in path.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]


def _phone_sub(m: re.Match) -> str:
    return "[PHONE]" if 10 <= len(re.sub(r"\D", "", m.group())) <= 15 else m.group()


def _ip_sub(m: re.Match) -> str:
    parts = [int(x) for x in m.group().split(".")]
    if any(x > 255 for x in parts):
        return m.group()
    a, b = parts[0], parts[1]
    private = a in (0, 10, 127) or (a == 192 and b == 168) or (a == 172 and 16 <= b <= 31) or (a == 169 and b == 254)
    return m.group() if private else "[IP]"


def redact(text: str) -> tuple[str, int]:
    n = 0
    text, k = EMAIL.subn("[EMAIL]", text)
    n += k
    for pat, fn in ((PHONE, _phone_sub), (IPV4, _ip_sub)):
        text = pat.sub(fn, text)
    return text, n + text.count("[PHONE]") + text.count("[IP]")


def norm(text: str) -> str:
    return WS.sub(" ", re.sub(r"[^\w\s]", "", text.lower())).strip()


def screen(rows: Iterable[dict], blocklist: list[re.Pattern] | None = None) -> Iterator[tuple[dict | None, str]]:
    """Yield (row_or_None, reason). reason is 'kept' or the drop reason."""
    blocklist = blocklist or []
    seen_exact: set[str] = set()
    seen_prefix: set[str] = set()
    for row in rows:
        text = f"{row.get('input', '')}\n{row.get('target', '')}"
        secret = next((name for name, p in SECRET_PATTERNS.items() if p.search(text)), None)
        if secret or has_card(text):
            yield None, f"secret:{secret or 'card-number'}"
            continue
        if OUTSIDE_AI_MARKERS.search(text):
            yield None, "outside-ai-provenance"
            continue
        if any(p.search(text) for p in blocklist):
            yield None, "blocklist"
            continue
        inp, n1 = redact(row["input"])
        tgt, n2 = redact(row["target"])
        key = hashlib.sha256(norm(inp + " " + tgt).encode()).hexdigest()
        prefix = hashlib.sha256((norm(inp)[:120] + "|" + norm(tgt)[:160]).encode()).hexdigest()
        if key in seen_exact:
            yield None, "duplicate-exact"
            continue
        if prefix in seen_prefix:
            yield None, "duplicate-near"
            continue
        seen_exact.add(key)
        seen_prefix.add(prefix)
        out = dict(row, input=inp, target=tgt)
        out["metadata"] = dict(row.get("metadata") or {}, screened="fresh-screen-v1", redactions=n1 + n2)
        yield out, "kept" if not (n1 + n2) else "kept-redacted"


def open_text(path: Path, mode: str):
    return gzip.open(path, mode + "t", encoding="utf-8") if path.suffix == ".gz" else path.open(mode, encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--report", required=True)
    ap.add_argument("--blocklist", default=str(Path(__file__).with_name("screening_blocklist.txt")))
    args = ap.parse_args()
    counts: collections.Counter = collections.Counter()
    h = hashlib.sha256()
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open_text(Path(args.input), "r") as src, open_text(out_path, "w") as dst:
        rows = (json.loads(l) for l in src if l.strip())
        for row, reason in screen(rows, load_blocklist(Path(args.blocklist))):
            counts[reason] += 1
            if row:
                dst.write(json.dumps(row, ensure_ascii=False) + "\n")
    report = {"schema": "fresh-screening-report-v1", "input": args.input, "output": args.output,
              "inputRows": sum(counts.values()), "keptRows": counts["kept"] + counts["kept-redacted"], "counts": dict(counts)}
    report["outputSha256"] = hashlib.sha256(out_path.read_bytes()).hexdigest()
    Path(args.report).parent.mkdir(parents=True, exist_ok=True)
    Path(args.report).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
