-- Restrict Fresh ID browser writes to the profile fields users are allowed to edit.
-- Service-role/platform operations retain the existing trusted write path.

create or replace function public.protect_users_privileged_columns()
returns trigger
language plpgsql
set search_path to ''
as $function$
declare
  v_role text := coalesce(auth.role(), '');
  v_jwt_email text;
begin
  if v_role not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or new.id is distinct from auth.uid() then
      raise exception 'Fresh ID profile must belong to the authenticated user'
        using errcode = '42501';
    end if;

    v_jwt_email := auth.jwt() ->> 'email';
    if v_jwt_email is null or btrim(v_jwt_email) = '' then
      raise exception 'Fresh ID profile email must come from the authenticated identity'
        using errcode = '42501';
    end if;

    new.email := v_jwt_email;
    new.role := 'user';
    new.verified := false;
    new.presence := 'online';
    new.identity := '{}'::jsonb;
    new.stats := jsonb_build_object(
      'followerCount', 0,
      'followingCount', 0,
      'postCount', 0,
      'reputationScore', 0
    );
    new.security := jsonb_build_object('twoFactorEnabled', false);
    new.subscription := jsonb_build_object('tier', 'free', 'isTrial', false);
    new.linked_accounts := '[]'::jsonb;
    new.created_at := now();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.verified is distinct from old.verified
      or new.presence is distinct from old.presence
      or new.identity is distinct from old.identity
      or new.stats is distinct from old.stats
      or new.security is distinct from old.security
      or new.subscription is distinct from old.subscription
      or new.linked_accounts is distinct from old.linked_accounts
      or new.created_at is distinct from old.created_at then
      raise exception 'Fresh ID identity, security, role, and entitlement fields are server-managed'
        using errcode = '42501';
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$function$;

-- Remove broad table-level browser privileges, then grant only the columns
-- required by the Fresh ID signup and profile-edit flows.
revoke insert, update on table public.users from public, anon, authenticated;
grant insert (id, username, email, full_name, preferences) on table public.users to authenticated;
grant update (username, full_name, preferences, updated_at) on table public.users to authenticated;

notify pgrst, 'reload schema';
