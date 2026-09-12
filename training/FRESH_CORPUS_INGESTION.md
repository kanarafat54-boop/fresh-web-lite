# Fresh Unified Corpus Ingestion

## Authority-first pipeline

Every training source must pass these gates in order:

1. Identify the source and owner.
2. Record an authorization registry entry.
3. Verify training permission and derivative-model permission.
4. Record evidence and license/restrictions.
5. Run privacy and safety screening.
6. Normalize into the Fresh Unified JSONL schema.
7. Deduplicate against the corpus.
8. Validate quality and curriculum coverage.
9. Hash and freeze the prepared corpus manifest.
10. Only then make it eligible for training.

## Hard rule

**No evidence = no training.** Unknown or unverified sources are rejected by the preparation layer.

## Current state

The repository currently authorizes only the internally authored synthetic starter corpus. It is useful for CI and pipeline validation but is not a production-scale training corpus.

Do not add external datasets to `training/fresh_corpus_authorizations.json` merely because they are publicly downloadable. A public URL is not, by itself, evidence of permission to train a derivative model.

## Required authorization record

Each future source must provide:

- stable authorization ID
- source name and owner
- authority type
- applicable license/permission
- verified training permission
- verified derivative-model permission
- evidence reference
- restrictions
- eligibility status

## Production gate

A production training job must reject the corpus unless every included source is `eligible`, has evidence, and passes privacy/safety/quality checks. Synthetic starter data must remain explicitly labeled as starter data and cannot satisfy the production corpus-size requirement by itself.
