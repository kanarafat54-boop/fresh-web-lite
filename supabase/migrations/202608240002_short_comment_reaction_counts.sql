create or replace function public.refresh_short_comment_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.short_comment_reaction_counts
    where comment_id = old.comment_id and reaction_type = old.reaction_type;
  else
    insert into public.short_comment_reaction_counts(comment_id, reaction_type, reaction_count)
    select comment_id, reaction_type, count(*)
    from public.short_comment_reactions
    where comment_id = new.comment_id and reaction_type = new.reaction_type
    group by comment_id, reaction_type
    on conflict (comment_id, reaction_type)
    do update set reaction_count = excluded.reaction_count;
  end if;

  if tg_op = 'UPDATE' and (old.comment_id <> new.comment_id or old.reaction_type <> new.reaction_type) then
    delete from public.short_comment_reaction_counts
    where comment_id = old.comment_id and reaction_type = old.reaction_type;
    insert into public.short_comment_reaction_counts(comment_id, reaction_type, reaction_count)
    select comment_id, reaction_type, count(*)
    from public.short_comment_reactions
    where comment_id = new.comment_id and reaction_type = new.reaction_type
    group by comment_id, reaction_type
    on conflict (comment_id, reaction_type)
    do update set reaction_count = excluded.reaction_count;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_short_comment_reaction_counts on public.short_comment_reactions;
create trigger trg_short_comment_reaction_counts
after insert or update or delete on public.short_comment_reactions
for each row execute function public.refresh_short_comment_reaction_counts();
