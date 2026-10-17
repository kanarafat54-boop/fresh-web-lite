# Supabase migration history reconciliation

## Scope

This change restores local migration files for production migration versions whose SQL can be recovered from repository history or matched confidently to existing SQL. It does not apply SQL to Supabase, change remote migration history, create a staging branch, or alter the live schema.

## Reconciliations in this branch

These migration files have been restored under their production version prefixes, with SQL content preserved from the corresponding local file or historical pull-request patch:

- `20260923040733_creator_studio_foundation_202609230001.sql`
- `20260925104230_harden_treasury_views_and_fk_indexes_2026_09_25.sql`
- `20260926085938_treasury_payment_rails.sql`
- `20260926094221_treasury_sandbox_rail_settlement.sql`
- `20261005105308_add_universal_interaction_state_unique_constraint.sql`
- `20261005135726_remove_global_interaction_uniqueness_and_restore_state_key.sql`
- `20261012062337_fresh_intelligence_claim_relation_observed_at_default.sql`
- `20261012173445_drop_tautological_direct_message_policy.sql`
- `20261014132351_fresh_id_signup_profile_fields.sql` (restored from the migration patch in PR #51)
- `20261017103918_fresh_ai_missions.sql`

Old local filenames were removed from this branch where they were superseded, to avoid duplicate execution on a fresh database.

## Still unresolved

A read-only comparison of production migration versions against this branch's local migration filename prefixes still finds these ten remote versions without a matching local prefix:

- `20260924090731` — `harden_public_security_definer_functions_2026_09_24_v2`
- `20260924090751` — `pin_public_function_search_paths_2026_09_24`
- `20260926084937` — `treasury_entries_select_own_rls_v2`
- `20260926094316` — `treasury_sandbox_settle_account_lookup_fix`
- `20260926110726` — `ecosystem_profiles_rls_and_bootstrap`
- `20260929030313` — `identity_server_financial_boundary`
- `20260929030418` — `identity_public_profile_boundary`
- `20260929030452` — `identity_safe_profile_table`
- `20260929030515` — `identity_harden_ecosystem_rpc`
- `20260929034004` — `fresh_flow_media_rls_performance`

These were not recreated as empty or guessed SQL files. Their exact SQL and application history must be recovered or verified before renaming, restoring, or repairing migration history. Similarly named migrations are not proof of identical SQL.

## Verification required before merge

1. Run the TRUEMODE chain and PostgreSQL persistence integration workflows.
2. Run the Supabase Preview check and confirm it no longer reports missing local versions.
3. Recover and reconcile the remaining ten migrations before treating the history as complete.
4. Do not run `supabase migration repair` against production merely to silence the check. Any remote history repair requires reviewing the actual migration SQL and current schema first.

## Current result

Partial, non-production reconciliation only. The Supabase migration-history mismatch is **not yet resolved**.
