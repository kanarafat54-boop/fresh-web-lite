-- Private Fresh ID signup details. Date of birth, gender, country, and consent
-- must not be exposed through the general public profile table.
create table if not exists public.fresh_id_private_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  date_of_birth date,
  country text,
  gender text check (gender is null or gender in ('woman', 'man', 'non_binary', 'self_described')),
  signup_consent_version text,
  signup_consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fresh_id_private_profiles enable row level security;
revoke all on table public.fresh_id_private_profiles from public, anon;
revoke all on table public.fresh_id_private_profiles from authenticated;
grant select, insert, update on table public.fresh_id_private_profiles to authenticated;

drop policy if exists "Users can read their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can read their own Fresh ID private profile"
  on public.fresh_id_private_profiles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can create their own Fresh ID private profile"
  on public.fresh_id_private_profiles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own Fresh ID private profile" on public.fresh_id_private_profiles;
create policy "Users can update their own Fresh ID private profile"
  on public.fresh_id_private_profiles for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Case-insensitive uniqueness for public handles. If legacy duplicate handles exist,
-- reconcile them before applying this migration rather than silently renaming users.
do $
begin
  if exists (
    select 1 from public.users
    where username is not null and btrim(username) <> ''
    group by lower(username)
    having count(*) > 1
  ) then
    raise exception 'Duplicate Fresh ID usernames exist; reconcile them before applying this migration';
  end if;
end $;

create unique index if not exists users_username_lower_unique
  on public.users (lower(username))
  where username is not null and btrim(username) <> '';

notify pgrst, 'reload schema';
