# Fresh Global Intelligence: architecture decision records

## ADR-001: Modular monolith inside the existing Vite + Vercel app
Context: the mandate assumed Next.js; the repo is a Vite SPA with Vercel functions. Decision: keep it; add server modules under `src/server/search` and expose them through `/api` handlers using the existing `vercelNodeAdapter`. Consequence: no framework migration; long-running crawling cannot live in a 60 s function and will need a scheduled/batch runner (ADR-005).

## ADR-002: PostgreSQL full-text search first, 'simple' config
Context: no `pg_trgm`/`unaccent`/`vector` extensions are enabled; no benchmark exists. Decision: `tsvector` generated column with the language-neutral `simple` config, GIN index, `websearch_to_tsquery`, `ts_rank_cd`. Consequence: works for any language that whitespace-tokenises; no stemming; CJK needs segmentation. Revisit only against the benchmark (roadmap stage 10) before adding vector search or a dedicated engine.

## ADR-003: Extend, don't duplicate, Fresh Intelligence persistence
Decision: `fresh_web_documents.intelligence_source_id` links to `fresh_intelligence_sources`. Evidence and claims keep using `fresh_intelligence_*`. No new sources/entities tables.

## ADR-004: Evidence never asserts stance
Decision: the evidence service returns verbatim passages with provenance and, at most, `direct_support_candidate` when a passage covers every query term; otherwise `unknown`. Support/contradiction/qualification is assigned only by the claim engine (existing `src/core/semantic/evidenceStance.ts` to be evaluated). Rationale: lexical overlap is not verification.

## ADR-005: No new paid or hosted infrastructure
Decision: crawling will be triggered by free mechanisms (Vercel cron within plan limits or GitHub Actions) and persisted to the existing Supabase project. No Supabase branch, plan upgrade or paid API is used or required for slice 1.

## ADR-006: Server-managed tables, service-role only
Decision: new `fresh_web_*` tables have RLS enabled and no client grants, mirroring `fresh_intelligence_evidence`. Search is exposed through authenticated server routes, never directly to the client.
