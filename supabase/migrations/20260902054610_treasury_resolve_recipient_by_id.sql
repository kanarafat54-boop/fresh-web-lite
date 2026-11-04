-- Restored from production schema (20260902054610): treasury recipient lookup by id
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

CREATE OR REPLACE FUNCTION public.treasury_resolve_recipient_by_id(p_actor_id uuid, p_recipient_id uuid, p_asset_code text DEFAULT 'FRESH'::text)
 RETURNS TABLE(account_id uuid, display_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_code text := upper(trim(p_asset_code));
begin
  if p_actor_id is null then raise exception 'Authentication required'; end if;
  if p_recipient_id = p_actor_id then raise exception 'You cannot gift yourself'; end if;

  return query
  select a.id, a.display_name
  from public.treasury_accounts a
  where a.owner_id = p_recipient_id and a.scope = 'user' and a.kind = 'asset'
    and a.asset_code = v_code and a.active
  limit 1;
end;
$function$;
