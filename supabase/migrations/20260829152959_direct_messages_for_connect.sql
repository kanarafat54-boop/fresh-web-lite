-- Restored from production schema (20260829152959): table and column privileges for connection requests and direct messages
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('connection_requests', 'anon', ''),
      ('connection_requests', 'authenticated', 'select'),
      ('direct_messages', 'anon', ''),
      ('direct_messages', 'authenticated', 'select')
    ) as v(tbl, grantee, keep)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    execute format('revoke all on table public.%I from %I', r.tbl, r.grantee);
    if r.keep <> '' then
      execute format('grant %s on table public.%I to %I', r.keep, r.tbl, r.grantee);
    end if;
  end loop;
end
$$;

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('connection_requests', 'insert', 'status,requester_id,recipient_id'),
      ('connection_requests', 'update', 'status'),
      ('direct_messages', 'insert', 'body,sender_id,recipient_id'),
      ('direct_messages', 'update', 'read_at')
    ) as v(tbl, priv, cols)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    execute format('grant %s (%s) on table public.%I to authenticated', r.priv,
      (select string_agg(quote_ident(c), ', ') from unnest(string_to_array(r.cols, ',')) c), r.tbl);
  end loop;
end
$$;
