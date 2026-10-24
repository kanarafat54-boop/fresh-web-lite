-- Restored from production schema (20260829100151): connection requests and direct messages
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.connection_requests (
  id uuid default gen_random_uuid() not null,
  requester_id uuid not null,
  recipient_id uuid not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint connection_requests_no_self CHECK ((requester_id <> recipient_id)),
  constraint connection_requests_pkey PRIMARY KEY (id),
  constraint connection_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text]))),
  constraint connection_requests_unique_pair UNIQUE (requester_id, recipient_id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.connection_requests add column if not exists id uuid default gen_random_uuid() not null;
alter table public.connection_requests add column if not exists requester_id uuid not null;
alter table public.connection_requests add column if not exists recipient_id uuid not null;
alter table public.connection_requests add column if not exists status text default 'pending'::text not null;
alter table public.connection_requests add column if not exists created_at timestamp with time zone default now() not null;
alter table public.connection_requests add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.direct_messages (
  id uuid default gen_random_uuid() not null,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint direct_messages_body_check CHECK ((length(TRIM(BOTH FROM body)) > 0)),
  constraint direct_messages_no_self CHECK ((sender_id <> recipient_id)),
  constraint direct_messages_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.direct_messages add column if not exists id uuid default gen_random_uuid() not null;
alter table public.direct_messages add column if not exists sender_id uuid not null;
alter table public.direct_messages add column if not exists recipient_id uuid not null;
alter table public.direct_messages add column if not exists body text not null;
alter table public.direct_messages add column if not exists read_at timestamp with time zone;
alter table public.direct_messages add column if not exists created_at timestamp with time zone default now() not null;

CREATE OR REPLACE FUNCTION public.touch_connection_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('connection_requests', 'connection_requests_recipient_id_fkey', 'FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('connection_requests', 'connection_requests_requester_id_fkey', 'FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('direct_messages', 'direct_messages_recipient_id_fkey', 'FOREIGN KEY (recipient_id) REFERENCES public.users(id) ON DELETE CASCADE'),
      ('direct_messages', 'direct_messages_sender_id_fkey', 'FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE')
    ) as v(tbl, conname, def)
  loop
    if to_regclass('public.' || quote_ident(r.tbl)) is null then continue; end if;
    if exists (select 1 from pg_constraint where conname = r.conname and conrelid = to_regclass('public.' || quote_ident(r.tbl))) then continue; end if;
    begin
      execute format('alter table public.%I add constraint %I %s', r.tbl, r.conname, r.def);
    exception when undefined_table or undefined_column then
      raise notice 'skipped foreign key %: referenced object missing', r.conname;
    end;
  end loop;
end
$$;

CREATE INDEX IF NOT EXISTS connection_requests_recipient_idx ON public.connection_requests USING btree (recipient_id, status);
CREATE INDEX IF NOT EXISTS connection_requests_requester_idx ON public.connection_requests USING btree (requester_id, status);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_unread_idx ON public.direct_messages USING btree (recipient_id) WHERE (read_at IS NULL);
CREATE INDEX IF NOT EXISTS direct_messages_thread_idx ON public.direct_messages USING btree (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages USING btree (sender_id);

alter table public.connection_requests enable row level security;
alter table public.direct_messages enable row level security;

drop policy if exists "connection requests participants read" on public.connection_requests;
create policy "connection requests participants read" on public.connection_requests for select to authenticated
  using ((( SELECT auth.uid() AS uid) = requester_id) OR (( SELECT auth.uid() AS uid) = recipient_id));

drop policy if exists "connection requests recipient response" on public.connection_requests;
create policy "connection requests recipient response" on public.connection_requests for update to authenticated
  using ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = 'pending'::text))
  with check ((( SELECT auth.uid() AS uid) = recipient_id) AND (status = ANY (ARRAY['accepted'::text, 'declined'::text])));

drop policy if exists "connection requests requester insert" on public.connection_requests;
create policy "connection requests requester insert" on public.connection_requests for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = requester_id) AND (requester_id <> recipient_id) AND (status = 'pending'::text));

drop policy if exists "connection requests requester state transition" on public.connection_requests;
create policy "connection requests requester state transition" on public.connection_requests for update to authenticated
  using ((( SELECT auth.uid() AS uid) = requester_id) AND (status = ANY (ARRAY['pending'::text, 'declined'::text, 'cancelled'::text])))
  with check ((( SELECT auth.uid() AS uid) = requester_id) AND (status = ANY (ARRAY['pending'::text, 'cancelled'::text])));

drop policy if exists "direct messages participant read" on public.direct_messages;
create policy "direct messages participant read" on public.direct_messages for select to authenticated
  using ((auth.uid() = sender_id) OR (auth.uid() = recipient_id));

drop policy if exists "direct messages recipient mark read" on public.direct_messages;
create policy "direct messages recipient mark read" on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert" on public.direct_messages for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1 FROM connection_requests cr WHERE ((cr.status = 'accepted'::text) AND (((cr.requester_id = ( SELECT auth.uid() AS uid)) AND (cr.recipient_id = direct_messages.recipient_id)) OR ((cr.recipient_id = ( SELECT auth.uid() AS uid)) AND (cr.requester_id = direct_messages.recipient_id)))))));

drop trigger if exists connection_requests_touch on public.connection_requests;
create trigger connection_requests_touch BEFORE UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.touch_connection_request();

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
