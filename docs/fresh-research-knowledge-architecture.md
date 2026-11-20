# Fresh Research Knowledge Architecture Upgrade

**Status:** Engineering audit and implementation specification  
**Repository:** `kanarafat54-boop/fresh-web-lite`  
**Base:** `main`  
**Date:** 20 November 2026

## Executive decision

Fresh Research should evolve from a source-backed web-search interface into a knowledge system that discovers, indexes, connects, verifies, and refreshes information. This must extend the existing Fresh Research, Fresh Intelligence, TRUEMODE, and Fresh Knowledge systems—not replace them with a parallel stack.

The first implementation sequence is deliberately conservative: establish a source/document index contract and connect it to the existing research pipeline only after persistence, privacy, provenance, and retrieval behavior are covered by tests. Do not introduce a new database or duplicate existing knowledge tables.

## Audit findings

### Existing capabilities to preserve

| Capability | Evidence in repository | Current boundary |
| --- | --- | --- |
| Web research | `api/research/search.ts` | Tavily is the primary web retrieval provider; deep/global modes already issue multiple passes. |
| Global discovery | `src/core/discovery/globalDiscovery.ts`, `/api/discover` | Existing free/keyless discovery covers News, Music, Books, Learn, and Research; it is not yet a unified general web index. |
| Adaptive news recovery | `api/research/search.ts`, PR #316 | Additional news retrieval is conditional on weak news/domain coverage. |
| Evidence passports | `src/core/research/evidencePassport.ts` | Captures source metadata and excerpt digest; explicitly does not authenticate publishers or prove claim truth. |
| Sentence-to-passage mapping | `src/core/research/claimEvidence.ts` | Deterministic word/number overlap with exact quote offsets; not semantic entailment. |
| Durable passage persistence | PR #320; `fresh_intelligence_claim_passages` migration | Exact passage provenance is persisted atomically with graph/passport writes; statement claims remain uncertain. |
| TRUEMODE graph and truth pipeline | `src/server/research/persistSemanticResearchV2.ts` | Existing claim comparison, stance, arbitration, and truth-decision pipeline must remain authoritative. |
| Request protection | PR #318; `src/server/research/rateLimit.ts` | Durable per-client quotas and fail-closed behavior are already implemented in the research route. |
| Private graph boundary | PR #319 | Browser-role access to shared research graph tables is revoked; service-side persistence remains. |
| Platform-document retrieval | `src/core/fresh-ai/FreshAIPlatformKnowledge.ts`; `search_fresh_platform_knowledge` | Existing Postgres full-text retrieval is for Fresh platform knowledge, not a general external-web corpus. |
| Knowledge retrieval evaluation | `scripts/test-fresh-knowledge-retrieval.sh`; 428 held-out questions | Existing benchmark measures platform-document retrieval (hit@1 and hit@4); do not misrepresent it as external-web search quality. |
| Knowledge graph primitives | `supabase/migrations/20260922181208_fresh_knowledge_graph_v1.sql` | Alias and entity-relation tables exist, but are server-managed and not yet integrated as a complete entity extraction/resolution pipeline in Fresh Research. |

### Production snapshot (20 November 2026)

Read-only checks against the live Supabase project found 33 Fresh Intelligence entities, 298 source rows, 77 immutable Evidence Passports, and 24 exact claim-passage records. The Fresh Knowledge Graph alias and entity-relation tables both contain zero rows. This confirms that the graph schema exists but the research runtime has not yet populated its multilingual aliases or durable entity relationships. Two missing foreign-key indexes on the passage ledger were added in production and verified. The production migration history was also compared with the repository; the passport, private-graph, and passage migration filenames in this branch are aligned to their already-applied production versions without editing migration history.

### Confirmed gaps

1. **No general-purpose external source index.** Research sources are retrieved for a request and persisted into the evidence/claim graph, but there is no demonstrated crawl queue, canonical document index, or scheduled refresh pipeline for arbitrary external web content.
2. **Entity resolution is not research-grade.** `src/core/semantic/entityResolution.ts` uses an in-memory `semanticStore` and token-set similarity. Its thresholds can conflate namesakes; it is not a safe durable entity-resolution service.
3. **The research route does not use the platform knowledge retriever as an external knowledge index.** These are different corpora and must remain distinct.
4. **Query fanout is basic.** Deep/global currently have a small number of same-provider passes; adaptive news is a targeted extra pass. There is no general facet planner with budget and provider-aware deduplication.
5. **Source deduplication is limited.** Exact URL deduplication does not reliably group canonical URLs, syndicated copies, or sources that share an upstream report. PR #321 adds conservative canonical URL identity, deduplicates before source/domain counts, remaps claim provenance to the retained URL, and safely excludes malformed provider URL values. This is a first identity layer, not yet a durable external document index.
6. **Vertical typing is partly heuristic.** A URL/date-derived kind is not sufficient proof that a result is a news, image, video, academic, local, person, or organization record.
7. **Private per-user research workspaces are not established.** Projects, saved sources, notes, research jobs, monitors, and user-scoped memory need a separate, explicitly authorized design.

## Target architecture

```text
Fresh Research UI
  -> Intent and query planner
  -> Budgeted query fanout
  -> Provider adapters and existing Global Discovery
  -> Canonical source/document index
  -> Entity candidates and relationship extraction
  -> TRUEMODE evidence and contradiction verification
  -> Fresh Intelligence graph + Evidence Passports + passage ledger
  -> Research synthesis, citations, and explainable result views
  -> Freshness scheduler and monitored refresh
```

### 1. Discovery and provider adapters

- Keep Tavily as the current web provider adapter.
- Reuse existing Global Discovery providers where their license, freshness, and response contracts permit.
- Add dedicated academic/news/local/media providers only after provider terms, attribution, rate limits, and stable identifiers are documented.
- A provider outage should produce a partial-result warning when remaining evidence is usable; never fabricate fallback results.
- Query expansion must be bounded by the existing request quota and a per-run provider-call budget.

### 2. Canonical source/document index

Use the existing source and evidence records as the provenance foundation. Before creating new tables, define a canonical document identity and inspect whether existing Fresh Intelligence tables can safely support it.

Minimum document fields:
- stable internal document ID;
- canonical URL and observed URL;
- title, publisher/domain, provider, language, and content type;
- published time (nullable) and observed/retrieved time;
- captured excerpt or licensed content pointer;
- content fingerprint and extraction version;
- source lineage / syndication group;
- robots, license, retention, and takedown metadata;
- last-seen and next-refresh timestamps.

Do not copy entire websites by default. Respect robots directives, provider terms, copyright, privacy, and retention requirements. Start with metadata and permitted excerpts.

### 3. Knowledge graph and entity resolution

- Extract entity *candidates* separately from accepted entities.
- Preserve exact source/passage provenance for every candidate and relationship.
- Namesakes must remain separate unless there is sufficient discriminating evidence (type, geography, dates, identifiers, and context).
- Similarity scores are candidate-ranking signals only; never silently merge entities or treat similarity as truth.
- Persist aliases and relationships through the existing service-only graph boundary.
- Record the extraction method/version and confidence calibration status.
- Human review is required for ambiguous high-impact merges.

### 4. Query fanout and intent

- Detect intent (lookup, current events, academic, local, comparison, investigation, learning, decision support).
- Build a small set of independently useful subqueries with explicit facets.
- Track which facet each result answers; deduplicate canonical documents and upstream source lineages.
- Stop when evidence coverage is sufficient or the run budget is exhausted.
- Show missing facets and provider limitations instead of filling gaps with speculation.

### 5. Verification and synthesis

- TRUEMODE remains the gate for claim/evidence status and downstream action.
- A matching passage is provenance support, not proof of truth.
- Independent-source diversity must account for syndicated copies and shared upstream sources.
- Preserve contradictions and temporal changes; do not average away disagreement.
- Keep answer-statement claims uncertain unless the existing truth pipeline has independently justified a stronger status.
- Every user-facing factual statement should retain traceable evidence or be labelled as background/uncertain.

### 6. Freshness and monitoring

- Refresh only records with a justified freshness policy (for example, current news versus stable reference material).
- Store observed time separately from publication/event time.
- Re-fetch changed metadata/excerpts, issue a new fingerprinted observation, and retain historical lineage.
- Detect dead links, changed pages, moved URLs, and stale claims.
- Scheduled work must be bounded, observable, cancellable, and governed by the same permissions and provider budgets.

## Implementation phases and acceptance criteria

### Phase 0 — Baseline and safety (this audit)

- Preserve the existing API response contracts, evidence passport semantics, passage ledger, TRUEMODE behavior, and service-only database boundary.
- Reconcile the repository's migration names with production migration history; do not rewrite historical migration records to make names appear aligned.
- Treat PR #318, #319, and #320 as merged code/CI work. Their successful Actions runs are not, by themselves, proof that every production deployment or live data path is healthy.
- PR #317 is an older open draft superseded in scope by merged PR #318; do not merge it blindly.

### Phase 1 — Canonical source identity contract

PR #321 implements the initial pure canonicalization and synthesis integration. The durable external document index remains future work.

Acceptance:
- URL normalization is deterministic and preserves the originally observed URL.
- Canonicalization removes only known tracking parameters and normalizes safe URL components; it does not erase meaningful query parameters.
- Syndication/upstream lineage is represented separately from domain count.
- Duplicate imports are idempotent.
- Fingerprints change when captured content changes.
- Every indexed item retains provider, license/retention, publication/observation time, and evidence provenance.
- Unit and PostgreSQL integration tests cover redirects, invalid URLs, duplicate URLs, canonical collisions, and content changes.

### Phase 2 — Research entity candidates and graph integration

Acceptance:
- Candidate extraction is distinct from entity acceptance.
- Namesake tests prove that same-name people/places/organizations are not automatically merged.
- Aliases and relations preserve exact source/passage provenance.
- Persisted graph writes remain service-role only and atomic where related records must succeed together.
- No heuristic entity match can independently promote a claim to verified truth.

### Phase 3 — Budgeted query fanout

Acceptance:
- Each subquery has a recorded facet and rationale.
- Provider calls obey durable quota and per-run budget.
- Partial failures are visible and do not discard successful evidence.
- Canonical/syndicated duplicates do not inflate independent-source counts.
- Tests cover zero results, provider outage, duplicate syndication, and exhausted budgets.

### Phase 4 — Knowledge freshness and refresh

Acceptance:
- Refresh policies vary by content class and are configurable.
- Changed content creates a new observation/fingerprint without overwriting history.
- Dead links and changed pages are surfaced.
- Scheduler execution is bounded, idempotent, observable, and cancellable.

### Phase 5 — User research workspaces and explainable results

Acceptance:
- Projects, saved sources, notes, and monitors are user-scoped with RLS and explicit ownership.
- Private user queries are not written into shared public knowledge.
- Exported reports preserve citations, evidence passages, dates, and limitations.
- UI works on small Android viewports and low-memory devices.

## Non-goals and guardrails

- Do not build a Google-scale crawler or claim to index the whole web.
- Do not scrape sites against their terms or ignore robots/copyright restrictions.
- Do not create a second knowledge database beside Supabase without a measured need.
- Do not expose private graph or user research data to browser roles.
- Do not treat model-generated entity links, URL categories, word overlap, or source count as proof.
- Do not weaken TRUEMODE to make results look more complete.
- Do not merge or deploy a research change until required Actions, migration replay, security checks, and the relevant preview/runtime checks pass.

## Immediate next engineering slice

Implement Phase 2 as a durable, service-only entity-candidate pipeline. Start by extracting conservative candidates from public source titles and permitted excerpts, linking every candidate to source/passport/passage provenance, and marking all candidates pending review. Do not auto-merge namesakes or promote candidate extraction into truth. Only after candidate persistence, privacy, idempotency, and namesake regression tests pass should accepted aliases and relations be written into the existing Fresh Knowledge Graph. This directly addresses the production finding that the current alias/relation tables are empty without prematurely creating an uncontrolled crawler or public knowledge dump.
