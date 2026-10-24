-- Restored from production schema (20260827040648): economic event metering
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.fresh_economic_events (
  id uuid default gen_random_uuid() not null,
  actor_id uuid,
  event_type text not null,
  source_type text not null,
  source_id text,
  quantity numeric(20,6) default 1 not null,
  unit text default 'event'::text not null,
  estimated_cost numeric(20,8) default 0 not null,
  attributed_revenue numeric(20,8) default 0 not null,
  currency text default 'USD'::text not null,
  consent_scope text,
  metadata jsonb default '{}'::jsonb not null,
  occurred_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_economic_events_attributed_revenue_check CHECK ((attributed_revenue >= (0)::numeric)),
  constraint fresh_economic_events_currency_check CHECK ((char_length(currency) = 3)),
  constraint fresh_economic_events_estimated_cost_check CHECK ((estimated_cost >= (0)::numeric)),
  constraint fresh_economic_events_event_type_check CHECK ((event_type = ANY (ARRAY['media_impression'::text, 'media_stream'::text, 'media_completion'::text, 'search'::text, 'ai_request'::text, 'creator_transaction'::text, 'commerce_transaction'::text, 'ad_impression'::text, 'ad_click'::text, 'premium_subscription'::text, 'developer_transaction'::text, 'business_campaign'::text]))),
  constraint fresh_economic_events_pkey PRIMARY KEY (id),
  constraint fresh_economic_events_quantity_check CHECK ((quantity >= (0)::numeric))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_economic_events add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_economic_events add column if not exists actor_id uuid;
alter table public.fresh_economic_events add column if not exists event_type text not null;
alter table public.fresh_economic_events add column if not exists source_type text not null;
alter table public.fresh_economic_events add column if not exists source_id text;
alter table public.fresh_economic_events add column if not exists quantity numeric(20,6) default 1 not null;
alter table public.fresh_economic_events add column if not exists unit text default 'event'::text not null;
alter table public.fresh_economic_events add column if not exists estimated_cost numeric(20,8) default 0 not null;
alter table public.fresh_economic_events add column if not exists attributed_revenue numeric(20,8) default 0 not null;
alter table public.fresh_economic_events add column if not exists currency text default 'USD'::text not null;
alter table public.fresh_economic_events add column if not exists consent_scope text;
alter table public.fresh_economic_events add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.fresh_economic_events add column if not exists occurred_at timestamp with time zone default now() not null;
alter table public.fresh_economic_events add column if not exists created_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('fresh_economic_events', 'fresh_economic_events_actor_id_fkey', 'FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL')
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

CREATE INDEX IF NOT EXISTS fresh_economic_events_actor_idx ON public.fresh_economic_events USING btree (actor_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS fresh_economic_events_occurred_at_idx ON public.fresh_economic_events USING btree (occurred_at DESC);
CREATE INDEX IF NOT EXISTS fresh_economic_events_source_idx ON public.fresh_economic_events USING btree (source_type, source_id);
CREATE INDEX IF NOT EXISTS fresh_economic_events_type_idx ON public.fresh_economic_events USING btree (event_type, occurred_at DESC);

alter table public.fresh_economic_events enable row level security;

drop policy if exists "users can view their own economic events" on public.fresh_economic_events;
create policy "users can view their own economic events" on public.fresh_economic_events for select to public
  using (auth.uid() = actor_id);
