-- Restored from production schema (20260909194622): Fresh AI conversations and turns
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.fresh_ai_conversations (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  title text,
  route text default '/ai'::text not null,
  surface text,
  model_id text,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fresh_ai_conversations_pkey PRIMARY KEY (id)
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_ai_conversations add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_ai_conversations add column if not exists user_id uuid not null;
alter table public.fresh_ai_conversations add column if not exists title text;
alter table public.fresh_ai_conversations add column if not exists route text default '/ai'::text not null;
alter table public.fresh_ai_conversations add column if not exists surface text;
alter table public.fresh_ai_conversations add column if not exists model_id text;
alter table public.fresh_ai_conversations add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.fresh_ai_conversations add column if not exists created_at timestamp with time zone default now() not null;
alter table public.fresh_ai_conversations add column if not exists updated_at timestamp with time zone default now() not null;

create table if not exists public.fresh_ai_conversation_turns (
  id uuid default gen_random_uuid() not null,
  conversation_id uuid not null,
  user_id uuid not null,
  request_id uuid,
  role text not null,
  content text not null,
  model_id text,
  evidence jsonb default '[]'::jsonb not null,
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_conversation_turns_pkey PRIMARY KEY (id),
  constraint fresh_ai_conversation_turns_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text, 'tool'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.fresh_ai_conversation_turns add column if not exists id uuid default gen_random_uuid() not null;
alter table public.fresh_ai_conversation_turns add column if not exists conversation_id uuid not null;
alter table public.fresh_ai_conversation_turns add column if not exists user_id uuid not null;
alter table public.fresh_ai_conversation_turns add column if not exists request_id uuid;
alter table public.fresh_ai_conversation_turns add column if not exists role text not null;
alter table public.fresh_ai_conversation_turns add column if not exists content text not null;
alter table public.fresh_ai_conversation_turns add column if not exists model_id text;
alter table public.fresh_ai_conversation_turns add column if not exists evidence jsonb default '[]'::jsonb not null;
alter table public.fresh_ai_conversation_turns add column if not exists metadata jsonb default '{}'::jsonb not null;
alter table public.fresh_ai_conversation_turns add column if not exists created_at timestamp with time zone default now() not null;

-- Foreign keys: added only when missing; skipped (with a notice) if a referenced table does not exist yet.
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('fresh_ai_conversation_turns', 'fresh_ai_conversation_turns_conversation_id_fkey', 'FOREIGN KEY (conversation_id) REFERENCES public.fresh_ai_conversations(id) ON DELETE CASCADE'),
      ('fresh_ai_conversation_turns', 'fresh_ai_conversation_turns_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('fresh_ai_conversations', 'fresh_ai_conversations_user_id_fkey', 'FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS fresh_ai_conversations_user_idx ON public.fresh_ai_conversations USING btree (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS fresh_ai_turns_conversation_idx ON public.fresh_ai_conversation_turns USING btree (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS fresh_ai_turns_user_idx ON public.fresh_ai_conversation_turns USING btree (user_id, created_at DESC);

alter table public.fresh_ai_conversations enable row level security;
alter table public.fresh_ai_conversation_turns enable row level security;

drop policy if exists "fresh_ai_conversations_owner" on public.fresh_ai_conversations;
create policy "fresh_ai_conversations_owner" on public.fresh_ai_conversations for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "fresh_ai_turns_owner" on public.fresh_ai_conversation_turns;
create policy "fresh_ai_turns_owner" on public.fresh_ai_conversation_turns for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
