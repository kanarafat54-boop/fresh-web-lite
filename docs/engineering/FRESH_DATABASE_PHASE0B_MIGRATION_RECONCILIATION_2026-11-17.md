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


## Expanded classification of all 39 repository-only versions

A second pass classified the 39 repository filenames whose timestamp/version prefix does not exactly occur in the live ledger:

| Classification | Count | Finding |
|---|---:|---|
| Verified timestamp-shift SQL match | 21 | SQL equivalent after removing comments and normalizing whitespace |
| Substantive SQL drift | 1 | `owner_fresh_mail_address`: repository adds a second owner/status guard absent from the live stored SQL |
| Additional same-name but different SQL | 1 | `20260929_security_hardening.sql` is not equivalent to live `20260808140000_security_hardening`; the repository file hardens views and RPC grants/search paths, while the live stored SQL is a different security-hardening set |
| Verified SQL match under version/name variation | 1 | `20260926120000_treasury_entries_select_own_rls.sql` is SQL-equivalent to live `20260926084937_treasury_entries_select_own_rls_v2` |
| Unresolved — no reliable live ledger mapping yet | 15 | Listed below; require schema/object evidence and chronology review |

### Fifteen unresolved repository migrations

These files do not have an exact version match or a sufficiently reliable name/content mapping established in this pass:

1. `20260906090000_fresh_intelligence_foundation.sql`
2. `20261014140100_seed_fresh_ai_platform_knowledge.sql`
3. `20261014140200_fresh_ai_master_matrix_knowledge.sql`
4. `20261014140300_fresh_ai_full_text_search.sql`
5. `20261014140400_fresh_ai_outside_ai_knowledge.sql`
6. `20261014193000_fresh_communication_tables_foundation.sql`
7. `20261014210000_allow_fresh_picks_feed_mode.sql`
8. `20261016090000_fresh_ai_correction_loop.sql`
9. `20261019090000_fresh_profile_privacy_settings.sql`
10. `20261021200000_fresh_ai_platform_docs_knowledge.sql`
11. `20261027100000_direct_messages_replayable_read_policies.sql`
12. `20261030213000_fresh_long_video_storage_bucket_provision.sql`
13. `20261103150000_fresh_short_audience_lens.sql`
14. `20261115120000_fresh_push_outbox.sql`
15. `20261115140000_fresh_push_deeplinks_and_more_triggers.sql`

The classification counts sum to all 39 repository-only versions. "Unresolved" does not mean unapplied: an object may have been introduced by another migration, manually provisioned, superseded, or intentionally kept out of production. Each needs object-level and behavior-level evidence. In particular, seed/knowledge migrations must be reviewed for data volume and repeatability, while push/outbox and storage-bucket migrations need explicit object/configuration checks.

### Consequence for clean replay

The migration directory is not yet a proven, single authoritative replay chain. Do not run the full repository directory against a fresh database and treat any resulting failure as permission to modify production history. First determine the intended baseline and disposition of all 15 unresolved files and the two substantive SQL drifts. The historical production ledger and repository source should remain separately auditable.

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


## Phase 0C — first live schema/security contract snapshot

Read-only PostgreSQL catalog inspection on the same production project found:

- **120/120 public base tables have RLS enabled**; one currently has FORCE ROW LEVEL SECURITY.
- **18 public tables have RLS enabled but no policies.** A direct privilege check found no `SELECT` or `INSERT` grants to either `anon` or `authenticated` on those 18 tables. This is consistent with a server-only access boundary, not proof of full safety; UPDATE/DELETE/REFERENCES/TRIGGER grants and every server caller still need review. Do not add blanket policies to these tables.
- The no-policy set includes financial ledger tables, Fresh AI safety/training/metrics records, machine credentials/audit/principal records, Fresh Mail records, Fresh Intelligence lineage/decision/knowledge relations, and the push outbox. These are high-priority Fresh Database privilege-contract tests.
- The `supabase_realtime` publication currently contains only `public.direct_messages`. Fresh Realtime must preserve this exact contract initially; do not assume every table is realtime-published.
- Six Storage buckets are present: public `comment-media`, `post-images`, `post-videos`, `profile-media`; private `fresh-ai-media`, `studio-media`. The `post-videos` bucket has a 50 MiB limit and MP4/WebM/QuickTime MIME allowlist; `studio-media` has a 500 MiB limit. Other listed buckets have no explicit size/MIME limit in the catalog query. This is a real constraint for Fresh Infinite Storage: large media needs a separate object-storage path and policy/metadata migration plan.
- The current database has multiple `SECURITY DEFINER` functions. Four are executable by `anon`: `fingerprint_matches(text)`, `is_platform_reviewer()`, `short_sound_reuse_allowed(uuid)`, and `visible_author_ids(uuid[])`. Their current definitions were inspected. They appear to implement bounded read helpers (fingerprint lookup capped at 20; reviewer predicate tied to `auth.uid()`; sound-reuse preference; block-filtered author IDs), but they must receive explicit contract tests and an intentional anonymous-access decision in the Fresh API before replacement. This is not, by itself, a vulnerability finding.
- Many other privileged functions are not executable by `anon` or `authenticated`; the Fresh API must preserve these deny-by-default boundaries rather than exposing every RPC as a generic endpoint.

### Contract test implications

1. Assert RLS is enabled on all 120 public tables in the replay fixture.
2. Assert the 18 no-policy tables have no client-role privileges; do not create generic owner policies for them.
3. Add positive and negative tests for the four anon-callable SECURITY DEFINER helpers, including malformed fingerprint input, unauthorized reviewer identity, private sound reuse, and blocked author IDs.
4. Assert only `public.direct_messages` is in the realtime publication until an approved product contract expands it.
5. Assert Storage bucket privacy, size, and MIME metadata; move large media to Fresh Infinite Storage only through a separately verified provider-neutral object contract.
6. Capture all function signatures, SECURITY DEFINER flags, `search_path`, and EXECUTE grants in the schema fingerprint.


### Exact no-policy table set observed

`fresh_ai_safety_events`, `fresh_ai_serving_metrics`, `fresh_ai_training_examples`, `fresh_intelligence_evidence_lineage`, `fresh_intelligence_persistence_batches`, `fresh_intelligence_truth_decisions`, `fresh_knowledge_entity_aliases`, `fresh_knowledge_entity_relations`, `fresh_mail_addresses`, `fresh_mail_messages`, `fresh_mail_webhook_events`, `ledger_entries`, `ledger_transactions`, `machine_audit`, `machine_credentials`, `machine_principals`, `machine_rate`, `push_outbox`.

The direct role check in this pass evaluated `SELECT` and `INSERT` only. The full Fresh Database contract capture must also include UPDATE, DELETE, REFERENCES, TRIGGER, sequence, schema, and function privileges.

### Anonymous SECURITY DEFINER helper inventory

| Function | Fixed search path | Observed behavior to preserve/test |
|---|---|---|
| `fingerprint_matches(text)` | `public, pg_temp` | Accepts only 64-hex SHA-256 input; returns at most 20 matching short/author/profile rows ordered by registration time |
| `is_platform_reviewer()` | `public` | Returns true only when `auth.uid()` belongs to a user row with admin/owner role |
| `short_sound_reuse_allowed(uuid)` | `public` | Reads the target creator's sound-reuse setting; defaults to allowed when no preference row exists |
| `visible_author_ids(uuid[])` | `public` | Filters the supplied IDs through block relationship logic; current definition allows all IDs when `auth.uid()` is null |

These are existing public callable surfaces, not authorization recommendations. Fresh API must decide whether each should remain anonymous, become authenticated-only, or be replaced by a narrower endpoint after product behavior and abuse implications are tested.

### Existing CI replay boundary inspected

The repository's `supabase-full-migration-replay.yml` is configured for PR path changes under migrations/config/test script and `workflow_dispatch`. It:
1. Installs Supabase CLI `latest`.
2. Generates an ephemeral config using `supabase init --force`.
3. Starts an isolated local Supabase stack.
4. Runs `supabase db reset --local --no-seed`.
5. Runs the Long Video TUS/RLS test script.
6. Stops the local stack.

The workflow comments explicitly state it does not link a remote project and requires no production credentials. It is safe in design as a local replay boundary. This docs-only PR does not trigger that workflow because it changes no watched paths; the available GitHub connection does not expose a workflow-dispatch write action, so no manual dispatch was performed.

The separate Phase 0 PostgreSQL security workflow uses PostgreSQL 15 and a hand-built fixture with only three selected migrations. It is a focused authorization test, not a complete PostgreSQL 17/Supabase replay. The full-replay workflow and its latest successful run still need verification on a migration-changing branch once the unresolved history is classified.


## Phase 0C — Treasury / wallet domain contract

A read-only inspection of the live Treasury and legacy wallet schema shows two generations of financial persistence coexisting. This is a critical migration boundary; Fresh Database must not merge or replace them until data and API semantics are reconciled.

### Current financial storage domains

| Domain | Tables | Current contract |
|---|---|---|
| Double-entry Treasury | `treasury_accounts`, `treasury_transactions`, `treasury_entries` | UUID accounts/transactions; entries use positive `bigint amount_minor` plus `debit`/`credit`; account balance is derived from entries in security-invoker views |
| Payment instruments / rails | `treasury_payment_instruments`, `treasury_rail_requests` | Owner-scoped instruments and deposit/withdrawal requests with explicit lifecycle statuses |
| Ledger foundation | `ledger_transactions`, `ledger_entries` | Separate server-only ledger tables; no client SELECT/INSERT grants and no RLS policies |
| Legacy wallet | `wallets`, `wallet_balances`, `wallet_transactions` | Separate older balance/transaction model using numeric(12,2) and integer amounts |

### Invariants that Fresh Database must preserve

- Treasury account scope is `user`, `platform`, or `owner`; user-scope accounts require a non-null owner. Asset kinds include `fiat`, `crypto`, `fresh-coin`, and `token`.
- Treasury entries require positive amounts and direction in `debit`/`credit`; account and transaction foreign keys use RESTRICT deletion.
- Treasury transactions have unique `reference` and unique `idempotency_key`. The separate legacy `ledger_transactions` table has unique `reference`, but its nullable `idempotency_key` has no corresponding unique constraint in the inspected constraints.
- Payment instrument families are constrained to the existing enumerated set; currency codes must be uppercase.
- Rail requests require positive amounts, uppercase currency codes, direction `deposit` or `withdrawal`, and status in `pending`, `awaiting_user`, `processing`, `settled`, `failed`, or `cancelled`.
- Rail-request client INSERT is constrained to the authenticated owner, initial `pending` status, and null ledger transaction; clients can read only their own requests.
- Payment instruments have owner-scoped SELECT/INSERT/UPDATE/DELETE policies. Treasury accounts and ledger reads are owner-scoped through RLS and security-invoker views; ledger base tables remain server-only.
- The live `treasury_accounts` table has two permissive SELECT policies with identical predicates. Preserve behavior in the compatibility contract, but evaluate deduplication only in a separate reviewed migration—not during this platform audit.
- `treasury_account_balances`, `treasury_my_balances`, `my_treasury_balances`, and `treasury_my_transactions` are security-invoker views. The balance calculation uses account-kind-aware debit/credit accounting. These views are part of the existing API contract.

### High-risk behavior to test before migration

1. Internal transfers lock source/destination accounts in deterministic ID order, require same asset and user-owned accounts, check available balance, and use a unique idempotency key. Duplicate requests by the same actor return the prior transaction.
2. Double-entry writes must balance debits and credits exactly; preserve the positive minor-unit representation and account-kind balance formula.
3. The sandbox rail settlement function checks request ownership/status, creates a deterministic idempotency key, locks accounts, and returns an existing transaction on retry.
4. **Potential transactional defect to verify in an isolated regression test:** the sandbox withdrawal path updates the rail request to `failed` on insufficient funds and then raises an exception in the same function. With no local exception handler, the exception aborts the statement and rolls back that status update. A test should confirm the observed behavior and a separately reviewed fix should persist failure state safely if that is the intended contract.
5. Legacy `send_tip` mutates `wallet_balances` and `wallet_transactions` separately from the newer Treasury ledger. Fresh Database must preserve both paths until all callers, balances, historical records, and reconciliation rules are understood.

No financial data was read or changed. These findings came from schema definitions, constraints, RLS policies, view definitions, and function bodies only.

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
