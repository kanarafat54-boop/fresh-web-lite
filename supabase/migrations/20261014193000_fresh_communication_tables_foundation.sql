-- Canonical Fresh Communication storage foundation for clean database replay.
-- Production already has these tables from remote history; create them idempotently
-- for new environments before the later Phase 0 access-hardening migration.
create table if not exists public.fresh_communication_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'direct',
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fresh_communication_threads_owner_idx
  on public.fresh_communication_threads (owner_id, updated_at desc);

alter table public.fresh_communication_threads enable row level security;

create table if not exists public.fresh_communication_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.fresh_communication_threads(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'text',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists fresh_communication_messages_sender_idx
  on public.fresh_communication_messages (sender_id, created_at desc);
create index if not exists fresh_communication_messages_thread_created_idx
  on public.fresh_communication_messages (thread_id, created_at desc);

alter table public.fresh_communication_messages enable row level security;
