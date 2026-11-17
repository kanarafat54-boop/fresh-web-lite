# Fresh Database Phase 0C — Object-Level Reconciliation Snapshot

Date: 2026-11-17  
Repository: `kanarafat54-boop/fresh-web-lite`  
Baseline: Phase 0B head `140d589e7d9d456fd5069276502debd8c902bc10`  
Production project: `fwbbyowalnfckpmbutcz`

## Safety boundary

This phase is read-only against production. The catalog queries used only PostgreSQL metadata and bounded bucket metadata; no application rows, secrets, or user content were exported. No production DDL/DML, migration application, migration-ledger edits, storage object changes, or runtime/configuration changes were made. The work branch is isolated from `main`.

## Object evidence for the 15 unresolved repository migrations

The Phase 0B list of 15 unresolved migrations was checked against the current production catalog. Presence of an object is evidence that the object exists today; it does **not** establish which migration created it or prove that every statement in the migration ran.

| Repository migration | Object-level observation | Disposition |
|---|---|---|
| `20260906090000_fresh_intelligence_foundation.sql` | All seven target relations exist: sources, entities, claims, claim relations, evidence, claim evidence, evidence lineage | Relations confirmed; compare full columns/constraints/policies/functions before mapping |
| `20261014140100_seed_fresh_ai_platform_knowledge.sql` | Seed-only migration; no unique DDL object to identify its execution | Unresolved; compare deterministic seed keys/content hashes and idempotency |
| `20261014140200_fresh_ai_master_matrix_knowledge.sql` | Seed-only migration | Unresolved; compare deterministic seed keys/content hashes and idempotency |
| `20261014140300_fresh_ai_full_text_search.sql` | `fresh_ai_knowledge` exists and `search_fresh_platform_knowledge(text, integer)` exists | Function confirmed; generated column and index still require exact catalog-definition comparison |
| `20261014140400_fresh_ai_outside_ai_knowledge.sql` | Seed-only migration | Unresolved; compare deterministic seed keys/content hashes and idempotency |
| `20261014193000_fresh_communication_tables_foundation.sql` | Both `fresh_communication_threads` and `fresh_communication_messages` exist | Relations confirmed; compare full access and FK contracts |
| `20261014210000_allow_fresh_picks_feed_mode.sql` | Live feed-mode CHECK constraint currently allows `for-you`, `social`, `learn`, `relax`, `others` | Exact repository check constraint is not the same as the file's intended `fresh-picks` addition; investigate later migrations/current product contract |
| `20261016090000_fresh_ai_correction_loop.sql` | `approve_fresh_ai_correction(uuid)` exists; SECURITY INVOKER; execute ACL observed only for postgres and service_role | Function confirmed; inspect body and dependent knowledge/preference constraints before mapping |
| `20261019090000_fresh_profile_privacy_settings.sql` | `profile_privacy_settings` exists; production policies observed are owner INSERT, owner UPDATE, and public-read SELECT | Not an exact policy-name/behavior match to the repository file's four owner CRUD policies; security semantics require deliberate review |
| `20261021200000_fresh_ai_platform_docs_knowledge.sql` | Seed-only migration (215 documentation sections per source comment) | Unresolved; compare deterministic document IDs/hashes and content revision behavior |
| `20261027100000_direct_messages_replayable_read_policies.sql` | Three policies currently observed: participant SELECT, recipient mark-read UPDATE, sender INSERT | Object surface confirmed; compare predicates and WITH CHECK clauses to migration SQL |
| `20261030213000_fresh_long_video_storage_bucket_provision.sql` | `post-videos` bucket exists, public, 52,428,800-byte limit | Bucket metadata confirmed; inspect all Storage policies and MIME list before mapping |
| `20261103150000_fresh_short_audience_lens.sql` | `fresh_short_audience_lens(uuid)` was not found in `public` | Consistent with file's explicit comment that it is not applied until owner authorization; keep excluded from baseline unless separately approved |
| `20261115120000_fresh_push_outbox.sql` | `push_outbox`, enqueue/actor/kick functions, and outbox trigger exist; relevant push trigger functions are SECURITY DEFINER with EXECUTE restricted to postgres/service_role | Core objects confirmed; compare every trigger/function body, grants, and queue invariants |
| `20261115140000_fresh_push_deeplinks_and_more_triggers.sql` | Repost, remix, gift push functions/triggers and follow-up trigger wiring exist | Objects confirmed; compare exact function definitions and trigger attachment points |

### Catalog snapshot details

- All 14 queried target relations exist, including the Fresh Intelligence foundation relations, Fresh AI knowledge, Fresh Communication threads/messages, profile privacy, direct messages, and push outbox.
- `search_fresh_platform_knowledge(text, integer)` exists as SECURITY INVOKER. `approve_fresh_ai_correction(uuid)` exists as SECURITY INVOKER.
- Push queue/helper/trigger functions queried are SECURITY DEFINER and have observed EXECUTE ACLs limited to postgres and service_role. This is a critical contract to preserve; do not grant client execution broadly.
- `direct_messages` currently has participant SELECT, recipient mark-read UPDATE, and sender INSERT policies.
- `profile_privacy_settings` currently has owner INSERT, owner UPDATE, and public-read SELECT policies. This differs from the migration file's stated owner-only CRUD policy set and requires predicate-level comparison, not just name matching.
- `ecosystem_profiles_feed_modes_check` currently allows five values and does not include `fresh-picks`. The migration file says it adds `fresh-picks`; later migrations or product changes may have superseded this. This is a behavior discrepancy to resolve before replay.
- `post-videos` exists as a public bucket with a 50 MiB limit. Bucket MIME allowlist and all object policies still need a separate exact check.
- `fresh_short_audience_lens(uuid)` is absent from the live public function catalog, matching its migration comment that it was intentionally not applied pending owner authorization.

## Engineering interpretation

This narrows the remaining work but does not close the 15-migration reconciliation. Most of the migrations now have current object evidence, but seed migrations and behavior-sensitive policies/functions cannot be declared applied from object presence. The profile-privacy and feed-mode differences are explicit unresolved behavior drifts. The audience-lens function must remain out of the production baseline.

## Next autonomous steps

1. Compare full definitions, not just existence, for the 21 timestamp-shift matches and the 15 object-backed candidates: columns/types/defaults/generated expressions, constraints, indexes, policies including USING/WITH CHECK, function bodies/security/search_path/EXECUTE ACL, trigger definitions, and Storage bucket policies.
2. Reconcile seed migrations by stable keys and content hashes without exporting user content; prove repeatability and determine whether the repository's idempotent updates match production.
3. Preserve both historical forms of the owner Fresh Mail SQL discrepancy and the separate security-hardening SQL drift; never rewrite historical migrations to manufacture equivalence.
4. Build the isolated PostgreSQL replay target only after the authoritative migration set and intentional exclusions are explicit. Use a clean disposable CI database; do not create a paid Supabase branch or touch production for this step.
5. Add replay and authorization regression tests, then connect the application to the isolated database in a non-production test configuration.

## Exit criteria

Phase 0C is not complete until each unresolved migration has one evidence-backed disposition: exact equivalent, timestamp-shift equivalent, superseded with a documented replacement, intentionally excluded, or genuine missing migration. No migration is to be applied to production as part of this phase.
