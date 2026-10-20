# Fresh AI continuous learning: guarded implementation contract

## Purpose

Fresh AI should improve from research outcomes, user corrections, tool failures, and evaluation results. Improvement is a measured loop, not a claim that the deployed model silently retrains itself after every conversation.

## Runtime learning loop

1. **Understand:** interpret the actual request and use recent conversation context only where relevant.
2. **Research:** when facts are external, current, disputed, or explicitly requested with sources, use a configured research service; retain source URLs, dates, snippets, and provenance.
3. **Synthesize and verify:** rank relevant evidence, compare independent sources, detect contradictions, and preserve unknowns. Platform architecture documents are not evidence for unrelated public facts.
4. **Collect feedback safely:** feedback can become a training candidate only after explicit training opt-in and human review. Ordinary private chats are not training data by default.
5. **Prepare candidates:** `scripts/prepare-fresh-learning-candidates.mjs` validates consent, review status, provenance, IDs, size, and obvious credential leakage, then emits JSONL plus a hash manifest.
6. **Evaluate:** add reviewed failures to repeatable regression tests; evaluate baseline and candidate behavior on factuality, grounding, instruction-following, safety, and task completion.
7. **Train offline:** run the existing Fresh dataset/tokenizer/training pipeline against an authorized dataset. A prepared dataset is not a trained model.
8. **Promote only after gates:** verify checkpoint provenance, reproducibility, regression/safety evaluations, rollback readiness, and explicit promotion approval before serving new weights.

## What self-improvement can do now

- Learn operationally through retrieval, authorized durable memory, corrected knowledge, and regression tests.
- Build a reviewed training-candidate dataset and use the repository's existing tokenizer/training scripts.
- Generate measurable improvement proposals from failures and evaluation results.

## What it must not claim yet

- It must not say that a conversation changed model weights.
- It must not train on private chats without explicit opt-in and review.
- It must not self-promote untested checkpoints or rewrite safety/security policy.
- It must not say that live research happened unless a real research tool returned usable sources.
- It must not present the starter corpus or one-step smoke checkpoint as a production-quality trained foundation model.

## Current gaps

- The application needs a dependable, monitored research provider in its deployment environment; the existing API intentionally returns no evidence when retrieval is unavailable.
- The authenticated `POST /api/ai/feedback` endpoint handles ordinary ratings and versioned explicit-consent training corrections in one serverless function, records the consent ledger row, and creates a preference pair marked for human review. This consolidation also avoids adding another Vercel serverless function. It does not update model weights.
- The consent migration has been applied to the connected Fresh Web Lite Supabase project, and the table/RLS state was verified. New environments must still apply repository migrations. The Fresh AI UI asks for explicit confirmation before sending training consent; no client should send consent implicitly.
- The reviewed candidate preparer is a guarded offline stage, not an autonomous online training daemon.
- Fresh-native production model weights and a serving backend must be built, evaluated, and deployed separately.
