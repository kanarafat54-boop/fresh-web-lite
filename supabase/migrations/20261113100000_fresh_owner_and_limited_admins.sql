-- Fresh platform roles: one owner with total control, admins with limited access.
--
--   * role is now one of 'user', 'admin', 'owner'.
--   * Exactly one owner can exist (unique partial index). The owner role can only be granted or removed by a
--     database superuser path (migrations, SQL editor). The browser roles are already blocked from changing
--     role by protect_users_privileged_columns; this guard also blocks the server key (service_role), so a bug
--     in an API route cannot create or remove the owner.
--   * Reviewers (moderation queue, appeals) are admins and the owner.
--   * The existing account kanarafat54@gmail.com (Memphis Arafat) becomes the owner.
-- Nothing is deleted. Admins keep their role; their API powers are narrowed in api/admin/users.ts.

do $$ begin
  alter table public.users drop constraint if exists users_role_check;
  alter table public.users add constraint users_role_check check (role in ('user', 'admin', 'owner'));
end $$;

create unique index if not exists users_single_owner_uq on public.users ((true)) where role = 'owner';

create or replace function public.guard_owner_role()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'INSERT' and new.role = 'owner' then
    raise exception 'The owner role cannot be granted from here.' using errcode = '42501';
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role and (new.role = 'owner' or old.role = 'owner') then
    raise exception 'The owner role cannot be granted or removed from here.' using errcode = '42501';
  elsif tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'The owner account cannot be deleted from here.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end; $$;
revoke all on function public.guard_owner_role() from public, anon, authenticated;

drop trigger if exists guard_owner_role_write on public.users;
create trigger guard_owner_role_write before insert or update of role on public.users
  for each row execute function public.guard_owner_role();
drop trigger if exists guard_owner_role_delete on public.users;
create trigger guard_owner_role_delete before delete on public.users
  for each row execute function public.guard_owner_role();

create or replace function public.is_platform_owner()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.users where id = auth.uid() and role = 'owner') $$;
revoke all on function public.is_platform_owner() from public, anon;
grant execute on function public.is_platform_owner() to authenticated;

create or replace function public.is_platform_reviewer()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.users where id = auth.uid() and role in ('admin', 'owner')) $$;

update public.users set role = 'owner' where lower(email) = 'kanarafat54@gmail.com' and role <> 'owner';

notify pgrst, 'reload schema';
