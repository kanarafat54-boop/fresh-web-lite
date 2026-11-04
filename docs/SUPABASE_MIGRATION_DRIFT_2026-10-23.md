# Supabase migration drift — 2026-10-23

**What this is:** production's migration history contains versions whose SQL was never committed to this repository. Their files are empty placeholders ("Intentionally no-op"). A database rebuilt from the repository (a new environment, a restore, a staging copy) therefore differs from production.

**Verified against:** the live "Fresh Web Lite" Supabase project (read-only queries) and the repository at the time of writing.

## Restored in this change

| Placeholder | Restored objects |
|---|---|
| `20260906113715_fresh_search_engine_foundation.sql` | `posts` columns `content`, `like_count`, `comment_count`, `image_url`, `video_url`; generated `search_vector` columns and GIN indexes on `posts` and `shorts`; table `fresh_search_documents` with its constraints, indexes and four RLS policies |
| `20260906113732_fresh_search_engine_rpcs.sql` | `search_posts_fulltext`, `search_shorts_fulltext` and their grants |

Every statement is idempotent, so on production nothing changes. These versions are already recorded as applied there, so they are not re-run. Tested on a scratch PostgreSQL 16 database: applied twice without error; ranked results, grants (anon, authenticated and service role allowed, PUBLIC not) and policies match production; the foreign key to `fresh_universal_objects` is added when that table exists.

## Still drifting (not changed here)

### Placeholders with no SQL anywhere in the repository (25 remaining)

`20260812125640_fresh_intelligence_semantic_graph`, `20260815090615_fresh_intelligence_read_rls`, `20260815184146_marketplace_core_tables_v2`, `20260826205154_refresh_postgrest_schema_cache`, `20260827040648_economiceventmetering`, `20260827041726_harden_interactions_and_ledger`, `20260827041741_add_universal_interaction_state_key`, `20260828075132_treasury_legacy_schema_compatibility`, `20260829100138_profile_details_backfill_and_autocreate`, `20260829100151_connect_and_direct_messages`, `20260829101410_refresh_postgrest_schema_cache_after_intelligence_verification`, `20260829152409_fix_direct_messages_insert_policy_tautology`, `20260829152959_direct_messages_for_connect`, `20260902054610_treasury_resolve_recipient_by_id`, `20260902055035_fix_treasury_transfer_recipient_ownership_check`, `20260902055048_short_gifts`, `20260903174350_refresh_fresh_intelligence_schema_cache`, `20260906061722_short_captions`, `20260906072645_20260906_performance_fk_indexes`, `20260907062437_universal_profile_foundation`, `20260907111340_universal_profile_foundation`, `20260907120210_harden_profile_analytics_views`, `20260909191242_profile_media_bucket`, `20260909194622_fresh_ai_conversations`, `20260910065453_fresh_ai_media_assets`.

Separately, the table `fresh_universal_objects` is not defined by any repository migration (it is the target of the foreign key on `fresh_search_documents`).

### Placeholders that need no action (6)

- Four point to real SQL kept under an earlier timestamp: `20260816205837_universal_post_short_interactions`, `20260827032047_universal_interaction_persistence`, `20260828034419_sync_universal_interaction_to_short_legacy`, `20260829100128_profile_foundation`.
- Two are history anchors for the treasury history: `0002_treasury_transaction_api_remote_history_anchor` and `20260808110808_remote_history_anchor`.

Some of the 25 may be covered by later repository migrations that create objects "if not exists" (for example the communication tables), so each needs a check rather than a blind restore. Several other small migrations (for example `20260808131000`, `20261012062337`, `20261012173445`) are short but contain real SQL and are fine.

### Known column differences

- `posts`: the repository's content foundation creates a `body` column; production uses `content`, `image_url`, `like_count`, `comment_count`, `video_url`. Handled by this change for the search path; any other code relying on `body` should be reviewed.
- `shorts`: production also has `chapters`, `unlock_at`, `remixed_from_id` and `category`, which no repository migration adds.

## Suggested way to finish the job

Restore one placeholder at a time, newest feature areas first (direct messages, short gifts, profile foundation, AI conversations and media assets), reading each definition back from production and writing idempotent statements. Each batch should replay cleanly in CI (`supabase-full-migration-replay`) before the next. Alternatively, take a single reviewed schema baseline from production, which is faster but loses per-feature history. Either way, no production change is needed.

## Status update 2026-10-24: placeholders restored, baseline snapshot added

**Restored (25 of 25).** Each placeholder now holds idempotent SQL reconstructed from production catalogs
(final end-state, not original statement history). Production has already applied these versions, so nothing re-runs there.

| Area | Versions |
| --- | --- |
| Connect / direct messages | 20260829100151, 20260829152409, 20260829152959 |
| Short gifts, treasury recipient + transfer | 20260902055048, 20260902054610, 20260902055035 |
| Short captions | 20260906061722 |
| Universal profile, analytics views | 20260907062437, 20260907111340, 20260907120210, 20260829100138 |
| Profile media bucket (storage) | 20260909191242 |
| Fresh AI conversations / media assets (+ private bucket) | 20260909194622, 20260910065453 |
| Treasury, ledger, interactions, metering, marketplace | 20260828075132, 20260827041726, 20260827041741, 20260827040648, 20260815184146 |
| Intelligence (arbitrations, claim revisions + read policies) | 20260812125640, 20260815090615 |
| FK performance indexes (guarded) | 20260906072645 |
| PostgREST cache reloads (`notify pgrst, 'reload schema'`) | 20260826205154, 20260829101410, 20260903174350 |

Caveats, deliberately kept visible:
- Where an older repo migration already creates a table in an earlier shape, the restored file adds missing
  columns with `add column if not exists`. The other Fresh Intelligence tables are *not* re-shaped at 20260812/0815
  because `20260906090000_fresh_intelligence_foundation.sql` assumes the older shape and would break replay.
- Foreign keys are added only if the referenced table exists at that point in the replay (otherwise skipped with a notice).
- `20260907111340` is the twin of `20260907062437`; its content (RLS, policies, grants) is an inferred re-assertion.

**Baseline snapshot.** `supabase/baseline/production_public_schema_2026-10-23.sql` is a single idempotent description of
production's `public` schema (94 tables, 135 FKs, 162 indexes, 176 policies, 41 functions, 10 views, 20 triggers, table,
column and function grants). It sits outside `supabase/migrations` and is never replayed. Loaded twice into a scratch
Postgres with zero errors, and 11 catalog fingerprints match production exactly.

**Replay check (scratch Postgres, Supabase stubs).** Public tables after replaying every migration: 57 on `main`,
71 with these restorations (production: 94). The remaining 23 production-only tables (e.g. `wallets`, `notifications`,
`reports`, `short_reposts`, `community_notes`, `fresh_universal_objects`, `fresh_media_*`) were created outside any
repo migration version and exist only in the baseline snapshot. `20260929_security_hardening.sql` fails on a clean
replay on `main` too (it sorts after the migration that drops the signatures it revokes); that is pre-existing and untouched.
