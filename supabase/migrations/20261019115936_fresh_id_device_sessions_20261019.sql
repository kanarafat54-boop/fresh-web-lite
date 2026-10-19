-- Fresh ID device registry and account-controlled session inventory.
-- Browser permission state is metadata only; no media, location, or notification content is stored.

create table if not exists public.fresh_id_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_key text not null check (char_length(device_key) between 16 and 128),
  device_name text not null default 'Unknown device' check (char_length(device_name) between 1 and 120),
  platform text not null default 'Unknown platform' check (char_length(platform) between 1 and 120),
  user_agent text not null default '' check (char_length(user_agent) <= 1000),
  permission_states jsonb not null default '{}'::jsonb check (jsonb_typeof(permission_states) = 'object'),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fresh_id_devices_user_device_unique unique (user_id, device_key)
);

create index if not exists fresh_id_devices_user_last_seen_idx
  on public.fresh_id_devices (user_id, last_seen_at desc);

alter table public.fresh_id_devices enable row level security;
revoke all privileges on table public.fresh_id_devices from public, anon, authenticated;
grant select, insert, update on table public.fresh_id_devices to authenticated;

drop policy if exists fresh_id_devices_select_own on public.fresh_id_devices;
create policy fresh_id_devices_select_own
  on public.fresh_id_devices for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists fresh_id_devices_insert_own on public.fresh_id_devices;
create policy fresh_id_devices_insert_own
  on public.fresh_id_devices for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists fresh_id_devices_update_own on public.fresh_id_devices;
create policy fresh_id_devices_update_own
  on public.fresh_id_devices for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.fresh_id_devices is
  'Per-user device inventory and browser permission-state metadata. Contains no permission-granting tokens or sensor data.';
