-- Disposable PostgreSQL fixture for Phase 0 security migration contract.
-- Schema/constraints mirror the live target tables as inspected on 2026-10-14.
-- This is intentionally not a full Supabase clone: only dependencies needed by
-- these migrations and their tests are represented. Never run this against prod.
create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end
$$;

create schema if not exists auth;
create table auth.users (id uuid primary key);
create table public.users (id uuid primary key);

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
  requester_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_requests_no_self check (requester_id <> recipient_id),
  constraint connection_requests_unique_pair unique (requester_id, recipient_id)
);
create index connection_requests_recipient_idx on public.connection_requests (recipient_id, status);
create index connection_requests_requester_idx on public.connection_requests (requester_id, status);
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
  for insert to authenticated with check (auth.uid() = requester_id and requester_id <> recipient_id);
create policy "connection requests requester delete" on public.connection_requests
  for delete to authenticated using (auth.uid() = requester_id);

create table public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete cascade,
  recipient_id uuid not null references public.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint direct_messages_no_self check (sender_id <> recipient_id)
);
create index direct_messages_recipient_unread_idx on public.direct_messages (recipient_id) where read_at is null;
create index direct_messages_thread_idx on public.direct_messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
create index idx_direct_messages_sender_id on public.direct_messages (sender_id);
alter table public.direct_messages enable row level security;
create policy "direct messages participant read" on public.direct_messages
  for select to authenticated using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "direct messages recipient mark read" on public.direct_messages
  for update to authenticated using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);
create policy "direct messages sender insert" on public.direct_messages
  for insert to authenticated with check (auth.uid() = sender_id);

create table public.fresh_communication_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'direct',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index fresh_communication_threads_owner_idx
  on public.fresh_communication_threads (owner_id, updated_at desc);
alter table public.fresh_communication_threads enable row level security;
create policy "fresh thread owner" on public.fresh_communication_threads
  for all to authenticated using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create table public.fresh_communication_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.fresh_communication_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text',
  body text not null,
  created_at timestamptz not null default now()
);
create index fresh_communication_messages_sender_idx
  on public.fresh_communication_messages (sender_id, created_at desc);
create index fresh_communication_messages_thread_created_idx
  on public.fresh_communication_messages (thread_id, created_at desc);
alter table public.fresh_communication_messages enable row level security;
create policy "fresh message sender" on public.fresh_communication_messages
  for all to authenticated using (auth.uid() = sender_id)
  with check (auth.uid() = sender_id);

create table public.ecosystem_profiles (
  id uuid primary key default gen_random_uuid(),
  fresh_id uuid not null references public.users(id) on delete cascade,
  ecosystem_id text not null,
  title text not null default '',
  description text not null default '',
  enabled boolean not null default true,
  level integer not null default 0,
  feed_modes text[] not null default array['for-you','social','learn','relax','others']::text[],
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ecosystem_profiles_feed_modes_check
    check (feed_modes <@ array['for-you','social','learn','relax','others']::text[]),
  constraint ecosystem_profiles_fresh_ecosystem_unique unique (fresh_id, ecosystem_id)
);
create index ecosystem_profiles_ecosystem_id_idx on public.ecosystem_profiles (ecosystem_id);
create index ecosystem_profiles_fresh_id_idx on public.ecosystem_profiles (fresh_id);
alter table public.ecosystem_profiles enable row level security;
create policy "ecosystem profiles are publicly readable when enabled" on public.ecosystem_profiles
  for select to anon, authenticated using (enabled = true or auth.uid() = fresh_id);
create policy "ecosystem_profiles_delete_own" on public.ecosystem_profiles
  for delete to authenticated using (fresh_id = auth.uid());
create policy "ecosystem_profiles_insert_own" on public.ecosystem_profiles
  for insert to authenticated with check (fresh_id = auth.uid());
create policy "ecosystem_profiles_select_own" on public.ecosystem_profiles
  for select to authenticated using (fresh_id = auth.uid());
create policy "ecosystem_profiles_update_own" on public.ecosystem_profiles
  for update to authenticated using (fresh_id = auth.uid())
  with check (fresh_id = auth.uid());
create policy "users can create their ecosystem profiles" on public.ecosystem_profiles
  for insert to authenticated with check (auth.uid() = fresh_id);
create policy "users can delete their ecosystem profiles" on public.ecosystem_profiles
  for delete to authenticated using (auth.uid() = fresh_id);
create policy "users can update their ecosystem profiles" on public.ecosystem_profiles
  for update to authenticated using (auth.uid() = fresh_id)
  with check (auth.uid() = fresh_id);

-- Reproduce broad browser grants observed in production so migrations must narrow them.
grant all privileges on table public.connection_requests, public.direct_messages,
  public.fresh_communication_threads, public.fresh_communication_messages,
  public.ecosystem_profiles to anon, authenticated;
grant all privileges on table public.connection_requests, public.direct_messages,
  public.fresh_communication_threads, public.fresh_communication_messages,
  public.ecosystem_profiles to service_role;
