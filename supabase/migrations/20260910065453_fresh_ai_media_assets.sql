-- Restored from production schema (20260910065453): Fresh AI media assets and private storage bucket
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.fresh_ai_media_assets (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  request_id uuid,
  conversation_id uuid,
  kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  model_id text,
  prompt text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_media_assets_kind_check CHECK ((kind = ANY (ARRAY['image'::text, 'video'::text, 'audio'::text, 'file'::text]))),
  constraint fresh_ai_media_assets_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_ai_media_assets add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_ai_media_assets add column if not exists user_id uuid not null;
alter table public.fresh_ai_media_assets add column if not exists request_id uuid;
alter table public.fresh_ai_media_assets add column if not exists conversation_id uuid;
alter table public.fresh_ai_media_assets add column if not exists kind text not null;
alter table public.fresh_ai_media_assets add column if not exists storage_bucket text not null;
alter table public.fresh_ai_media_assets add column if not exists storage_path text not null;
alter table public.fresh_ai_media_assets add column if not exists mime_type text not null;
alter table public.fresh_ai_media_assets add column if not exists model_id text;
alter table public.fresh_ai_media_assets add column if not exists prompt text;
alter table public.fresh_ai_media_assets add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.fresh_ai_media_assets add column if not exists created_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('fresh_ai_media_assets', 'fresh_ai_media_assets_conversation_id_fkey', 'FOREIGN KEY (conversation_id) REFERENCES public.fresh_ai_conversations(id) ON DELETE SET NULL'),
      ('fresh_ai_media_assets', 'fresh_ai_media_assets_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS fresh_ai_media_conversation_idx ON public.fresh_ai_media_assets USING btree (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_media_user_idx ON public.fresh_ai_media_assets USING btree (user_id, created_at DESC);

alter table public.fresh_ai_media_assets enable row level security;

drop policy if exists "fresh_ai_media_owner" on public.fresh_ai_media_assets;
create policy "fresh_ai_media_owner" on public.fresh_ai_media_assets for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('fresh-ai-media', 'fresh-ai-media', false)
on conflict (id) do nothing;
