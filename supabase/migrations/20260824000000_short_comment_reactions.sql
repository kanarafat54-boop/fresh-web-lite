-- Scalable, polymorphic comment reactions for Posts + Shorts.
-- Extends the existing comment system without replacing it.

create table if not exists public.comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null,
  target_type text not null check (target_type in ('post', 'short')),
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in (
    'like','dislike','love','laugh','wow','celebrate','support','curious',
    'inspire','insightful','agree','disagree','helpful','question','respect',
    'fire','sad','angry'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (comment_id, target_type, user_id)
);

create index if not exists comment_reactions_lookup_idx
  on public.comment_reactions(comment_id, target_type);
create index if not exists comment_reactions_type_idx
  on public.comment_reactions(comment_id, target_type, reaction_type);

alter table public.comment_reactions enable row level security;

drop policy if exists "comment reactions are readable" on public.comment_reactions;
create policy "comment reactions are readable"
  on public.comment_reactions for select
  using (true);

drop policy if exists "users manage their own comment reactions" on public.comment_reactions;
create policy "users manage their own comment reactions"
  on public.comment_reactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_comment_reaction(
  p_comment_id uuid,
  p_target_type text,
  p_reaction_type text
)
returns public.comment_reactions
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.comment_reactions;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_target_type not in ('post', 'short') then
    raise exception 'Invalid comment target type';
  end if;

  if p_reaction_type not in (
    'like','dislike','love','laugh','wow','celebrate','support','curious',
    'inspire','insightful','agree','disagree','helpful','question','respect',
    'fire','sad','angry'
  ) then
    raise exception 'Invalid reaction type';
  end if;

  insert into public.comment_reactions (comment_id, target_type, user_id, reaction_type)
  values (p_comment_id, p_target_type, auth.uid(), p_reaction_type)
  on conflict (comment_id, target_type, user_id)
  do update set reaction_type = excluded.reaction_type, updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.remove_comment_reaction(
  p_comment_id uuid,
  p_target_type text
)
returns void
language sql
security invoker
set search_path = public
as $$
  delete from public.comment_reactions
  where comment_id = p_comment_id
    and target_type = p_target_type
    and user_id = auth.uid();
$$;

create or replace function public.get_comment_reaction_summary(
  p_comment_id uuid,
  p_target_type text
)
returns table(reaction_type text, reaction_count bigint, reacted_by_me boolean)
language sql
security invoker
set search_path = public
as $$
  with counts as (
    select cr.reaction_type, count(*)::bigint as reaction_count
    from public.comment_reactions cr
    where cr.comment_id = p_comment_id
      and cr.target_type = p_target_type
    group by cr.reaction_type
  )
  select counts.reaction_type,
         counts.reaction_count,
         exists (
           select 1 from public.comment_reactions mine
           where mine.comment_id = p_comment_id
             and mine.target_type = p_target_type
             and mine.user_id = auth.uid()
             and mine.reaction_type = counts.reaction_type
         ) as reacted_by_me
  from counts
  order by counts.reaction_count desc, counts.reaction_type;
$$;
