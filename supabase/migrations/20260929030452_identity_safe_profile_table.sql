begin;
drop view if exists public.user_public_profiles;

create table if not exists public.user_public_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  full_name text not null default '',
  verified boolean not null default false,
  presence text not null default 'offline',
  created_at timestamptz not null default now()
);

alter table public.user_public_profiles enable row level security;

drop policy if exists "Public profiles are readable" on public.user_public_profiles;
create policy "Public profiles are readable"
on public.user_public_profiles for select
to anon, authenticated
using (true);

revoke insert, update, delete on public.user_public_profiles from anon, authenticated, public;
grant select on public.user_public_profiles to anon, authenticated;

create or replace function public.sync_user_public_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  insert into public.user_public_profiles(id,username,full_name,verified,presence,created_at)
  values(new.id,new.username,coalesce(new.full_name,''),coalesce(new.verified,false),coalesce(new.presence,'offline'),coalesce(new.created_at,now()))
  on conflict (id) do update set
    username=excluded.username,
    full_name=excluded.full_name,
    verified=excluded.verified,
    presence=excluded.presence;
  return new;
end;
$function$;

drop trigger if exists sync_user_public_profile on public.users;
create trigger sync_user_public_profile
after insert or update of username,full_name,verified,presence on public.users
for each row execute function public.sync_user_public_profile();

insert into public.user_public_profiles(id,username,full_name,verified,presence,created_at)
select id,username,coalesce(full_name,''),coalesce(verified,false),coalesce(presence,'offline'),coalesce(created_at,now())
from public.users
on conflict (id) do update set
  username=excluded.username,
  full_name=excluded.full_name,
  verified=excluded.verified,
  presence=excluded.presence;

revoke all on function public.sync_user_public_profile() from public, anon, authenticated;
commit;
