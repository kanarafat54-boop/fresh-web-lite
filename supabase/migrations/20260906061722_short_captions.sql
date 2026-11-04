-- Restored from production schema (20260906061722): short captions
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.short_captions (
  id uuid default gen_random_uuid() not null,
  short_id uuid not null,
  language text default 'en'::text not null,
  source text not null,
  status text default 'pending'::text not null,
  segments jsonb default '[]'::jsonb not null,
  error_message text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint short_captions_pkey PRIMARY KEY (id),
  constraint short_captions_short_id_language_key UNIQUE (short_id, language),
  constraint short_captions_source_check CHECK ((source = ANY (ARRAY['ai-generated'::text, 'creator-uploaded'::text]))),
  constraint short_captions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'failed'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.short_captions add column if not exists id uuid default gen_random_uuid() not null;
alter table public.short_captions add column if not exists short_id uuid not null;
alter table public.short_captions add column if not exists language text default 'en'::text not null;
alter table public.short_captions add column if not exists source text not null;
alter table public.short_captions add column if not exists status text default 'pending'::text not null;
alter table public.short_captions add column if not exists segments jsonb default '[]'::jsonb not null;
alter table public.short_captions add column if not exists error_message text;
alter table public.short_captions add column if not exists created_by uuid;
alter table public.short_captions add column if not exists created_at timestamp with time zone default now() not null;
alter table public.short_captions add column if not exists updated_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('short_captions', 'short_captions_created_by_fkey', 'FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL'),
      ('short_captions', 'short_captions_short_id_fkey', 'FOREIGN KEY (short_id) REFERENCES public.shorts(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS idx_short_captions_created_by ON public.short_captions USING btree (created_by);
CREATE INDEX IF NOT EXISTS short_captions_short_idx ON public.short_captions USING btree (short_id);

alter table public.short_captions enable row level security;

drop policy if exists "short captions author insert" on public.short_captions;
create policy "short captions author insert" on public.short_captions for insert to authenticated
  with check ((created_by = auth.uid()) AND (EXISTS ( SELECT 1 FROM shorts s WHERE ((s.id = short_captions.short_id) AND (s.author_id = auth.uid())))));

drop policy if exists "short captions author update" on public.short_captions;
create policy "short captions author update" on public.short_captions for update to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "short captions public read" on public.short_captions;
create policy "short captions public read" on public.short_captions for select to authenticated
  using ((status = 'ready'::text) OR (created_by = auth.uid()));

do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('short_captions', 'authenticated', 'insert,references,select,trigger,truncate,update')
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
