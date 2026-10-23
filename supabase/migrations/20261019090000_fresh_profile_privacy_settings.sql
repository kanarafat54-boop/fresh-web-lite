-- Owner-controlled visibility settings for Fresh Protofile analytics and activity.
-- Fail closed by default: missing preferences are treated as private by the read model.
create table if not exists public.profile_privacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analytics_visibility text not null default 'private'
    check (analytics_visibility in ('public', 'connections', 'private')),
  activity_visibility text not null default 'private'
    check (activity_visibility in ('public', 'connections', 'private')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_privacy_settings enable row level security;
revoke all on table public.profile_privacy_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.profile_privacy_settings to authenticated;

drop policy if exists profile_privacy_settings_select_own on public.profile_privacy_settings;
create policy profile_privacy_settings_select_own
  on public.profile_privacy_settings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists profile_privacy_settings_insert_own on public.profile_privacy_settings;
create policy profile_privacy_settings_insert_own
  on public.profile_privacy_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists profile_privacy_settings_update_own on public.profile_privacy_settings;
create policy profile_privacy_settings_update_own
  on public.profile_privacy_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists profile_privacy_settings_delete_own on public.profile_privacy_settings;
create policy profile_privacy_settings_delete_own
  on public.profile_privacy_settings for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.set_profile_privacy_settings_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_privacy_settings_updated_at on public.profile_privacy_settings;
create trigger profile_privacy_settings_updated_at
before update on public.profile_privacy_settings
for each row execute function public.set_profile_privacy_settings_updated_at();
