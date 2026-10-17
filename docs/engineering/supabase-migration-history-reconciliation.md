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