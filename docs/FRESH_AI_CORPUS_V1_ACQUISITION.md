# Fresh AI Corpus V1 — Authorized Intelligence Foundation

## Purpose

This stage prepares the first real training-corpus intake process for `fresh-unified-1` without silently treating public availability as training permission.

## Hard rules

1. Unknown authorization is blocked.
2. A candidate source is never production-eligible merely because it is public, downloadable, open, or labeled public domain.
3. Every promoted source needs an authorization record, evidence reference, provenance, privacy review, safety review, quality review, deduplication result, and content hash.
4. Candidate sources remain blocked until project-specific legal review confirms the intended model-training use.
5. Production promotion is an explicit action and is never granted by ingestion or dataset preparation.
6. The starter synthetic corpus is for pipeline validation only and is not meaningful pretraining data.

## V1 intake flow

`discovery → candidate registry → license/permission evidence → legal review → authorization registry → controlled acquisition → content hashing → privacy → safety → quality → deduplication → dataset transformation → training manifest → explicit promotion`

## Current candidates

### Wikimedia text

The Wikimedia Foundation states that most Wikimedia text is available under CC BY-SA 4.0 and/or GFDL, with attribution and share-alike obligations. The exact license for each source must be identified and downstream model-training treatment must be reviewed before promotion. The current Fresh registry therefore keeps this candidate blocked.

### Project Gutenberg

Project Gutenberg states that most qualifying ebooks are unrestricted under U.S. copyright law, but copyright status can differ by jurisdiction and some works are included under permissions from copyright holders. Its main website also restricts automated bulk access and directs bulk acquisition toward permitted mirrors/catalogs. Fresh therefore requires item-level rights verification and an approved acquisition route before any Gutenberg content can enter a training shard.

## Evidence standard

A review packet must record:

- candidate ID
- source name and canonical source URL
- license/rights statement URL
- jurisdiction assumptions
- acquisition method and whether automation is permitted
- intended training use
- commercial training requirement
- derivative-model requirement
- attribution/share-alike obligations
- privacy and personal-data risk
- safety/content risk
- evidence retrieval date
- reviewer status
- final decision

## Promotion decision

Only `approved` review packets may be represented in the authorization registry. `review-required`, `blocked`, `expired`, and `rejected` packets cannot be ingested as production training data.

This document is an engineering governance contract, not legal advice or a substitute for counsel where rights are uncertain.
