# Supabase migration history reconciliation

## Scope
This branch reconciles local migration filenames with the production migration ledger. All work here is repository-only; no production schema, grants, or migration-history records were changed.

## Filename restorations
The branch restores ten migration filenames whose SQL was represented locally or recovered from PR history:
- `20260923040733_creator_studio_foundation_202609230001.sql`
- `20260925104230_harden_treasury_views_and_fk_indexes_2026_09_25.sql`
- `20260926085938_treasury_payment_rails.sql`
- `20260926094221_treasury_sandbox_rail_settlement.sql`
- `20261005105308_add_universal_interaction_state_unique_constraint.sql`
- `20261005135726_remove_global_interaction_uniqueness_and_restore_state_key.sql`
- `20261012062337_fresh_intelligence_claim_relation_observed_at_default.sql`
- `20261012173445_drop_tautological_direct_message_policy.sql`
- `20261014132351_fresh_id_signup_profile_fields.sql` (historical PR #51 patch)
- `20261017103918_fresh_ai_missions.sql`

## SQL recovered from the production migration ledger
The live `supabase_migrations.schema_migrations` table retains SQL statements for these ten previously unmatched versions. The versioned files were added using recorded SQL rather than inferred from filenames:
- `20260924090731_harden_public_security_definer_functions_2026_09_24_v2.sql`
- `20260924090751_pin_public_function_search_paths_2026_09_24.sql`
- `20260926084937_treasury_entries_select_own_rls_v2.sql`
- `20260926094316_treasury_sandbox_settle_account_lookup_fix.sql`
- `20260926110726_ecosystem_profiles_rls_and_bootstrap.sql`
- `20260929030313_identity_server_financial_boundary.sql`
- `20260929030418_identity_public_profile_boundary.sql`
- `20260929030452_identity_safe_profile_table.sql`
- `20260929030515_identity_harden_ecosystem_rpc.sql`
- `20260929034004_fresh_flow_media_rls_performance.sql`

## Replay failure and correction attempt (2026-10-17)
- First full replay failed at migration `20260924090731_harden_public_security_definer_functions_2026_09_24_v2.sql`: PostgreSQL reported `function public.ensure_profile_details_for_user() does not exist` while processing a historical `REVOKE`. The stack itself started successfully and had applied migrations through `20260924090731` before this error.
- Root cause identified for this failure: the tracked chain contains historical no-op marker migrations for some functions that existed in production, but those function definitions are not created in a clean replay. The hardening migration assumed those historical signatures always existed.
- Corrective change in `04e438e13357e0bb942ba2fb05e54e3dea59ba52`: wrap each exact legacy function signature in `to_regprocedure(...) IS NOT NULL` checks, then apply the existing revoke/search-path hardening only when that signature exists. This avoids creating overloads or weakening/altering a different function.
- Follow-up change in `3707be84170f8bc6a17bfa441c9a70c4082e47b3`: apply the same existence guards to the adjacent search-path migration so a missing historical function signature does not become the next deterministic replay failure.
- The original replay run is [failed run 39033401048](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39033401048). A subsequent run was underway on the earlier correction commit during the last check; the latest guard change must complete its own full replay before this correction is considered validated.
- Second replay [run 39033697264](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39033697264) passed the previous hardening point and then failed at `20260925104230_harden_treasury_views_and_fk_indexes_2026_09_25.sql`: `public.fresh_ai_pipeline_events` did not exist in a clean replay. The earlier `20260908043446` and `20260908162955` migration files were no-op history markers despite the table and its insert policy existing in production.
- Read-only inspection of the live table confirmed columns, primary key, nullable user FK with `ON DELETE SET NULL`, RLS, owner-select/owner-insert policies, and request/created/user indexes. Commits `4b196ddf82770af3b19f62ba99f8041f3b3aa0d6` and `a723288085e9602e77ee5c5fa7610634a8e3d13a` restore the table/index/select-policy definition to the earlier marker and the owner-only insert policy to the later marker. This is a repository replay repair; no production schema was changed.
- Latest run [39034015578](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39034015578) was queued after those changes. It must pass the complete `supabase db reset --local --no-seed` before replay is considered validated.
- Third replay [run 39034042804](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39034042804) passed the prior pipeline-events issue and failed at the same index migration because `public.fresh_ai_safety_events` was also absent from clean replay. Read-only production catalog inspection recovered its columns, check constraint, FK, and request index; it also showed `fresh_ai_serving_metrics` is a server-only telemetry table referenced immediately after it. Commit `d3116f008963623906a027949d5c614824817f10` adds both table definitions, base indexes, RLS, and explicit server-only grants to the existing Fresh AI cognitive-fabric migration. No production changes were made.
- Important: these guards address clean-replay compatibility, not a complete security review. Live function signatures, function bodies, ACLs, and any intended functions missing from the tracked migration chain still require reconciliation.

## Full replay CI attempt
- Added `.github/workflows/supabase-full-migration-replay.yml` in commit `59d382bdb97e8bc4792ee9131c69f5aa5c110e55`.
- This workflow initializes an ephemeral local Supabase config in the GitHub-hosted runner, starts an isolated local Supabase stack, and runs `supabase db reset --local --no-seed` to replay the full migration directory. It does not link to or mutate production and needs no Supabase project secrets.
- First run: [GitHub Actions run 39033401048](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39033401048), failed on a historical function signature. The next run failed on the missing Fresh AI pipeline-events table; the latest queued attempt is [run 39034015578](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39034015578). Do not mark replay successful until the full reset step passes.
- The repo still contains six migration filenames that do not use a 14-digit timestamp prefix: `0001_fresh_treasury_ledger.sql`, `0002_treasury_transaction_api_remote_history_anchor.sql`, `202608170001_universal_comment_media_storage.sql`, `202608230001_profile_foundation.sql`, `202608240001_connections_foundation.sql`, and `20260929_security_hardening.sql`. Five of these versions exist in the live ledger. Do not rename them without preserving version identity and verifying CLI behavior; the full replay will establish whether the current CLI accepts them.

## Validation status (2026-10-17)
- [x] All ten recovered SQL files compared against the stored statements (nine exact matches; one matches after normalizing one outer leading newline).
- [x] Verified `20260924090751` and `20260926094316` against the live `supabase_migrations.schema_migrations.statements` values on 2026-10-17. Both statements match their repository files after outer-whitespace normalization (the `20260924090751` file is an exact match; the `20260926094316` file is an exact match).
- [x] Six GitHub Actions workflows completed successfully on commit `9e4459d5ddebc5c62ac24c198987e7da6782f31c`: Fresh Shorts Production Gate, TRUEMODE Chain Verification, Fresh AI integrity, Phase 0 isolated PostgreSQL security tests, Fresh Web Lite build gate, and Fresh AI training contracts.
- [ ] Resolve the 14 repository SQL files whose versions are not present in the live ledger. Initial content review groups them as:
  - Preview baseline/foundation candidates: `20260815120000_content_foundation_tables.sql`, `20260906090000_fresh_intelligence_foundation.sql`.
  - Treasury RLS overlap requiring a version-by-version comparison: `20260926120000_treasury_entries_select_own_rls.sql` (the branch also has `20260926084937_treasury_entries_select_own_rls_v2.sql`).
  - Historical security-hardening file to reconcile against the later timestamped security migrations: `20260929_security_hardening.sql`.
  - Fresh AI knowledge seed/search content: `20261014140100` through `20261014140400`.
  - Phase 0 access hardening (three files used by the limited fixture workflow, not proof of full replay): `20261014194000`, `20261014194500`, `20261014200500`.
  - Feed-mode constraint, Fresh Mail core, and Fresh AI correction loop: `20261014210000`, `20261015060000`, `20261016090000`.
  These are substantive migration candidates, not a set that can safely be labeled test-only. Determine whether each should be applied, superseded, or excluded only after checking history and full replay.
- [ ] Pass a clean, full migration replay in an isolated, no-cost environment and resolve ordering/dependency errors. Two deterministic clean-replay failures have now been identified and addressed in tracked historical migrations; the latest replay is pending. The existing Phase 0 workflow only uses a fixture and three selected migrations, not the full migration chain; `supabase/config.toml` is absent.
- [x] Read-only grant check: the ten RLS-enabled/no-policy tables flagged by the security advisor have grants for `service_role` only among `anon`, `authenticated`, and `service_role`; this appears consistent with server-only access but application/service-key paths still need review.
- [x] Read-only SECURITY DEFINER function inventory: 22 functions in `public` were found; all have execute privileges limited to `postgres` and `service_role` among the recorded ACLs. Eight use an empty `search_path` (including the treasury RPCs and `sync_user_public_profile`); this is a hardening pattern only if function bodies fully qualify object references. Function-body and caller-path review remains open.
- [ ] Review current production schema, grants, RLS policies, and privileged function definitions against recovered statements. A read-only catalog check found the live two-argument `treasury_sandbox_settle_rail_request(uuid, uuid)` is `SECURITY DEFINER`, has an empty search path, and is executable only by `postgres` and `service_role`; the recovered historical migration defines a one-argument function with `search_path=public`. This is a material signature/security-boundary difference requiring chronology review; do not overwrite the live function.

Successful application CI is not proof that all historical migrations replay successfully on a clean database. Recorded SQL is historical evidence, not proof of safe replay.

## Safety boundary
Keep this PR in draft and do not merge until the outstanding content comparisons and migration replay/review gates are complete. Do not apply historical migrations or repair production migration history as part of this reconciliation.

- Third replay attempt [run 39034327671](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39034327671) reached the index-hardening migration and failed because `public.fresh_intelligence_evidence_lineage` was absent. The same migration also expects the evidence and knowledge graph foundations to be present before indexing them.
- Read-only production catalog inspection confirmed the evidence-lineage columns, key/check constraints, existing indexes, RLS state, and service-managed access pattern. The production catalog was not modified.
- Commit `d3116f008963623906a027949d5c614824817f10` restored the missing Fresh AI safety-event and serving-metrics tables. Commit `431d67fed732c659bf870fef92b9034335acc755` now restores the Fresh Intelligence evidence, claim-evidence, and evidence-lineage foundation in `20260906090000_fresh_intelligence_foundation.sql`, including constraints, indexes, RLS, and service-role-only grants.
- Replay for `431d67fed732c659bf870fef92b9034335acc755` is running as [run 39035299888](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39035299888). This is not yet a passing replay; review the next failure, if any, before considering the migration chain validated.


## Fourth replay failure and current correction (2026-10-17)
- The replay on commit `a971c7c4f43736f31e29f0bc7514fe3e1afaa1a9` failed at `20260926110726_ecosystem_profiles_rls_and_bootstrap.sql` because `public.ecosystem_profiles` did not exist in a clean replay. The failure was reproduced in [run 39035342525](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39035342525).
- Root cause: `20260902034420_add_ecosystem_profiles.sql` was a no-op marker even though later tracked migrations depend on the table. Read-only production catalog inspection recovered its columns, FK to `public.users(id)` with `ON DELETE CASCADE`, unique `(fresh_id, ecosystem_id)`, feed-mode check constraint, indexes, RLS, and enabled-profile read policy.
- Commit `967c0f98520d8194fa8bb985a004becb7ed0eb35` restores the base table and the catalog-backed foundation in that historical migration. It deliberately keeps the live feed-mode check's original values; the later feed-mode migration remains responsible for any subsequent constraint change. No production schema or migration ledger was changed.
- The new commit must complete a fresh full replay. If it fails again, use the exact next failing migration and live catalog evidence; do not declare the replay passed based on the other green workflows.


## Fifth replay failure and current correction (2026-10-17)
- Replay run [39035679528](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39035679528) progressed through `20260929_security_hardening.sql` before failing because `public.fresh_ai_training_examples` did not exist.
- The hardening migration revokes client access to this table, while the earlier `20260908183843_fresh_ai_training_alignment.sql` was a no-op marker. Read-only production catalog checks recovered the table's 12 columns, type check constraint, `(example_type, created_at DESC)` index, enabled RLS, and service-role-only grants.
- Commit `53965c5a8393e70f9a6edde00989b37dc42c66c6` restores the table foundation at its earlier historical migration, including service-only privileges. This avoids weakening or skipping the later security-hardening step. Production was not changed.
- The latest replay must now prove this correction and reveal any next chronological dependency; other green workflows do not substitute for a successful full replay.


## Fifth replay failure and signature-safe correction (2026-10-17)
- The full isolated replay at [run 39036051607](https://github.com/kanarafat54-boop/fresh-web-lite/actions/runs/39036051607) progressed through `20260926120000_treasury_entries_select_own_rls.sql` and failed in `20260929_security_hardening.sql`: the historical call to `public.treasury_resolve_recipient_by_id(uuid,text)` no longer matched a function signature available on clean replay.
- Read-only live catalog inspection showed the current recipient resolver signature is `treasury_resolve_recipient_by_id(uuid,uuid,text)`, and the internal transfer signature is `treasury_transfer_internal(uuid,uuid,uuid,bigint,text,text)`; the historical migration names obsolete signatures for both.
- Commits `ef720297d08fa7eb5f58adc609f00bc196346027` and `4116bbd35408f4edeff02a19ecdf4da91e0ac2fc` guard only the two obsolete exact signatures with `to_regprocedure`, avoiding an accidental grant to a different overload and allowing replay to proceed when those legacy signatures are absent. Existing privilege statements for other exact signatures remain unchanged.
- No production database or migration ledger was changed. Full replay on the new commit is the next required verification; security semantics for these RPCs still require dedicated caller/authorization review before merge.
