-- Harden Shorts comment reactions for production-scale correctness.
-- Keeps the existing reaction model and makes the database boundary authoritative.

alter table public.short_comment_reactions
  add constraint short_comment_reactions_type_check
  check (reaction_type in (
    'like', 'love', 'laugh', 'wow', 'celebrate', 'support',
    'curious', 'inspire', 'insightful', 'agree', 'disagree',
    'helpful', 'question', 'respect', 'fire', 'sad', 'angry'
  ));

create or replace function public.refresh_short_comment_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_comment_id uuid;
  affected_reaction_type text;
begin
  -- Reconcile the aggregate for every old/new key touched by the mutation.
  -- This deliberately recalculates from the source-of-truth reaction rows,
  -- avoiding counter drift when reactions are changed or deleted concurrently.
  if tg_op in ('DELETE', 'UPDATE') then
    delete from public.short_comment_reaction_counts c
    where c.comment_id = old.comment_id
      and c.reaction_type = old.reaction_type
      and not exists (
        select 1
        from public.short_comment_reactions r
        where r.comment_id = old.comment_id
          and r.reaction_type = old.reaction_type
      );

    insert into public.short_comment_reaction_counts(comment_id, reaction_type, reaction_count)
    select r.comment_id, r.reaction_type, count(*)
    from public.short_comment_reactions r
    where r.comment_id = old.comment_id
      and r.reaction_type = old.reaction_type
    group by r.comment_id, r.reaction_type
    on conflict (comment_id, reaction_type)
    do update set reaction_count = excluded.reaction_count;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    insert into public.short_comment_reaction_counts(comment_id, reaction_type, reaction_count)
    select r.comment_id, r.reaction_type, count(*)
    from public.short_comment_reactions r
    where r.comment_id = new.comment_id
      and r.reaction_type = new.reaction_type
    group by r.comment_id, r.reaction_type
    on conflict (comment_id, reaction_type)
    do update set reaction_count = excluded.reaction_count;
  end if;

  return coalesce(new, old);
end;
$$;

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

  if p_reaction_type is not null and p_reaction_type not in (
    'like', 'love', 'laugh', 'wow', 'celebrate', 'support',
    'curious', 'inspire', 'insightful', 'agree', 'disagree',
    'helpful', 'question', 'respect', 'fire', 'sad', 'angry'
  ) then
    raise exception 'Unsupported comment reaction type: %', p_reaction_type;
  end if;

  if p_reaction_type is null then
    delete from public.short_comment_reactions
    where comment_id = p_comment_id and user_id = auth.uid();
    return;
  end if;

  insert into public.short_comment_reactions(comment_id, user_id, reaction_type)
  values (p_comment_id, auth.uid(), p_reaction_type)
  on conflict (comment_id, user_id)
  do update set reaction_type = excluded.reaction_type, updated_at = now();
end;
$$;

revoke all on function public.set_short_comment_reaction(uuid, text) from public;
grant execute on function public.set_short_comment_reaction(uuid, text) to authenticated;
