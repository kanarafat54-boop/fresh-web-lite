-- Restored from production schema (20260827041741): universal interactions (state key, updated_at, legacy short sync)
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

create table if not exists public.universal_interactions (
  id uuid default gen_random_uuid() not null,
  actor_id uuid not null,
  target_type text not null,
  target_id uuid not null,
  interaction_type text not null,
  interaction_value text,
  parent_id uuid,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  state_key text generated always as (
CASE
    WHEN (interaction_type = ANY (ARRAY['react'::text, 'vote'::text, 'save'::text, 'follow'::text, 'repost'::text, 'quote'::text])) THEN interaction_type
    ELSE NULL::text
END) stored,
  constraint universal_interactions_pkey PRIMARY KEY (id),
  constraint universal_interactions_target_type_check CHECK ((target_type = ANY (ARRAY['short'::text, 'video'::text, 'post'::text, 'text'::text, 'image'::text, 'gallery'::text, 'audio'::text, 'podcast'::text, 'live'::text, 'news'::text, 'article'::text, 'story'::text, 'poll'::text, 'comment'::text, 'reply'::text, 'quote'::text, 'remix'::text, 'duet'::text, 'learning'::text, 'knowledge'::text, 'marketplace'::text, 'profile'::text, 'ar'::text, 'vr'::text, 'mixed'::text]))),
  constraint universal_interactions_type_check CHECK ((interaction_type = ANY (ARRAY['react'::text, 'comment'::text, 'reply'::text, 'save'::text, 'share'::text, 'repost'::text, 'quote'::text, 'vote'::text, 'remix'::text, 'duet'::text, 'collaborate'::text, 'follow'::text])))
);

-- Bring a pre-existing, older-shaped table up to the production column set (no-ops where present).
alter table public.universal_interactions add column if not exists id uuid default gen_random_uuid() not null;
alter table public.universal_interactions add column if not exists actor_id uuid not null;
alter table public.universal_interactions add column if not exists target_type text not null;
alter table public.universal_interactions add column if not exists target_id uuid not null;
alter table public.universal_interactions add column if not exists interaction_type text not null;
alter table public.universal_interactions add column if not exists interaction_value text;
alter table public.universal_interactions add column if not exists parent_id uuid;
alter table public.universal_interactions add column if not exists payload jsonb default '{}'::jsonb not null;
alter table public.universal_interactions add column if not exists created_at timestamp with time zone default now() not null;
alter table public.universal_interactions add column if not exists updated_at timestamp with time zone default now() not null;
alter table public.universal_interactions add column if not exists state_key text generated always as ( CASE WHEN (interaction_type = ANY (ARRAY['react'::text, 'vote'::text, 'save'::text, 'follow'::text, 'repost'::text, 'quote'::text])) THEN interaction_type ELSE NULL::text END) stored;

CREATE OR REPLACE FUNCTION public.set_universal_interaction_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_universal_interaction_to_short_legacy()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_reaction text;
begin
  if tg_op = 'DELETE' then
    if old.target_type <> 'short' then
      return old;
    end if;

    if old.interaction_type = 'react' then
      delete from public.short_likes where short_id = old.target_id and user_id = old.actor_id;
    elsif old.interaction_type = 'repost' then
      delete from public.short_reposts where short_id = old.target_id and user_id = old.actor_id;
    elsif old.interaction_type = 'save' then
      delete from public.saved_shorts where short_id = old.target_id and user_id = old.actor_id;
    end if;

    return old;
  end if;

  if new.target_type <> 'short' then
    return new;
  end if;

  if new.interaction_type = 'react' then
    v_reaction := new.interaction_value;
    if v_reaction is null or v_reaction not in ('like','love','laugh','wow','sad','angry') then
      v_reaction := 'like';
    end if;

    insert into public.short_likes (short_id, user_id, reaction_type)
    values (new.target_id, new.actor_id, v_reaction)
    on conflict (short_id, user_id) do update set reaction_type = excluded.reaction_type;
  elsif new.interaction_type = 'repost' then
    insert into public.short_reposts (short_id, user_id)
    values (new.target_id, new.actor_id)
    on conflict (short_id, user_id) do nothing;
  elsif new.interaction_type = 'save' then
    insert into public.saved_shorts (short_id, user_id)
    values (new.target_id, new.actor_id)
    on conflict (short_id, user_id) do nothing;
  end if;

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
      ('universal_interactions', 'universal_interactions_actor_id_fkey', 'FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE CASCADE'),
      ('universal_interactions', 'universal_interactions_parent_id_fkey', 'FOREIGN KEY (parent_id) REFERENCES public.universal_interactions(id) ON DELETE CASCADE')
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

CREATE INDEX IF NOT EXISTS universal_interactions_actor_idx ON public.universal_interactions USING btree (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS universal_interactions_actor_type_idx ON public.universal_interactions USING btree (actor_id, interaction_type);
CREATE INDEX IF NOT EXISTS universal_interactions_event_idx ON public.universal_interactions USING btree (target_type, target_id, interaction_type, created_at DESC) WHERE (state_key IS NULL);
CREATE INDEX IF NOT EXISTS universal_interactions_parent_idx ON public.universal_interactions USING btree (parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS universal_interactions_state_uidx ON public.universal_interactions USING btree (actor_id, target_type, target_id, state_key) WHERE (state_key IS NOT NULL);
CREATE INDEX IF NOT EXISTS universal_interactions_target_idx ON public.universal_interactions USING btree (target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS universal_interactions_target_type_id_idx ON public.universal_interactions USING btree (target_type, target_id);

alter table public.universal_interactions enable row level security;

drop policy if exists "universal_interactions_delete" on public.universal_interactions;
create policy "universal_interactions_delete" on public.universal_interactions for delete to public
  using (auth.uid() = actor_id);

drop policy if exists "universal_interactions_insert" on public.universal_interactions;
create policy "universal_interactions_insert" on public.universal_interactions for insert to public
  with check (auth.uid() = actor_id);

drop policy if exists "universal_interactions_select" on public.universal_interactions;
create policy "universal_interactions_select" on public.universal_interactions for select to public
  using (true);

drop policy if exists "universal_interactions_update" on public.universal_interactions;
create policy "universal_interactions_update" on public.universal_interactions for update to public
  using (auth.uid() = actor_id)
  with check (auth.uid() = actor_id);

drop trigger if exists universal_interactions_set_updated_at on public.universal_interactions;
create trigger universal_interactions_set_updated_at BEFORE UPDATE ON public.universal_interactions FOR EACH ROW EXECUTE FUNCTION public.set_universal_interaction_updated_at();

drop trigger if exists universal_interactions_sync_short_legacy on public.universal_interactions;
create trigger universal_interactions_sync_short_legacy AFTER INSERT OR DELETE OR UPDATE ON public.universal_interactions FOR EACH ROW EXECUTE FUNCTION public.sync_universal_interaction_to_short_legacy();
