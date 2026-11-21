# Fresh Search: baseline and plan

Status of Fresh Search against the "20x research engine" brief. The original capability baseline was measured at `2c5097ec`; production database and main-branch state were rechecked on 20 Nov 2026 at `bcf1eaeb`.
Everything here was read from the code, the live Supabase catalog (read-only queries, no row contents), GitHub Actions, or a test run. Where something could not be checked, it says so.

## In one paragraph

Fresh Search today is a **single-vendor web search (Tavily) with an organized results screen, source Evidence Passports, and sentence-to-passage evidence checks** (#313, #315, #316). The latest upgrade also adds adaptive current-news recovery, clearer publisher cards, and durable request quotas (#316, #318). Remaining gaps: (1) Images, Video and News are still partly inferred from URLs rather than consistently served by dedicated providers; (2) there is no private, per-user research memory (projects, saved sources, notes, jobs, monitors); (3) the legacy research graph still has public-read policies and excessive browser-role grants. The passport ledger and quota RPC are now present in production. The public graph access boundary is being addressed in PR #319.

## Capability matrix

Status: **Implemented** (works and is checked), **Partial**, **Heuristic** (exists, but guesses), **Missing**.

| Capability | Status | Evidence | Gap |
| --- | --- | --- | --- |
| Web retrieval | Implemented, one vendor | `api/research/search.ts` calls Tavily; without `TAVILY_API_KEY` it answers 503 | One paid vendor. Whether the key is set in production was not checked |
| Free, keyless retrieval for News, Music, Books, Learn, Research | Implemented | `src/core/discovery/globalDiscovery.ts`, `/api/discover` (#312). Live CI run and Vercel preview checked | Separate panel in Fresh Flow; not part of Fresh Search results |
| Dedicated verticals (Images, Video, News, Local, People, Organizations) | **Heuristic / Missing** | `sourceKind()` in `api/research/search.ts` labels a result "video" or "music" from its host, "image" from its file ending, and "news" when it has any date (or always in `live` mode) | The Images, Video and News tabs filter these guesses. No image, video, local, people or organization provider exists |
| Academic | Partial | OpenAlex is used, but only in the Fresh Flow Research panel | Not in Fresh Search; no DOI-keyed records |
| Organized results screen | Implemented | `FreshResearchResults.tsx` (#313). Phone layout checked at 390 px | Tabs depend on the guessed kinds above |
| De-duplication | Partial | `uniqueByUrl` in `src/server/research/orchestrator.ts` (exact URL) | No canonical or syndicated-copy grouping |
| Evidence Passport (per source) | Implemented and persisted | `src/core/research/evidencePassport.ts`; live ledger migration `20261120151100` and graph-plus-passports RPC are present in production | Repository migration filename differs from the production version; keep the mapping in Phase 0B reconciliation |
| **Claim to exact passage** | **New in this change (v1)** | `src/core/research/claimEvidence.ts`; `scripts/verify-claim-evidence.mjs` | Deterministic word-and-number match, not understanding. Computed per response, not stored |
| Claim model before this change | Was a gap | `buildClaims` made one claim per research pass: the whole answer, linked to all of that pass's sources | Still true for the stored graph (`fresh_intelligence_claims`) |
| Confidence | Heuristic | 0.7 with three or more sources, else 0.5; stance from word overlap and negation words (`src/core/semantic/evidenceStance.ts`) | Not calibrated. Shown as "system assessment" |
| Conflict analysis | Partial | `compareClaims` between the two passes of deep/global mode | Both passes come from the same vendor |
| Entity resolution | Missing in the research path | `src/core/semantic/entityResolution.ts` exists but only `index.ts` exports it; research stores the query as one "concept" entity | No namesake-safe handling of results |
| Timeline | Missing | Passports keep published and observed time separately | No event time, no timeline view |
| Research projects, saved sources, notes, jobs, monitors | **Missing** | Live catalog has none (only unrelated `fresh_projects`, `fresh_ai_missions`, `fresh_media_jobs`) | Phase 2 of the plan |
| Export of reports and source ledgers | Missing | None found | |
| Retrieved text treated as data | Implemented in the research path | The answer is written by the search vendor. Fresh only string-matches it (`claimEvidence.ts` has a test with an injected "ignore previous instructions" page) | `/api/ai/ask` was not audited |
| Endpoint protection | Partial | Query capped at 2,000 characters, sources at 16, 60 s limit | `POST /api/research/search` has no sign-in and no rate limit, and every call spends vendor credit |

## Database and security findings (live project, read-only)

- **F1, resolved in production: Evidence Passport ledger and quota RPC are present.** The live migration ledger includes `20261120151100` (`fresh_intelligence_evidence_passports`) and `20261120151112` (`fresh_research_rate_limits`); the graph-plus-passports RPC and quota RPC both exist. The passport RPC was smoke-tested transactionally with rollback, and the quota RPC was verified against the minute/hour/day limits and least-privilege grants in the #317/#318 rollout. One reconciliation detail remains: the repository passport migration file is named `20261118203000_...`, while production records the applied version as `20261120151100`; preserve that mapping in the Phase 0B migration reconciliation rather than rewriting production history.
- **F2, resolved in production (checked 21 Nov 2026): the research graph is no longer readable with the public key.** It was world-readable and held search words (#319). The live catalog now shows row security on and zero policies on every `fresh_intelligence_*` table, so only the server can read them. Search words are still stored in the graph as an entity label, which is acceptable only while it stays server-only; private per-user research memory (Phase 5 of the architecture plan) still needs its own owner-scoped design.
- **F3, resolved in production (checked 21 Nov 2026): the extra table grants are gone.** `anon` and `authenticated` hold no privileges on the `fresh_intelligence_*` tables, and the persistence and quota functions are executable by `service_role` only (#319, #320).
- **F4, note: the passport table itself is well shaped.** Row security on, all privileges revoked from `public`, `anon` and `authenticated`, service role only, and a trigger rejects UPDATE and DELETE. Not protected: TRUNCATE (no guard) and the table owner. It references sources with `on delete restrict`, so removing a source (a user or legal takedown) needs a defined process, because the ledger cannot be edited. The passport ID includes the observation time, so one source seen twice has two passports; they are linked only by the source and fingerprint.
- Tables with row security off: none found among the research tables. `fresh_intelligence_evidence_lineage`, `_persistence_batches`, `_truth_decisions` and `fresh_knowledge_entity_*` have row security on and no policies, so only the server can read them.

## What this change adds: claim to passage (v1)

Each sentence of the answer is checked against the exact text Fresh captured for each source (the passport's fingerprinted excerpt).

- A sentence is **backed** when a captured passage contains most of its distinctive words and all of its numbers, and does not negate it. The result carries the exact quote, its position in the fingerprinted text, the matched words and the source's dates.
- A sentence is **not confirmed** when no passage does. It says why: too short, no passage with these words, a source with similar words but different numbers, a source that says the opposite, or no source text captured.
- The screen re-checks every quote against the passport in the same response and refuses to show one that does not match.
- Fresh's own caveats ("Fresh found potentially conflicting evidence...") are shown as notes, not claims.

**What it does not do.** It does not prove a sentence is true, understand meaning, or tell namesakes apart. A passage can contain the same words and still disagree. The limits travel with every result and are shown in the screen. The mapper sits behind a small contract (quote, offsets, method name), so a stronger judge can replace it later without changing the screen or the tests.

**Follow-up after review (21 Nov 2026).** A minus sign now counts: "-5 million" does not support "5 million", and the dash in a range such as "5-10" is not a sign (a plus sign is ignored). Very long answers are checked up to a limit (8,000 characters or 40 statements); the rest stays on screen under "Not checked against sources" instead of disappearing. Quotes are re-checked against every returned source, not only the de-duplicated list shown under the answer.

Checks: `scripts/verify-claim-evidence.mjs` (run by `npm run test:truemode-chain`): splitting, wrong numbers, opposite passages, tampered quotes, injected instructions, one passage per source, bounded time on hostile input. The research endpoint was also run end to end locally against a simulated provider. A browser check at 390 px and 1100 px covers the screen.

## Plan

1. **Done:** baseline and claim-to-passage v1; adaptive news/source UX recovery (#316); durable request quotas and fail-closed provider protection (#318); production Evidence Passport ledger and quota RPC.
2. **Done:** public read and write access to the legacy research graph removed while service-role persistence is preserved (#319).
3. **Done:** claim-to-passage links are persisted (claim, passport, exact quote offsets, matching method) in `fresh_intelligence_claim_passages` (#320).
4. **Real providers, verticals honest:** Academic from OpenAlex (DOI, authors), News from publisher feeds and GDELT, Books and encyclopedic from the catalogs already built in #312, all as Fresh Search sources with passports. Stop guessing kinds from addresses: a web result with no dedicated provider is labeled "web".
5. **Private research memory:** owner-scoped projects, saved sources, notes, and long-running jobs, with row-security tests.
6. **Then:** entity resolution (namesake safe), timelines (event vs publication vs observation time), conflict analysis across providers, monitoring and alerts, export.

Risks: one search vendor (cost and outage); free catalogs have their own limits (GDELT answered HTTP 429 and timed out in our checks); a stronger claim judge needs a model, which has a cost and must stay replaceable; the production migration and any row-security change are one-way decisions for the owner.

## Not checked

Whether `TAVILY_API_KEY` is set in production; Vercel runtime logs; speed on a low-end Android phone; the `/api/ai/ask` research path; the older open PRs #133, #134, #135, #139, #142 (Fresh Global Intelligence, Oct 2026) and #262 (knowledge search v2), which must be read before any Fresh-owned index or crawler is built, to avoid duplicating them.

## Reproduce

```
ls api/**/*.ts                       # 12 functions, the Hobby limit
grep -n "sourceKind" api/research/search.ts
node --no-warnings scripts/verify-claim-evidence.mjs
```
Live catalog (read-only): `select relname, relrowsecurity from pg_class ...`, `select * from pg_policies where tablename like 'fresh_intelligence%'`, `select proname from pg_proc where proname like 'persist_fresh_intelligence%'`, `select version from supabase_migrations.schema_migrations order by 1 desc limit 3`.
