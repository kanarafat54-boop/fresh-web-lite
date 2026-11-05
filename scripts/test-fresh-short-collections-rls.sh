#!/usr/bin/env bash
# Applies the collections/pin migration to a DISPOSABLE database with minimal stand-ins and runs the behavioral test.
#   DATABASE_URL=postgres://... bash scripts/test-fresh-short-collections-rls.sh
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL must point at a disposable PostgreSQL database}"
cd "$(dirname "$0")/.."
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q)
if "${PSQL[@]}" -tAc "select to_regclass('auth.users') is not null" | grep -q t; then
  [ "$("${PSQL[@]}" -tAc "select count(*) from auth.users")" = "0" ] || { echo "Refusing: auth.users not empty" >&2; exit 2; }
fi
"${PSQL[@]}" <<'SQL'
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
create table if not exists public.shorts (id uuid primary key, author_id uuid not null);
create table if not exists public.short_comments (id uuid primary key, short_id uuid not null references public.shorts(id), parent_id uuid, author_id uuid not null);
grant select on public.shorts, public.short_comments to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
SQL
"${PSQL[@]}" -f supabase/migrations/20261102120000_fresh_short_collections_and_comment_pin.sql
"${PSQL[@]}" -f supabase/migrations/20261102140000_harden_fresh_short_comment_pinning.sql
"${PSQL[@]}" -f scripts/test-fresh-short-collections-rls.sql
echo "Short collections / pin RLS behavioral test: PASS"
