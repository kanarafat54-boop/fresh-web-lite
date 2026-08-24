-- Shorts interaction-depth foundation.
-- Keeps existing comment media/reply support while adding persistent
-- reaction, duet/remix lineage, and immersive interaction metadata.

alter table public.shorts
  add column if not exists remix_of_short_id uuid references public.shorts(id) on delete set null,
  add column if not exists duet_of_short_id uuid references public.shorts(id) on delete set null,
  add column if not exists interaction_mode text not null default 'standard',
  add column if not exists immersive_metadata jsonb not null default '{}'::jsonb;

alter table public.shorts drop constraint if exists shorts_interaction_mode_check;
alter table public.shorts add constraint shorts_interaction_mode_check
  check (interaction_mode in ('standard','ar','vr','spatial'));

create index if not exists shorts_remix_of_short_idx on public.shorts(remix_of_short_id);
create index if not exists shorts_duet_of_short_idx on public.shorts(duet_of_short_id);

create table if not exists public.short_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.short_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  constraint short_comment_reactions_unique_user_comment unique (comment_id, user_id)
);

alter table public.short_comment_reactions drop constraint if exists short_comment_reactions_type_check;
alter table public.short_comment_reactions add constraint short_comment_reactions_type_check
  check (reaction_type in ('like','dislike','love','laugh','wow','sad','angry','fire','clap','support'));

create index if not exists short_comment_reactions_comment_idx
  on public.short_comment_reactions(comment_id);
create index if not exists short_comment_reactions_user_idx
  on public.short_comment_reactions(user_id);

alter table public.short_comment_reactions enable row level security;

drop policy if exists short_comment_reactions_select on public.short_comment_reactions;
create policy short_comment_reactions_select
  on public.short_comment_reactions for select
  using (true);

drop policy if exists short_comment_reactions_insert on public.short_comment_reactions;
create policy short_comment_reactions_insert
  on public.short_comment_reactions for insert
  with check (auth.uid() = user_id);

drop policy if exists short_comment_reactions_update on public.short_comment_reactions;
create policy short_comment_reactions_update
  on public.short_comment_reactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists short_comment_reactions_delete on public.short_comment_reactions;
create policy short_comment_reactions_delete
  on public.short_comment_reactions for delete
  using (auth.uid() = user_id);
