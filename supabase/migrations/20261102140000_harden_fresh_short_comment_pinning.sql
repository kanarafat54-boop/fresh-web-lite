-- Harden Fresh Shorts pinning against concurrent creator actions.
-- Additive and safe to apply after 20261102120000_fresh_short_collections_and_comment_pin.sql.

create unique index if not exists short_comments_one_pin_per_short_idx
  on public.short_comments (short_id)
  where pinned_at is not null;

create or replace function public.pin_short_comment(p_comment_id uuid, p_pinned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_short uuid;
  v_parent uuid;
  v_author uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to pin comments' using errcode = '28000';
  end if;

  select c.short_id, c.parent_id
    into v_short, v_parent
    from public.short_comments c
    where c.id = p_comment_id;

  if v_short is null then
    raise exception 'Comment not found' using errcode = 'P0002';
  end if;
  if v_parent is not null then
    raise exception 'Only top-level comments can be pinned' using errcode = '22023';
  end if;

  -- Serialize pin changes for this Short before clearing/replacing its pinned comment.
  select s.author_id into v_author
    from public.shorts s
    where s.id = v_short
    for update;

  if v_author is distinct from auth.uid() then
    raise exception 'Only the creator of this Short can pin comments' using errcode = '42501';
  end if;

  if p_pinned then
    update public.short_comments
      set pinned_at = null
      where short_id = v_short and pinned_at is not null;
    update public.short_comments
      set pinned_at = now()
      where id = p_comment_id and short_id = v_short;
  else
    update public.short_comments
      set pinned_at = null
      where id = p_comment_id and short_id = v_short;
  end if;
end;
$$;

revoke all on function public.pin_short_comment(uuid, boolean) from public, anon;
grant execute on function public.pin_short_comment(uuid, boolean) to authenticated;
