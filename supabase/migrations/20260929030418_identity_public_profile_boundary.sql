begin;
drop policy if exists "Public profiles are viewable by everyone" on public.users;
drop policy if exists "Users can insert their own row" on public.users;
drop policy if exists "Users can update their own row" on public.users;
drop policy if exists "Users can view their own row" on public.users;

create policy "Users can view their own row"
on public.users for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own row"
on public.users for insert to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own row"
on public.users for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create or replace view public.user_public_profiles
with (security_invoker = false)
as
select id, username, full_name, verified, presence, created_at
from public.users;

revoke all on public.user_public_profiles from public, anon, authenticated;
grant select on public.user_public_profiles to anon, authenticated;
commit;
