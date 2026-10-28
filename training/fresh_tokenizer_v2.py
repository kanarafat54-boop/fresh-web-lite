"""Fresh Unified tokenizer v2: byte-level BPE trained from scratch on the authorized corpus.

Uses the open-source `tokenizers` library as a fast trainer/encoder only. No pretrained
vocabulary, model or weights are downloaded: every merge is learned from Fresh's own
authorized training mix. Special tokens keep the v1 ids: <pad>=0 <bos>=1 <eos>=2 <sep>=3.

  python3 training/fresh_tokenizer_v2.py train  --mix-train mix/train.jsonl.gz --output out/tokenizer-v2.json
  python3 training/fresh_tokenizer_v2.py encode --tokenizer out/tokenizer-v2.json --input mix/train.jsonl.gz --output out/train.bin
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from pathlib import Path

import numpy as np

import fresh_pack as fp

MODEL_ID = "fresh-unified-1"
TOKENIZER_ID = "fresh-unified-tokenizer-v2"
SPECIALS = ["<pad>", "<bos>", "<eos>", "<sep>"]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def read_rows(path: Path):
    opener = gzip.open if path.suffix == ".gz" else open
    with opener(path, "rt", encoding="utf-8") as fh:
        for line in fh:
            if line.strip():
                yield json.loads(line)


def train(mix_train: Path, output: Path, vocab_size: int = 32000) -> dict:
    from tokenizers import Tokenizer, decoders, models, pre_tokenizers, trainers

    tok = Tokenizer(models.BPE(unk_token=None))
    tok.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)
    tok.decoder = decoders.ByteLevel()
    trainer = trainers.BpeTrainer(vocab_size=vocab_size, special_tokens=SPECIALS, show_progress=False,
                                  initial_alphabet=pre_tokenizers.ByteLevel.alphabet())
    texts = (f"{r['input']}\n{r['target']}" for r in read_rows(mix_train))
    tok.train_from_iterator(texts, trainer=trainer)
    for i, name in enumerate(SPECIALS):
        if tok.token_to_id(name) != i:
            raise SystemExit(f"special token {name} must have id {i}")
    output.parent.mkdir(parents=True, exist_ok=True)
    tok.save(str(output))
    manifest = {"schema": "fresh-unified-tokenizer-v2", "modelId": MODEL_ID, "tokenizerId": TOKENIZER_ID,
                "vocabSize": tok.get_vocab_size(), "trainedFrom": "authorized-screened-mix", "datasetSha256": sha256_file(mix_train),
                "tokenizerSha256": sha256_file(output), "productionReady": False,
                "note": "Byte-level BPE learned only from Fresh's authorized corpus mix; no pretrained vocabulary."}
    output.with_suffix(".manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def encode_split(tokenizer_path: Path, input_path: Path, output: Path, chunk: int = 2000) -> dict:
    from tokenizers import Tokenizer

    tok = Tokenizer.from_file(str(tokenizer_path))
    vocab = tok.get_vocab_size()
    parts: list[np.ndarray] = []
    rows_n = 0
    batch: list[dict] = []

    def flush():
        nonlocal batch
        if not batch:
            return
        ins = tok.encode_batch([r["input"] for r in batch])
        outs = tok.encode_batch([r["target"] for r in batch])
        for a, b in zip(ins, outs):
            parts.append(np.asarray([fp.BOS] + a.ids + [fp.SEP] + b.ids + [fp.EOS], dtype=np.uint16))
        batch = []

    for row in read_rows(input_path):
        batch.append(row)
        rows_n += 1
        if len(batch) >= chunk:
            flush()
    flush()
    if vocab > 65535:
        raise SystemExit("vocab too large for uint16")
    stream = np.concatenate(parts) if parts else np.zeros(0, dtype=np.uint16)
    output.parent.mkdir(parents=True, exist_ok=True)
    stream.tofile(output)
    return {"rows": rows_n, "tokens": int(len(stream)), "sha256": sha256_file(output), "output": str(output)}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="cmd", required=True)
    t = sub.add_parser("train")
    t.add_argument("--mix-train", required=True)
    t.add_argument("--output", required=True)
    t.add_argument("--vocab-size", type=int, default=32000)
    e = sub.add_parser("encode")
    e.add_argument("--tokenizer", required=True)
    e.add_argument("--input", required=True)
    e.add_argument("--output", required=True)
    a = ap.parse_args()
    if a.cmd == "train":
        print(json.dumps(train(Path(a.mix_train), Path(a.output), a.vocab_size), indent=2))
    else:
        print(json.dumps(encode_split(Path(a.tokenizer), Path(a.input), Path(a.output)), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
