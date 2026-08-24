-- Fresh Shorts Interaction Engine
-- Durable primitives for rich comments, reactions, remixes/duets and immersive modes.

create table if not exists public.short_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.short_comments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  reaction_type text not null check (char_length(reaction_type) between 1 and 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, user_id)
);

create index if not exists short_comment_reactions_comment_idx
  on public.short_comment_reactions(comment_id);
create index if not exists short_comment_reactions_user_idx
  on public.short_comment_reactions(user_id);

create table if not exists public.short_comment_reaction_counts (
  comment_id uuid not null references public.short_comments(id) on delete cascade,
  reaction_type text not null,
  reaction_count bigint not null default 0,
  primary key (comment_id, reaction_type)
);

create index if not exists short_comment_reaction_counts_comment_idx
  on public.short_comment_reaction_counts(comment_id);

create table if not exists public.short_remixes (
  id uuid primary key default gen_random_uuid(),
  source_short_id uuid not null references public.shorts(id) on delete cascade,
  remix_short_id uuid not null unique references public.shorts(id) on delete cascade,
  creator_id uuid not null references public.users(id) on delete cascade,
  mode text not null check (mode in ('remix','duet')),
  source_start_ms bigint,
  source_end_ms bigint,
  layout text check (layout in ('side_by_side','top_bottom','overlay','sequence')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_short_id, remix_short_id)
);

create index if not exists short_remixes_source_idx on public.short_remixes(source_short_id, created_at desc);
create index if not exists short_remixes_creator_idx on public.short_remixes(creator_id, created_at desc);

create table if not exists public.short_immersive_sessions (
  id uuid primary key default gen_random_uuid(),
  short_id uuid not null references public.shorts(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  mode text not null check (mode in ('ar','vr','spatial')),
  scene_version text not null default '1',
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists short_immersive_sessions_short_idx on public.short_immersive_sessions(short_id, started_at desc);
create index if not exists short_immersive_sessions_user_idx on public.short_immersive_sessions(user_id, started_at desc);

alter table public.short_comment_reactions enable row level security;
alter table public.short_comment_reaction_counts enable row level security;
alter table public.short_remixes enable row level security;
alter table public.short_immersive_sessions enable row level security;

create policy "short comment reactions are readable"
  on public.short_comment_reactions for select
  using (true);
create policy "users manage own short comment reactions"
  on public.short_comment_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "short comment reaction counts are readable"
  on public.short_comment_reaction_counts for select
  using (true);

create policy "short remixes are readable"
  on public.short_remixes for select
  using (true);
create policy "creators manage own remixes"
  on public.short_remixes for all
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "users read own immersive sessions"
  on public.short_immersive_sessions for select
  using (auth.uid() = user_id);
create policy "users create own immersive sessions"
  on public.short_immersive_sessions for insert
  with check (auth.uid() = user_id);
create policy "users update own immersive sessions"
  on public.short_immersive_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_short_comment_reaction(
  p_comment_id uuid,
  p_reaction_type text
) returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_reaction_type is null or char_length(trim(p_reaction_type)) = 0 then
    delete from public.short_comment_reactions
    where comment_id = p_comment_id and user_id = auth.uid();
    return;
  end if;

  insert into public.short_comment_reactions(comment_id, user_id, reaction_type)
  values (p_comment_id, auth.uid(), trim(p_reaction_type))
  on conflict (comment_id, user_id)
  do update set reaction_type = excluded.reaction_type, updated_at = now();
end;
$$;

grant execute on function public.set_short_comment_reaction(uuid, text) to authenticated;
