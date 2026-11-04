"""Import an authorized public Hugging Face dataset into the canonical Fresh JSONL format.

Data only: this never downloads models, tokenizers or weights.

Fail-closed: a source is imported only when `fresh_corpus_authorizations.json` holds an
entry with the same authorizationId whose status is "eligible" and whose training and
derivative-model permissions are "verified". Candidates in
`fresh_corpus_candidates.json` are NOT authorizations; the owner promotes one by adding
an authorization entry after reviewing its license terms.

Usage (needs network access to huggingface.co and `pip install -r requirements-hf.txt`):
  python3 training/import_hf_dataset.py --source oasst1 --output data/fresh-training/oasst1.jsonl --limit 50000
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Iterable, Iterator

from fresh_corpus_policy import load_authorization_registry

# source key -> adapter settings. authorizationId must exist (and be eligible) in the registry.
SOURCES: dict[str, dict] = {
    "oasst1": {"authorizationId": "hf-oasst1", "repo": "OpenAssistant/oasst1", "mode": "oasst", "langs": {"en", "sw", "es", "fr", "de", "pt", "ar"}},
    "dolly": {"authorizationId": "hf-dolly-15k", "repo": "databricks/databricks-dolly-15k", "mode": "dolly"},
    "wikipedia": {"authorizationId": "hf-wikipedia", "repo": "wikimedia/wikipedia", "mode": "titled-article", "default_config": "20231101.sw"},
    "common-corpus": {"authorizationId": "hf-common-corpus", "repo": "PleIAs/common_corpus", "mode": "continuation"},
    "fineweb-edu": {"authorizationId": "hf-fineweb-edu", "repo": "HuggingFaceFW/fineweb-edu", "mode": "continuation", "default_config": "sample-10BT"},
}
MIN_CHARS = 40
MAX_CHARS = 8000


def _row(source_key: str, auth: dict, suffix: str, input_text: str, target: str, extra: dict | None = None) -> dict | None:
    input_text, target = (input_text or "").strip(), (target or "").strip()
    if len(input_text) < 1 or len(target) < MIN_CHARS:
        return None
    digest = hashlib.sha256((input_text + "\n" + target).encode("utf-8")).hexdigest()[:16]
    metadata = {
        "authorizationId": auth["authorizationId"],
        "sourceType": "hf-public-dataset",
        "license": auth["license"],
        "source": SOURCES[source_key]["repo"],
        "system": "You are Fresh AI. Be accurate, safe, and explicit about uncertainty.",
    }
    metadata.update(extra or {})
    return {"id": f"{source_key}-{suffix}-{digest}", "input": input_text[:MAX_CHARS], "target": target[:MAX_CHARS], "metadata": metadata}


def oasst_pairs(messages: Iterable[dict]) -> Iterator[tuple[str, str, str, str]]:
    """Yield (message_id, prompt, reply, lang) for human prompter -> assistant pairs that passed review."""
    by_id = {m["message_id"]: m for m in messages if not m.get("deleted") and m.get("review_result") is not False}
    for m in by_id.values():
        parent = by_id.get(m.get("parent_id"))
        if m.get("role") == "assistant" and parent and parent.get("role") == "prompter":
            yield m["message_id"], parent["text"], m["text"], m.get("lang", "")


def convert(source_key: str, auth: dict, records: Iterable[dict]) -> Iterator[dict]:
    spec = SOURCES[source_key]
    mode = spec["mode"]
    if mode == "oasst":
        for message_id, prompt, reply, lang in oasst_pairs(records):
            if lang in spec["langs"]:
                row = _row(source_key, auth, message_id[:8], prompt, reply, {"lang": lang})
                if row:
                    yield row
        return
    for i, rec in enumerate(records):
        row = None
        if mode == "dolly":
            prompt = rec.get("instruction", "")
            if rec.get("context"):
                prompt += "\n\nContext:\n" + rec["context"]
            row = _row(source_key, auth, str(i), prompt, rec.get("response", ""), {"category": rec.get("category", "")})
        elif mode == "titled-article":
            row = _row(source_key, auth, str(rec.get("id", i)), f"Write an article about: {rec.get('title', '')}", rec.get("text", ""), {"title": rec.get("title", "")})
        elif mode == "continuation":
            text = (rec.get("text") or "").strip()
            if len(text) >= 2 * MIN_CHARS + 200:
                cut = text.rfind(" ", 0, 200)
                cut = cut if cut > 40 else 200
                row = _row(source_key, auth, str(i), "Continue this document:\n" + text[:cut], text[cut:])
        if row:
            yield row


def require_authorization(source_key: str) -> dict:
    spec = SOURCES[source_key]
    registry = load_authorization_registry()
    auth = registry.get(spec["authorizationId"])
    if not auth or auth.get("status") != "eligible":
        raise SystemExit(f"{source_key}: not authorized. Add an eligible entry '{spec['authorizationId']}' to fresh_corpus_authorizations.json after license review.")
    if auth.get("trainingPermission") != "verified" or auth.get("derivativeModelPermission") != "verified" or not auth.get("evidenceRef"):
        raise SystemExit(f"{source_key}: training/derivative permission or evidence is not verified.")
    return auth


def load_records(source_key: str, config: str | None, limit: int) -> Iterator[dict]:
    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit("Requires: pip install -r training/requirements-hf.txt") from exc
    spec = SOURCES[source_key]
    cfg = config or spec.get("default_config")
    stream = spec["mode"] != "oasst"  # oasst needs the full message tree to pair replies
    ds = load_dataset(spec["repo"], cfg, split="train", streaming=stream) if cfg else load_dataset(spec["repo"], split="train", streaming=stream)
    for i, rec in enumerate(ds):
        if stream and i >= limit * 3:  # headroom for rows dropped by filters
            break
        yield rec


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, choices=sorted(SOURCES))
    parser.add_argument("--output", required=True)
    parser.add_argument("--config", default=None, help="Dataset config, e.g. 20231101.sw for wikipedia")
    parser.add_argument("--limit", type=int, default=10000)
    args = parser.parse_args()

    auth = require_authorization(args.source)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    seen: set[str] = set()
    count = 0
    h = hashlib.sha256()
    with out.open("w", encoding="utf-8") as fh:
        for row in convert(args.source, auth, load_records(args.source, args.config, args.limit)):
            if row["id"] in seen:
                continue
            seen.add(row["id"])
            line = json.dumps(row, ensure_ascii=False)
            fh.write(line + "\n")
            h.update(line.encode("utf-8"))
            count += 1
            if count >= args.limit:
                break
    print(json.dumps({"source": args.source, "rows": count, "output": str(out), "sha256": h.hexdigest()}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
