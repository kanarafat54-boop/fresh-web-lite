# Fresh Database Phase 0B — Migration History Reconciliation

Date: 2026-11-17
Repository baseline: `main` at `9553f1e332d2602ac73efd41028880ed408221af`
Audit parent: `86b57acabb102be08e870129b6687ff95440027d`
Production project: `fwbbyowalnfckpmbutcz`

## Scope and safety

This is a read-only comparison of repository migration filenames against the live production migration ledger, plus a catalog inventory to guide the next contract-mapping phase. No production DDL/DML, migration application, ledger repair, data export, secret retrieval, or configuration change was performed. Do not apply any migration based on this report.

## Current comparison

- Repository: 136 SQL migration files under `supabase/migrations/`.
- Production: 119 rows returned by the live `supabase_migrations` ledger.
- A strict timestamp/version comparison produced 39 repository versions with no exact live-ledger version and 22 live-ledger versions without an exact same-version repository filename.
- The 22 unmatched live-ledger entries have close/same descriptive migration names in the repository under different timestamps. These are likely version-history drift candidates, not proof that the SQL is equivalent.
- The remaining repository-only versions require individual chronology/content classification; some may be substantive, superseded, seed/knowledge, preview-only, or historical marker migrations.

## Candidate live-to-repository timestamp mappings

The following pairs share the same or a close descriptive name. They are candidates only; the stored production SQL must be compared byte-for-byte (or with explicitly documented outer-whitespace normalization) against the repository file before any mapping is accepted.

| Live ledger version | Live name | Repository candidate |
|---|---|---|
| 20261111052714 | fresh_ai_correction_review | 20261023100000_fresh_ai_correction_review.sql |
| 20261111112555 | fresh_short_collections_and_comment_pin | 20261102120000_fresh_short_collections_and_comment_pin.sql |
| 20261111112605 | harden_fresh_short_comment_pinning | 20261102140000_harden_fresh_short_comment_pinning.sql |
| 20261111112606 | widen_short_comment_reactions | 20261105100000_widen_short_comment_reactions.sql |
| 20261111112608 | fresh_shorts_duration_language | 20261106100000_fresh_shorts_duration_language.sql |
| 20261111112618 | fresh_shorts_notification_state | 20261108100000_fresh_shorts_notification_state.sql |
| 20261111112630 | fresh_shorts_reporting | 20261108120000_fresh_shorts_reporting.sql |
| 20261111112656 | fresh_user_blocks | 20261109100000_fresh_user_blocks.sql |
| 20261111112720 | fresh_proof_core | 20261110100000_fresh_proof_core.sql |
| 20261111112759 | fresh_machine_access_core | 20261111100000_fresh_machine_access_core.sql |
| 20261111112812 | harden_proof_and_machine_functions | 20261111110000_harden_proof_and_machine_functions.sql |
| 20261112064343 | fresh_shorts_privacy_controls | 20261111120000_fresh_shorts_privacy_controls.sql |
| 20261112065656 | studio_project_versions | 20261102100000_studio_project_versions.sql |
| 20261112065732 | studio_media_bucket | 20261104100000_studio_media_bucket.sql |
| 20261112065744 | studio_project_versions_least_privilege | 20261112100000_studio_project_versions_least_privilege.sql |
| 20261112130222 | fresh_sound_reuse | 20261112110000_fresh_sound_reuse.sql |
| 20261113060617 | fresh_shorts_moderation_review | 20261112120000_fresh_shorts_moderation_review.sql |
| 20261113062038 | fresh_mail_core | 20261015060000_fresh_mail_core.sql |
| 20261113062039 | fresh_ai_preference_pairs_harden_grants | 20261023100100_fresh_ai_preference_pairs_harden_grants.sql |
| 20261113062833 | fresh_owner_and_limited_admins | 20261113100000_fresh_owner_and_limited_admins.sql |
| 20261113062837 | owner_fresh_mail_address | 20261113110000_owner_fresh_mail_address.sql |
| 20261115064319 | fresh_push_subscriptions | 20261115100000_fresh_push_subscriptions.sql |

Note: the two Studio project-version entries are distinct live migrations and must not be collapsed into one candidate. The repository has a separate least-privilege file; chronology and SQL content must establish which file corresponds to which live entry.


## Stored SQL equivalence check — 22 timestamp-shift candidates

The 22 candidate pairs above were compared against the SQL statements stored in the live `supabase_migrations.schema_migrations` ledger. Comparison removed SQL line comments and normalized whitespace/semicolon spacing; it did not rewrite or execute either side.

- **21 of 22 candidates are equivalent** after that normalization.
- **1 candidate has a substantive SQL difference:** live version `20261113062837` (`owner_fresh_mail_address`) versus repository file `20261113110000_owner_fresh_mail_address.sql`.

For the one difference, production's stored SQL inserts the reserved owner address when no matching email address exists. The repository file adds a second `NOT EXISTS` condition preventing insertion when the same owner already has that address in pending status. That extra condition is absent from the stored production SQL. Therefore this is **not** an exact historical match, even though the migration name is the same. Do not edit the historical repository migration to force a match, and do not rerun it against production. Record the discrepancy as a historical SQL drift item and determine whether the repository file was subsequently amended after production applied the earlier statement.

The other 21 candidate mappings can be treated as verified SQL-equivalent timestamp-shift mappings for this comparison only. This does not prove that the entire migration chain is replayable or that all repository-only migrations have a valid disposition.

## Phase 0B work remaining after this comparison

- [ ] Classify all 39 repository-only migration versions, including files with no corresponding live ledger row.
- [ ] Investigate the owner Fresh Mail migration discrepancy and preserve both historical forms in the audit trail.
- [ ] Verify the repository full-replay workflow on a clean isolated stack and inspect its latest run/logs.
- [ ] Complete schema, authorization, function, trigger, and realtime publication contract inventory.

## Other live catalog surface observed

A read-only catalog query returned these non-system schemas and object counts:

| Schema | Tables | Views | Materialized views |
|---|---:|---:|---:|
| auth | 27 | 0 | 0 |
| extensions | 0 | 2 | 0 |
| net | 2 | 0 | 0 |
| private | 1 | 0 | 0 |
| public | 120 | 10 | 0 |
| realtime | 2 | 0 | 0 |
| storage | 10 | 0 | 0 |
| supabase_migrations | 1 | 0 | 0 |
| vault | 1 | 1 | 0 |

The live public table inventory confirms the platform is not just a social-content database: it contains Fresh ID/account/device data, Treasury ledger and payment-rail data, Fresh AI memory/knowledge/training/conversation data, Fresh Flow and media, messaging, Long Video, Studio, Fresh Mail, push delivery, and machine-access records. A table-by-table contract map must include ownership, constraints, FKs, RLS, grants, triggers, indexes, views, and RPC behavior—not merely table names.

## Important CI / toolchain observation

The repository full-replay workflow installs Supabase CLI with `supabase/setup-cli@v3` and `version: latest`. Supabase CLI v3 is now the current major and its defaults changed: database commands are local unless `--remote` is explicitly specified; hosted mutations require confirmation and unattended hosted mutations require `--yes`. The existing replay workflow is intended to be isolated/local and contains no production credentials. Keep it strictly local. Any future script that intentionally targets a hosted project must use explicit target flags and approval gates. See the official [CLI v3 migration guide](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3) and [Nov 4 breaking-change notice](https://supabase.com/changelog?types=breaking-change).

## Next required engineering steps

1. Compare the 22 candidate production ledger SQL statements with their candidate repository files. Record exact matches, whitespace-only matches, and substantive differences separately.
2. Classify every repository-only migration as: exact live equivalent, renamed/version-shifted, superseded, local/test-only, intentionally unapplied, or unresolved. Do not infer this from filenames alone.
3. Reconstruct chronological dependencies for each unresolved migration and check the full replay workflow's latest run. A clean replay must complete from an empty isolated PostgreSQL/Supabase stack before migration history is considered reproducible.
4. Capture the live schema contract in bounded domains: Fresh ID/Auth; Treasury; Fresh AI/Intelligence; social/Flow/messaging; media/Storage/Long Video/Studio; Fresh Mail/push; machine/proof. For each, compare schema, constraints, policies, grants, triggers, views, functions, and publication/subscription behavior.
5. Build a disposable PostgreSQL 17 compatibility harness only after the migration chain is reproducible. The current focused security workflow uses PostgreSQL 15 and a hand-built fixture; it is not PG17 parity or a full-schema contract test.
6. Start Fresh Database Core only after the source-of-truth schema and authorization contracts are documented. Do not change browser/server runtime wiring in this phase.

## Acceptance gates

- [ ] Every live migration ledger row has a verified repository SQL source or an explicitly documented historical exception.
- [ ] Every repository migration has a recorded disposition.
- [ ] Full clean replay succeeds on the intended PostgreSQL major version.
- [ ] Live schema/security contracts are documented and behavior-tested in isolation.
- [ ] Rollback and data reconciliation design exists before any shadow write or production pilot.

**Status:** Phase 0B inventory has started; version/content reconciliation is not complete. Production remains unchanged.
