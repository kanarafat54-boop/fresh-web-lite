# Fresh Global Intelligence: current system and slice 1

Status: 2026-10-24, branch `feat/fresh-global-intelligence-search-slice`, base `main` @ `5bf0b2d`.
Everything below is marked **verified** (observed in this session) or **unverified**.

## 1. What the repository actually is

| Mandate assumption | Verified reality |
|---|---|
| Next.js application | **Vite 6 + React 19 SPA** (`vite.config.ts`, `vercel.json` framework `vite`) with **Vercel serverless functions** in `/api` (Web `Request`/`Response` handlers wrapped by `src/server/vercelNodeAdapter.ts`). There is no Next.js. |
| Supabase/PostgreSQL | Project `Fresh Web Lite` (`fwbbyowalnfckpmbutcz`, us-east-2, Postgres 17, ACTIVE_HEALTHY). 102 migration files in `supabase/migrations`. |
| Vercel | Project `fresh-web-lite`. Latest listed deployments are previews of `fix/fresh-research-provenance-confidence` (READY). **Production deployment identity at `https://fresh-web-lite.vercel.app` was not verified.** |
| Media worker | `workers/media-worker` (Docker, `render.yaml`, free plan). |

The repository already contains a large body of work: 187 remote branches, 60+ docs, 61 `test:*` scripts and 16 CI workflows. Several branches touch research and search (`fix/fresh-research-provenance-confidence`, `claude/discovery-search-and-p0-evidence`, `feat/native-fresh-intelligence-core`). Slice 1 was built to avoid editing any file those branches are likely to touch (all new files, plus `package.json` script entries and one workflow).

## 2. Component and dependency map (current)

```
Browser SPA (src/features/*, src/app/*)
  ├─ Fresh AI UI ──► /api/ai/{ask,stream,conversations,feedback,files,upload,generate-avatar}
  ├─ TrueMode / research UI ──► /api/research/search ──► Tavily (third-party, TAVILY_API_KEY)
  │                                  └─► src/server/research/{orchestrator,persistSemanticResearchV2}
  │                                        └─► Supabase fresh_intelligence_* (claims, evidence, sources, entities, lineage, truth decisions)
  ├─ Discovery / Fresh Flow search ──► src/features/fresh-flow/core/searchService.ts
  │                                        └─► RPC search_posts_fulltext / search_shorts_fulltext (posts, shorts only)
  ├─ Mail ──► /api/mail ;  Admin ──► /api/admin/users ;  Finance ──► /api/finance/treasury ;  Shorts ──► /api/shorts/telemetry
  └─ Supabase client (src/lib/supabase.ts), Fresh ID (src/features/fresh-id)
src/core/{research,semantic,knowledge,fresh-ai,...}   pure TS engines (claims, temporal truth, provenance, contradiction, graph)
workers/media-worker  (ffmpeg, token-protected)       training/ + data/fresh-training  (Fresh model workstream, separate)
```

**New in slice 1 (`src/server/search/`)**: `contracts` (shared interfaces), `url` (canonicalisation, SSRF guard, hashing), `robots`, `crawler` (polite fetcher), `parser` (HTML → text, language, dates, passages), `ranking` (BM25), `memoryIndex` (reference IndexWriter + SearchProvider), `evidence`, `pipeline` (crawl → parse → index with retries). Migration `20261024090000_fresh_web_index_foundation.sql` adds the Postgres persistence shape. No existing route, table or component was modified.

## 3. Existing search and intelligence persistence (verified live)

- Live row counts: `fresh_search_documents` 0, `fresh_intelligence_sources` 58, `_entities` 7, `_claims` 11, `_evidence` 57.
- RLS is enabled on all `fresh_intelligence_*`, `fresh_search_documents`, `fresh_knowledge_*` and `fresh_ai_*` tables. Three tables (`fresh_intelligence_sources`, `_entities`, `_evidence`) have a `SELECT ... USING (true)` policy for `anon, authenticated`: **public read** (see risk R3).
- Postgres extensions `pg_trgm`, `unaccent`, `vector`, `pg_cron`, `pgmq` are **not enabled**. Only built-in full-text search is available without a configuration change.
- Existing full-text search covers only `posts` and `shorts` (English config). `fresh_search_documents` exists but is empty and unused.
- Reconciliation decision: new `fresh_web_documents.intelligence_source_id` references `fresh_intelligence_sources(id)`. Evidence/claims continue to use the existing tables; no competing copy of sources/entities is created.

## 4. Baseline (this session, Node 22.22.0, Linux)

`npm ci` **could not run**: the sandbox network policy rejects `registry.npmjs.org` (HTTP 403 on CONNECT, DNS failure when direct). Therefore **typecheck, lint, build and any test that needs `node_modules` (esbuild) were not run**. This is an environment block, not a repository result.

All 61 `npm run test:*` scripts were executed with plain Node: **52 pass, 9 fail**. The 9 failures are pre-existing/environmental and were not changed:

| Script | Cause (from output) |
|---|---|
| `test:fresh-training-model`, `test:fresh-training-backend` | Python `torch` not installed in sandbox |
| `test:fresh-training-run-record` | requires a `<record.json>` argument (not runnable bare) |
| `test:truemode-claim-comparisons`, `test:truemode-persistence-rpc`, `test:fresh-research-api-dry-run` | need `esbuild` from `node_modules` (blocked install) |
| `test:fresh-ai-conversation-awareness` | assertion: "feedback API stores corrections without explicit consent" (repo-level failure on `main`) |
| `test:fresh-ai-engine-ownership` | assertion: "Media worker identity check changed" (repo-level failure on `main`) |
| `test:fresh-expanded-corpus` | printed PASS (108 examples) but exited non-zero in this sandbox; cause not investigated |

The two assertion failures (`conversation-awareness`, `engine-ownership`) look like genuine `main` regressions; they belong to Fresh AI/media workstreams and were left untouched.

## 5. Risk register

| ID | Risk | Evidence | Mitigation / owner |
|---|---|---|---|
| R1 | `/api/research/search` has **no authentication or rate limit**; each call spends a third-party Tavily quota | `api/research/search.ts` reads body and calls Tavily with no auth check | Slice 2: require auth + per-user limit. Not changed here (file is owned by other open branches). |
| R2 | Research depends on a third-party provider (Tavily), contrary to the independence goal | same file | Fresh index slice builds the independent path; Tavily becomes one provider behind `SearchProvider` |
| R3 | Public (`anon`) read on `fresh_intelligence_sources/entities/evidence` | live `pg_policies`: `qual = true` | Acceptable only while all content is public-web derived. Must be revisited before any user-private research is stored. |
| R4 | Migration history drift between repo and live DB | `docs/SUPABASE_MIGRATION_DRIFT_2026-10-23.md`, `docs/engineering/supabase-migration-history-reconciliation.md` (not reviewed in depth) | New migration is additive and idempotent; apply only through the existing reconciliation process. |
| R5 | Crawler SSRF / abuse | n/a (new code) | Literal private-IP/internal-host block, robots.txt, size/time/redirect caps, per-host delay. **DNS-rebinding defence not implemented** (resolved IPs are not re-checked). |
| R6 | CI cannot install dependencies here, so tsc/lint/build are unverified for new code | baseline block | New code follows `tsconfig.app.json` (`erasableSyntaxOnly`, no parameter properties, `.ts` import extensions) but **has not been type-checked**. CI on the PR must confirm. |
| R7 | Two failing `main` tests mask regressions | §4 | Owners of Fresh AI / media worker |
| R8 | Many parallel branches (187) increase merge-conflict and drift risk | `git ls-remote` | File-ownership boundaries below |

## 6. Reusable components and duplicates

Reuse: `src/core/semantic/*` (claim graph, temporal truth, evidence stance/independence/lineage, provenance), `src/server/research/persistSemanticResearchV2.ts` (writes to `fresh_intelligence_*`), `src/core/knowledge/FreshKnowledgeGraph.ts`, `fresh_knowledge_*` tables, `vercelNodeAdapter`, `fresh_ai_*` memory/conversation tables, media worker contract.

Apparent duplicates to reconcile (observed by filename, not yet diffed): research orchestration exists in `src/core/research/researchOrchestrator.ts`, `src/core/semantic/researchOrchestrator.ts` and `src/server/research/orchestrator.ts`; claim/evidence provenance is split across `evidenceProvenance.ts`, `sourceProvenance.ts`, `researchProvenance.ts`. Slice 1 adds none of these; it does not touch them.

## 7. Required capabilities: absent or unverified

| Capability | Status |
|---|---|
| Fresh-controlled crawler → index → retrieval | **Slice 1: working against a local fixture only.** Never run against the public web from this sandbox (egress blocked). Postgres adapter for `IndexWriter`/`SearchProvider` **not written** (schema validated, code pending). |
| Crawl scheduling / job runner | Table exists; no scheduler or worker. Needs a free trigger (Vercel cron or GitHub Actions); not enabled. |
| Multilingual search | Language-neutral lexical only; verified on one French fixture. No per-language stemming, CJK segmentation, or benchmark. |
| Research orchestration with step plan and claim↔evidence stance | Existing engines unverified end to end; not wired to the new index. |
| Knowledge graph queries, bounded AI tool runtime, media discovery | Not started (graph tables exist; contents unverified). |
| Evaluation benchmark | Not started. |
| Production deployment verification | Not done; no deploy authorized. |
| Fresh-owned image model | Out of scope here; no inference attempted or claimed. |

## 8. File-ownership boundaries (for parallel work)

- Workstream A (search/index): `src/server/search/**`, `supabase/migrations/*fresh_web_*`.
- Workstream B (evidence/research/graph): `src/server/research/**`, `src/core/semantic/**`; consumes `src/server/search/contracts.ts` only.
- Workstream C (AI runtime/API): `api/**`; must not redefine contracts.
- Workstream D (security/test): `scripts/test-*`, `.github/workflows/**`.
- Shared files (`contracts.ts`, migrations, auth code) change only by PR reviewed against all four.
