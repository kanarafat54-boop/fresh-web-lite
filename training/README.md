# Fresh Unified Training Backend

This directory is the provider-independent execution boundary for training `fresh-unified-1`.

## Current state

The repository contains contracts, provenance rules, curriculum, and run preparation. A real model checkpoint must only be produced by an actual training backend running on authorized hardware with real data.

The backend added here is intentionally conservative:

- consumes the canonical Fresh JSONL dataset;
- validates provenance markers before training;
- records deterministic dataset hashes;
- requires an explicit accelerator policy for real training;
- never downloads or calls a vendor model/API;
- never creates a checkpoint in `--dry-run` mode;
- writes a checkpoint manifest only after an actual optimizer run completes.

The current starter corpus is too small to represent a useful frontier model. Running it is a **pipeline smoke test**, not evidence that Fresh has acquired broad intelligence.

## Real training requirements

A production run needs:

1. a substantially expanded lawful/public/licensed/authorized corpus;
2. a tokenizer and model architecture selected for `fresh-unified-1`;
3. GPU/accelerator capacity appropriate to that architecture;
4. evaluation and safety gates;
5. durable checkpoint storage and SHA-256 evidence;
6. independent evaluation before serving the checkpoint.

No external AI provider is required by this backend contract.
