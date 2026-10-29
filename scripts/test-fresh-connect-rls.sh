#!/usr/bin/env bash
# Applies the real Connect/messaging migrations to a database and runs the
# behavioral authorization test. Use ONLY a disposable database.
#
#   DATABASE_URL=postgres://... bash scripts/test-fresh-connect-rls.sh
#
# The script creates minimal Supabase-compatible stand-ins (roles, auth.users,
# auth.uid()) so the project's migrations replay unchanged. It refuses to run
# if auth.users already contains rows, as a guard against pointing at a real
# Supabase project.
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL must point at a disposable PostgreSQL database}"
cd "$(dirname "$0")/.."

PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)

if "${PSQL[@]}" -tAc "select to_regclass('auth.users') is not null" | grep -q t; then
  rows=$("${PSQL[@]}" -tAc "select count(*) from auth.users")
  if [ "$rows" != "0" ]; then
    echo "Refusing to run: auth.users is not empty; this does not look like a disposable database." >&2
    exit 2
  fi
fi

"${PSQL[@]}" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
-- Supabase gives these roles default privileges on new public tables; mirror
-- that so the migrations' REVOKE statements are what is actually being tested.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
SQL

MIGRATIONS=(
  supabase/migrations/202608240001_connections_foundation.sql
  supabase/migrations/20261012173445_drop_tautological_direct_message_policy.sql
  supabase/migrations/20261014193000_fresh_communication_tables_foundation.sql
  supabase/migrations/20261014194000_harden_connection_request_transitions.sql
  supabase/migrations/20261014194500_harden_phase0_messaging_access.sql
  supabase/migrations/20261019101500_direct_message_realtime_publication.sql
  supabase/migrations/20261027100000_direct_messages_replayable_read_policies.sql
)
for file in "${MIGRATIONS[@]}"; do
  echo "applying $file"
  "${PSQL[@]}" -f "$file"
done

"${PSQL[@]}" -f scripts/test-fresh-connect-rls.sql
echo "Fresh Connect RLS behavioral test: PASS"
