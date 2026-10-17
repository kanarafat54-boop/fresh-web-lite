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
The live `supabase_migrations.schema_migrations` table retains SQL statements for these ten previously unmatched versions. The versioned files have been added to this branch using that recorded SQL, rather than guessing from names:
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

## Required before merge
- [ ] Verify every recovered file's content against its recorded SQL.
- [ ] Pass repository build, typecheck, lint, migration-contract, TRUEMODE and PostgreSQL persistence workflows.
- [ ] Pass Supabase Preview migration checks and resolve ordering/dependency errors.
- [ ] Review the current production schema, grants and policies against the recovered statements.

Recorded SQL is historical evidence, not proof that replay against a clean database will succeed. Keep this PR in draft and do not apply historical migrations or repair production migration history as part of this reconciliation.
