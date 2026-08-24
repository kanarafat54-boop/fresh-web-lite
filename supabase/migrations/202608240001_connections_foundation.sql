-- Fresh Web Lite connections foundation
-- Persists real connection requests; UI state must never be used as the source of truth.

create table if not exists public.connection_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint connection_requests_not_self check (requester_id <> recipient_id),
  constraint connection_requests_unique_pair unique (requester_id, recipient_id)
);

create index if not exists connection_requests_recipient_idx
  on public.connection_requests(recipient_id, status, created_at desc);
create index if not exists connection_requests_requester_idx
  on public.connection_requests(requester_id, status, created_at desc);

alter table public.connection_requests enable row level security;

drop policy if exists "connection requests participants read" on public.connection_requests;
create policy "connection requests participants read" on public.connection_requests
  for select using (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "connection requests requester insert" on public.connection_requests;
create policy "connection requests requester insert" on public.connection_requests
  for insert with check (auth.uid() = requester_id and requester_id <> recipient_id);

drop policy if exists "connection requests participants update" on public.connection_requests;
create policy "connection requests participants update" on public.connection_requests
  for update using (auth.uid() = requester_id or auth.uid() = recipient_id)
  with check (auth.uid() = requester_id or auth.uid() = recipient_id);

drop policy if exists "connection requests requester delete" on public.connection_requests;
create policy "connection requests requester delete" on public.connection_requests
  for delete using (auth.uid() = requester_id);

create or replace function public.touch_connection_request() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists connection_requests_touch on public.connection_requests;
create trigger connection_requests_touch before update on public.connection_requests
for each row execute function public.touch_connection_request();
