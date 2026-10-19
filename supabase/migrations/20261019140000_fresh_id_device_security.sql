-- Fresh ID device/session management.
-- Session identifiers come from Supabase Auth JWT claims; no client can choose another user's session.
create or replace function public.list_fresh_id_sessions()
returns table (
  session_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_agent text,
  ip_address text,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    s.id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip::text,
    s.id = nullif(auth.jwt() ->> 'session_id', '')::uuid
  from auth.sessions as s
  where s.user_id = (select auth.uid())
    and (select auth.uid()) is not null
  order by s.updated_at desc nulls last, s.created_at desc;
$function$;

revoke all on function public.list_fresh_id_sessions() from public, anon;
grant execute on function public.list_fresh_id_sessions() to authenticated;

create or replace function public.revoke_fresh_id_session(p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_current_session_id uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_deleted integer := 0;
begin
  if v_user_id is null then
    raise exception 'Fresh ID sign-in is required' using errcode = '42501';
  end if;

  if p_session_id is null then
    raise exception 'A session identifier is required' using errcode = '22023';
  end if;

  if p_session_id = v_current_session_id then
    raise exception 'Use Sign out on this device to end the current session' using errcode = '22023';
  end if;

  delete from auth.sessions
  where id = p_session_id
    and user_id = v_user_id;

  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$function$;

revoke all on function public.revoke_fresh_id_session(uuid) from public, anon;
grant execute on function public.revoke_fresh_id_session(uuid) to authenticated;

comment on function public.list_fresh_id_sessions() is
  'Lists only the signed-in Fresh ID user sessions for device-security settings.';
comment on function public.revoke_fresh_id_session(uuid) is
  'Revokes one other session owned by the signed-in Fresh ID user. Previously issued access JWTs can remain valid until expiry.';
