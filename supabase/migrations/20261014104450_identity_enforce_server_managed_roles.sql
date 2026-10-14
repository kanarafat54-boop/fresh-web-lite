create or replace function public.protect_users_privileged_columns()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  -- Client sessions cannot assign privileged application roles.
  -- Server/platform operations retain their existing trusted path.
  if coalesce(auth.role(), '') not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'user';
    new.verified := false;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      raise exception 'role can only be changed by the platform'
        using errcode = '42501';
    end if;

    if new.verified is distinct from old.verified then
      raise exception 'verified can only be changed by the platform'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$;
