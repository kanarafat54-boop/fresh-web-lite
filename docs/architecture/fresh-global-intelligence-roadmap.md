# Fresh Global Intelligence: roadmap

Legend: DONE (verified, see PR), NEXT, LATER. Nothing beyond slice 1 is implemented.

1. **Reconnaissance and baseline: DONE** (`fresh-global-intelligence.md`). Typecheck/lint/build baseline remains BLOCKED until dependencies can be installed (CI will provide it).
2. **Shared contracts and capability reporting: PARTIAL.** `src/server/search/contracts.ts` DONE. Capability-discovery and health endpoints NEXT.
3. **Real search vertical slice: PARTIAL.** Crawl → parse → index → rank → passages verified against a local HTTP fixture; Postgres schema validated locally (idempotent, RLS, denial, removal, language filter). Slice 2 DONE locally: Postgres adapters, atomic write RPCs, authenticated `/api/search/query`, `/web-search` UI. NEXT: apply migrations through the reconciliation process (needs owner authorization), crawl-job endpoints, a free scheduled runner, a first real seed corpus (permitted sources, e.g. public-domain/openly licensed pages) crawled from an environment with egress.
4. **Evidence-backed research: NEXT.** Question → steps → retrieval → passages → existing claim/stance engines → persisted via `fresh_intelligence_*`; reports with citations.
5. **Source expansion and multilingual retrieval: LATER.** Connector registry (open APIs such as Wikipedia/Wikidata, arXiv, OpenAlex, Crossref, PubMed with their terms), per-language configs, CJK segmentation, evaluated by benchmark.
6. **Knowledge graph and bounded AI tools: LATER.** Typed tool contracts, budgets, audit rows, untrusted-content boundary.
7. **Media discovery: LATER.** Reuses media worker contract.
8. **Fresh ecosystem integration: LATER.** Fresh ID ownership, Fresh Flow, Studio.
9. **Security hardening and production verification: LATER, plus R1 (auth/rate limit on `/api/research/search`), DNS-rebinding defence, crawl abuse controls.**
10. **Benchmark-driven expansion: LATER.** Repeatable query sets measuring relevance, citation correctness, freshness, language coverage, latency, cost, before any infrastructure addition.
