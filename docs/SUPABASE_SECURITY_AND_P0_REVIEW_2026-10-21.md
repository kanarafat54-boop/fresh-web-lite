# Supabase security and P0 review — 2026-10-21

**Scope:** read-only review of the live "Fresh Web Lite" Supabase project (`fwbbyowalnfckpmbutcz`) against the repository and the Master Matrix.
**Principle applied:** no feature is removed or restricted. A finding is only acted on if the fix keeps every current behaviour working.
**Status:** findings only. No database change was made as part of this review. Matrix statuses are not changed here (the matrix is LOCKED; status changes are an owner decision).

## 1. Security advisor findings

### 1.1 Ten tables with row-level security enabled and no policies — no change needed

Tables: `fresh_ai_safety_events`, `fresh_ai_serving_metrics`, `fresh_ai_training_examples`, `fresh_intelligence_evidence_lineage`, `fresh_intelligence_persistence_batches`, `fresh_intelligence_truth_decisions`, `fresh_knowledge_entity_aliases`, `fresh_knowledge_entity_relations`, `ledger_entries`, `ledger_transactions`.

Verified on the live database:

- RLS is enabled on all ten and none has a policy.
- Neither `anon` nor `authenticated` holds any table privilege on any of them.
- Result: browsers and signed-in users cannot read or write them. Only server-side code using the service role can. This is the intended "server only" posture, and the advisor reports it at INFO level only.
- Repository use is server-side only (`src/server/freshAIStatus.ts` counts rows in `fresh_ai_training_examples`; TRUEMODE persistence goes through an RPC).

**Decision:** leave as is. Adding permissive policies would reduce security; adding explicit deny policies would change nothing in behaviour and is optional.

### 1.2 Three SECURITY DEFINER functions executable by signed-in users — intentional, no change

| Function | Why signed-in users must be able to call it |
|---|---|
| `create_fresh_id_account(text, text, text)` | Called by the app from `FreshIdContext.tsx` and `SettingsWorkspace.tsx` for workspace creation. |
| `is_fresh_id_account_member(uuid)` | Used inside the RLS policies on accounts and memberships. |
| `is_fresh_id_account_owner(uuid)` | Used inside the RLS policies on accounts and memberships. |

Verified on the live database: all three have `search_path` pinned to empty, and `anon` cannot execute any of them. The migration `20261019120000_fresh_id_accounts_and_memberships.sql` grants execute to `authenticated` on purpose, and `scripts/verify-fresh-security-contract.mjs` asserts the policy structure.

**Decision:** revoking execute would break signup and the account security rules. Leave as is.

### 1.3 Leaked password protection disabled — needs an owner action in the dashboard

Supabase Auth can reject passwords found in known breaches. This is an Auth setting, not SQL, so it cannot be changed through a migration. Enable it in the Supabase dashboard under Authentication → Providers/Policies → password security. Availability can depend on the Supabase plan. Existing users are not affected; only new and changed passwords are checked.

## 2. Search index

- Full-text search is already live: `posts` (41 of 41 rows) and `shorts` (35 of 35 rows) have populated `search_vector` columns, served by `search_posts_fulltext` and `search_shorts_fulltext`, used by `src/features/fresh-flow/core/searchService.ts`.
- `fresh_search_documents` is an empty, unused table with no consumer in the code. Filling it would create a second search index alongside the working one, which conflicts with the platform rule "shared services only; no competing search system". It was deliberately **not** populated. It also carries a `visibility` column whose semantics are not defined anywhere in the repository, so a blind backfill could expose private content.
- The two repository migrations `20260906113715_fresh_search_engine_foundation.sql` and `20260906113732_fresh_search_engine_rpcs.sql` are empty placeholders; the real definitions exist only in the live database. That is a drift risk for a fresh environment and is worth a follow-up (export the real definitions into migrations).
- **Change made in this branch:** the Discovery screen's "Universal search" was a placeholder. It is now a working search box using the existing search service (Shorts, Posts, People). All existing Discovery domain cards are kept.

## 3. Matrix P0 items

| # | Item | Finding |
|---|---|---|
| 29 Platform layers | Documented in `FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md` (section 8). Matrix status reflects implementation, not documentation. |
| 30 Canonical Data Model | Canonical entities are listed in the Final Master Specification. A schema-level mapping of each entity to its table is not yet written. |
| 35 Persistence rules | The source-of-truth rule is stated in the Final Master Specification and in the Control/Safety/Operations companion. |
| 47 Idempotency & Consistency | Already implemented for money movement. `treasury_transactions.idempotency_key` has a database `unique` constraint, and the transfer functions (`20260808132000`, `20260926094221`, `20260929030313`) reject keys shorter than 8 characters and return the existing transaction on a retry. Other critical operations have not been audited. |

Suggested follow-ups for the owner: review whether items 29 and 35 should move from PLANNED once the written specifications are counted as their evidence; audit non-treasury critical operations (account creation, gifts, marketplace orders) for retry safety.
