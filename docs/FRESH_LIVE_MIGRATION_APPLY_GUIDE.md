# Fresh Live — Non-production migration apply guide

**Status:** Guidance only. Do **not** apply to production without explicit owner approval.  
**Migration:** `supabase/migrations/20261117120000_fresh_live_session_core.sql`  
**Branch:** `feature/fresh-live-phase1-control-plane`

## What this migration creates

| Object | Purpose |
|--------|---------|
| `public.live_sessions` | Canonical control-plane session record |
| `public.live_participants` | Host / guest / viewer membership |
| RLS policies | Owner control + limited public discoverability |
| Triggers | `updated_at` maintenance |

It does **not** create media provider tables, stream keys, or recording storage.

## Preconditions

1. Use a **disposable or staging** Supabase project (not production `fwbbyowalnfckpmbutcz` unless explicitly approved).
2. You have the Supabase CLI or SQL editor access with a role that can create tables and policies.
3. `auth.users` exists (standard Supabase Auth).
4. Review the full SQL file before running it.

## Option A — Supabase SQL editor (simplest)

1. Open the target project → SQL → New query.
2. Paste the entire contents of `supabase/migrations/20261117120000_fresh_live_session_core.sql`.
3. Run.
4. Confirm success (no errors).
5. Optionally run:
   ```sql
   select tablename from pg_tables where schemaname = 'public' and tablename like 'live_%';
   select polname, tablename from pg_policies where tablename like 'live_%';
   ```

## Option B — Supabase CLI (linked project)

```bash
# From repo root, linked to the NON-production project
npx supabase db push
# or apply a single file if your workflow supports it
```

Only link the CLI to a project you intend to change.

## Post-apply checks

```sql
-- Tables present
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('live_sessions', 'live_participants');

-- RLS enabled
select relname, relrowsecurity
from pg_class
where relname in ('live_sessions', 'live_participants');

-- Policies exist
select polname, tablename
from pg_policies
where tablename in ('live_sessions', 'live_participants');
```

## Behavioral smoke (after API is deployed to a preview)

1. Authenticate as user A.
2. `POST /api/live/sessions` with `{ "action": "create", "title": "Test" }` → 200, status `draft`.
3. `{ "action": "prepare", "id": "<id>" }` → status `ready`.
4. `{ "action": "start", "id": "<id>" }` → **503** `LIVE_MEDIA_NOT_CONFIGURED` (expected).
5. Authenticate as user B → `get` on a private draft must not leak the session.

## Rollback (non-production only)

```sql
drop table if exists public.live_participants;
drop table if exists public.live_sessions;
drop function if exists public.live_set_updated_at();
```

Record the migration version as reverted in your process if you use migration history tables.

## Production boundary

- Do not apply this migration to production until the PR is reviewed and the owner explicitly approves.
- Do not enable a paid media provider as part of applying this migration.
- After any approved production apply, re-query live grants and policies (do not trust static SQL alone).
