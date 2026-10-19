-- ecosystem_profiles.fresh_id is uuid (auth user id).
-- App must use user.id for DB keys; FRESH-XXXXXXXX is display-only.

alter table public.ecosystem_profiles enable row level security;

drop policy if exists ecosystem_profiles_select_own on public.ecosystem_profiles;
create policy ecosystem_profiles_select_own
  on public.ecosystem_profiles for select to authenticated
  using (fresh_id = auth.uid());

drop policy if exists ecosystem_profiles_insert_own on public.ecosystem_profiles;
create policy ecosystem_profiles_insert_own
  on public.ecosystem_profiles for insert to authenticated
  with check (fresh_id = auth.uid());

drop policy if exists ecosystem_profiles_update_own on public.ecosystem_profiles;
create policy ecosystem_profiles_update_own
  on public.ecosystem_profiles for update to authenticated
  using (fresh_id = auth.uid())
  with check (fresh_id = auth.uid());

drop policy if exists ecosystem_profiles_delete_own on public.ecosystem_profiles;
create policy ecosystem_profiles_delete_own
  on public.ecosystem_profiles for delete to authenticated
  using (fresh_id = auth.uid());

grant select, insert, update, delete on public.ecosystem_profiles to authenticated;

-- Unique per user + ecosystem for upsert
create unique index if not exists ecosystem_profiles_fresh_ecosystem_uidx
  on public.ecosystem_profiles (fresh_id, ecosystem_id);

-- Bootstrap default sub-profiles for the authenticated user.
create or replace function public.ensure_default_ecosystem_profiles()
returns setof public.ecosystem_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  defaults text[][] := array[
    array['fresh-flow', 'Fresh Flow', 'Shorts, social and discovery feed'],
    array['wallet', 'Fresh Wallet', 'Treasury balances and payment rails'],
    array['creator', 'Creator Studio', 'Publish shorts, posts and drafts'],
    array['marketplace', 'Marketplace', 'Listings and commerce'],
    array['ai', 'Fresh AI', 'Personal intelligence workspace'],
    array['messages', 'Messages', 'Direct messages and connections'],
    array['treasure', 'Treasure', 'Saved value and collections'],
    array['crypto', 'Crypto', 'On-chain assets and rails']
  ];
  row text[];
begin
  if v_uid is null then
    raise exception 'Authentication required';
  end if;

  foreach row slice 1 in array defaults loop
    insert into public.ecosystem_profiles (
      fresh_id, ecosystem_id, title, description, enabled, level, feed_modes, metadata
    ) values (
      v_uid,
      row[1],
      row[2],
      row[3],
      true,
      1,
      case when row[1] = 'fresh-flow'
        then array['for-you','social','learn','relax','others','fresh-picks']
        else array[]::text[]
      end,
      jsonb_build_object('bootstrapped', true)
    )
    on conflict (fresh_id, ecosystem_id) do nothing;
  end loop;

  return query
    select * from public.ecosystem_profiles
    where fresh_id = v_uid
    order by title;
end;
$$;

revoke all on function public.ensure_default_ecosystem_profiles() from public;
grant execute on function public.ensure_default_ecosystem_profiles() to authenticated;

-- Trim usernames that currently have trailing spaces (display bug).
update public.users
set username = trim(username)
where username is distinct from trim(username);

notify pgrst, 'reload schema';
