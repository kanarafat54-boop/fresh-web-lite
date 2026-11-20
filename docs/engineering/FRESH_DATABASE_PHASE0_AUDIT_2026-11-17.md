# Fresh Database (FDB) — Phase 0 Production Dependency Audit

**Date:** 2026-11-17  
**Repository baseline:** `main`, tree `9553f1e332d2602ac73efd41028880ed408221af`  
**Production database:** Fresh Web Lite Supabase project (read-only inspection)  
**Decision:** PostgreSQL foundation; full Fresh-owned platform scope; no production changes in Phase 0.

## Executive result

Fresh Web Lite is not merely using Supabase as a hosted PostgreSQL database. Its current runtime depends on several Supabase products and SDK contracts: PostgreSQL/Data API, Auth/JWT validation, Storage, Realtime, and server-side service-key access. Replacing the database URL alone would not make Fresh independent.

The safest target is a **Fresh-owned PostgreSQL platform** with a compatibility boundary and separately owned identity, API, realtime, object-storage, migration, backup, and observability services. PostgreSQL remains the initial engine; do not invent a new storage engine before the platform boundary and operational guarantees are proven.

**Production was not modified.** The live inspection used metadata/catalog reads, migration listing, extension listing, and advisors only. No SQL DDL/DML, migration application, branch creation, project creation, secret reads, deployment, or user-data export was performed.

## 1. Live production baseline (read-only)

Project status reported `ACTIVE_HEALTHY`; database engine PostgreSQL 17, reported build `17.6.1.141`.

| Catalog surface | Live count |
|---|---:|
| Public base tables | 120 |
| Public views | 10 |
| Public RLS policies | 227 |
| Public functions | 89 |
| Public triggers | 60 |
| Public indexes | 346 |
| Installed extensions | 6 |
| Recorded migration versions | 119 |

The live database has materially evolved since the repository's October 23 baseline document, which records 94 public tables. The old baseline is historical evidence, not a complete current production snapshot. A fresh, reviewed, non-secret schema/roles/data backup and catalog comparison must precede any migration rehearsal.

### Extension inventory

Six extensions are installed according to the live extension inventory: `pg_net`, `pgcrypto`, `uuid-ossp`, `supabase_vault`, `plpgsql`, and `pg_stat_statements`. Reconfirm exact versions, schemas, dependencies and availability on the proposed Fresh-hosted PostgreSQL target before choosing a deployment image.

## 2. Repository dependency map

### Client-side dependency

- `src/lib/supabase.ts` creates the browser singleton with `@supabase/supabase-js`.
- It requires `VITE_SUPABASE_URL` and a publishable/legacy anon key at module initialization.
- Feature modules use the shared singleton for direct `.from(...)` Data API calls and Auth. Examples include Fresh Flow/social, profiles/privacy, preferences, saved items, moderation, studio projects, device security and publishing.
- The package currently declares `@supabase/supabase-js` `^2.110.7`.

### Server-side dependency

Code search found direct SDK usage in API/server paths including:
- `api/admin/users.ts`
- `api/ai/ask.ts`, `conversations.ts`, `feedback.ts`, `files.ts`, `stream.ts`, `upload.ts`
- `api/finance/treasury.ts`, `api/mail.ts`
- `src/server/freshAICorrectionReview.ts`, `freshAstraVision.ts`, `shortFingerprint.ts`, `push/pushDispatch.ts`
- `src/core/fresh-ai/FreshAIServerServices.ts`, `src/core/semantic/supabaseSemanticPersistence.ts`, and `src/server/machine/supabaseDeps.ts`

Several server paths validate bearer tokens through Supabase Auth and/or use a server-only secret key for privileged reads/writes. A replacement must preserve the trust boundary: no service credential in browser bundles, and all owner/role checks must be reimplemented and behavior-tested before cutover.

### Supabase products to replace or deliberately retain

| Product surface | Existing role | FDB migration requirement |
|---|---|---|
| PostgreSQL | Primary application database, SQL functions, triggers, RLS | Fresh-managed PostgreSQL, roles, policies, functions, migrations, backup/restore |
| Data API / PostgREST | Browser CRUD and RPC over `supabase-js` | Fresh API + typed SDK/compatibility adapter; migrate call sites incrementally |
| Auth / GoTrue | Accounts, sessions, JWT issuance and validation | Fresh ID identity/session service; token issuer/verifier and account recovery plan |
| Realtime | Database-change subscriptions and publication | Fresh Realtime gateway/event outbox; delivery/replay semantics |
| Storage | Buckets, signed URLs, TUS/resumable uploads | Coordinate with Fresh Infinite Storage; keep existing paths until verified |
| Supabase service role | Privileged server-side access | Private Fresh service identities and least-privilege database roles |
| Supabase extensions | Search, vector, crypto, network, scheduling and telemetry capabilities | Extension compatibility matrix and supported replacement/retention decisions |

## 3. Migration and schema reproducibility risks

- Repository tree contains **136 SQL migration files**.
- Live migration ledger currently reports **119 versions**.
- A first-pass filename/version comparison shows substantial non-overlap in both directions. This is a reconciliation signal, not a safe list of migrations to apply: historical short/nonstandard version prefixes and version renumbering must be mapped before conclusions are drawn.
- Existing `docs/SUPABASE_MIGRATION_DRIFT_2026-10-23.md` documents earlier production/repository drift and a historical 94-table snapshot.
- Existing `docs/engineering/supabase-migration-history-reconciliation.md` documents prior replay failures and cautions.
- `supabase/config.toml` is absent on `main`; the existing `supabase-full-migration-replay.yml` creates an ephemeral config in CI and attempts a clean local replay.
- The full migration replay and Phase 0 PostgreSQL security workflows exist. Phase 0 uses a disposable PostgreSQL 15 fixture and pgTAP/two-user behavior tests; it is not proof that the entire current production schema can be recreated.
- The repository contains migration history anchors and recovered/idempotent SQL. Never rename, squash, reorder, or blindly apply these files during FDB migration work.

**Required gate:** build a version-mapping ledger (repository filename/version ↔ live migration version ↔ SQL fingerprint ↔ dependencies ↔ disposition), then make a clean Postgres 17 replay deterministic before any production migration or data movement.

## 4. Live advisor findings (observed 2026-11-17)

### Security advisor

- 19 tables have RLS enabled without policies (INFO). Earlier security review documented several of these as intentionally server-only with no anon/authenticated grants; verify current grants and access paths rather than adding broad policies.
- 4 `SECURITY DEFINER` functions are executable by `anon`: `fingerprint_matches`, `is_platform_reviewer`, `short_sound_reuse_allowed`, `visible_author_ids`.
- 16 `SECURITY DEFINER` functions are executable by `authenticated`. Some may be intentionally exposed RPCs. Review every function body, pinned search_path, caller authorization, grants and tests before deciding whether to retain or revoke.
- Leaked-password protection is reported disabled. This is a Supabase Auth configuration item and will need a Fresh ID equivalent before Auth migration.

### Performance advisor

- 82 RLS policies have auth/current-setting init-plan warnings.
- 7 foreign keys have no covering index.
- 8 tables have multiple permissive policies for the same role/action.
- 119 indexes are currently reported unused. Do not drop them from this snapshot alone; counters may reset and some indexes serve rare/critical paths.

### Health advisor

- No health lints were returned in this read-only advisor run.

## 5. Existing work that must be coordinated

- Open PR #308, **Fresh Infinite Storage foundation**, introduces a provider-neutral storage router and an R2 adapter that remains disabled until credentials/bucket/CORS are configured. Its stated safety boundary preserves Supabase paths and does not rewire production. FDB must consume the storage abstraction rather than create a competing media-storage subsystem.
- Open PR #248 is a migration-drift recovery trace; its description says its changes were consolidated into PR #242. Do not independently merge stale duplicate migration work.
- Existing isolated PostgreSQL Phase 0 security tests and full migration replay workflow should be extended, not replaced.
- Production main must remain the stable rollback point; all FDB work starts on isolated branches and isolated databases.

## 6. Target architecture

```text
Fresh Web Lite / Fresh ecosystems
            |
      Fresh SDK + API
            |
    Fresh Platform Gateway
       /    |     |     \
   Auth   Data  Realtime Storage
            |
   Fresh PostgreSQL Platform
   - core schemas and migrations
   - owner/tenant isolation + RLS
   - transaction/idempotency contracts
   - outbox + audit events
   - indexes, functions, triggers
            |
   Backup / PITR / restore drills
   Replicas / pooling / monitoring
```

### Initial service boundaries

1. **FDB Core:** PostgreSQL 17-compatible schemas, transactions, migrations, connection pooling, query API, typed client, idempotency and audit.
2. **Fresh ID:** separate identity/session service; database user IDs remain stable across the migration. Auth cutover is a separate project with re-auth/session invalidation plan.
3. **Fresh Realtime:** transactional outbox + durable event IDs, replay, authorization and backpressure. Do not depend on best-effort database notifications as the sole durable event log.
4. **Fresh Storage:** provider-neutral object metadata/access service, integrated with Fresh Infinite Storage. PostgreSQL stores metadata, not multi-gigabyte media blobs.
5. **FDB Operations:** encrypted backups, point-in-time recovery, restore tests, monitoring, schema drift checks, disaster recovery and incident runbooks.

## 7. Ordered implementation plan

| Phase | Deliverable | Exit gate |
|---|---|---|
| 0A | Dependency inventory and current production baseline (this report) | Reviewed scope and known risks |
| 0B | Exact migration/version/fingerprint reconciliation | No unexplained version gaps; repeatable clean replay |
| 0C | Schema/API/RLS/function contract inventory | Every critical operation has an owner and test |
| 1A | Isolated Fresh PostgreSQL 17 development environment | No production credentials; automated reset/replay |
| 1B | FDB Core service + SDK compatibility layer | Contract tests against existing application behavior |
| 1C | Backup/restore, observability, load and failure tests | Verified restore and rollback drills |
| 2 | Shadow reads / dual-write only where idempotent and safe | Reconciliation proves parity; no user-visible cutover |
| 3 | Pilot migration for low-risk bounded data domain | Verified counts, hashes, access and rollback |
| 4 | Auth/realtime/storage migration in separate controlled waves | Feature parity and operational readiness |
| 5 | Production cutover and Supabase decommission decision | Explicit owner approval, tested rollback, zero unexplained data loss |

## 8. Non-negotiable safety rules

- No production DDL/DML or migration application during audit.
- No production credentials in GitHub, browser variables, logs or test fixtures.
- Never migrate password hashes or sessions without a reviewed identity migration design.
- Keep Fresh Coin/treasury ledger data under stricter transaction, idempotency and reconciliation gates.
- Preserve user IDs, foreign keys, ownership, RLS semantics, RPC behavior and media object references.
- Backups are not proven until a restore is successfully tested.
- Do not call the platform independent until Auth, API, realtime, storage, backups, monitoring and incident response are all under Fresh operational control.

## 9. Current audit limitations / next reads

- The live audit captured catalog counts, migration ledger, extension inventory and advisors. It did not export production rows, secrets, function bodies, complete policy definitions, bucket contents, realtime publication settings, auth provider configuration, backup retention/PITR state, query workload statistics or network topology.
- The exact list of installed extension versions should be collected from `pg_extension` (the extension inventory includes both installed and merely available extensions).
- Inspect the active storage buckets, object counts and size distribution in a separate read-only storage audit.
- Inspect auth providers, JWT configuration, active sessions and OAuth redirect dependencies before designing Fresh ID cutover.
- Obtain a production-safe schema dump and fingerprint it against the repository baseline only after a verified backup/restore plan is available.

**Phase 0 status: IN PROGRESS.** This document records the baseline and migration strategy; it is not approval to change production or declare Supabase retired.
