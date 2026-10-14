-- Disposable PostgreSQL fixture for the Phase 0 migration contract.
-- This is deliberately a minimal schema, not a replacement for a full Supabase clone.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;

create schema if not exists auth;
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;

create table public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,
  recipient_id uuid not null,
  status text not null check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);
alter table public.connection_requests enable row level security;
create policy "connection requests participant read" on public.connection_requests
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "connection requests participants read" on public.connection_requests
  for select to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "connection requests participant update" on public.connection_requests
  for update to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "connection requests participants update" on public.connection_requests
  for update to authenticated using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);
create policy "connection requests requester insert" on public.connection_requests
  for insert to authenticated with check (auth.uid() = requester_id);
create policy "connection requests requester delete" on public.connection_requests
  for delete to authenticated using (auth.uid() = requester_id);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.direct_messages enable row level security;
create policy "direct messages participants read" on public.direct_messages
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "direct messages recipient read receipt" on public.direct_messages
  for update to authenticated using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create table public.fresh_communication_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  kind text not null,
  title text,
  created_at timestamptz not null default now()
);
alter table public.fresh_communication_threads enable row level security;
create policy "fresh thread owner" on public.fresh_communication_threads
  for all to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table public.fresh_communication_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.fresh_communication_threads(id),
  sender_id uuid not null,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now()
);
alter table public.fresh_communication_messages enable row level security;
create policy "fresh message sender" on public.fresh_communication_messages
  for all to authenticated using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create table public.ecosystem_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  enabled boolean not null default false,
  display_name text
);
alter table public.ecosystem_profiles enable row level security;
create policy "ecosystem_profiles_owner_insert" on public.ecosystem_profiles
  for insert to authenticated with check (auth.uid() = owner_id);
create policy "ecosystem_profiles_owner_update" on public.ecosystem_profiles
  for update to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
create policy "ecosystem_profiles_enabled_read" on public.ecosystem_profiles
  for select to anon, authenticated using (enabled or auth.uid() = owner_id);

-- Intentionally reproduce overly broad browser grants so migrations must narrow them.
grant all privileges on table public.connection_requests, public.direct_messages,
  public.fresh_communication_threads, public.fresh_communication_messages,
  public.ecosystem_profiles to anon, authenticated;
