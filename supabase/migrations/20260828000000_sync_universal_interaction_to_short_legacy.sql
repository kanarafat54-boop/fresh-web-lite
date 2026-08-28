-- Mirrors react/repost/save writes on universal_interactions (for target_type
-- = 'short') back into the legacy short_likes/short_reposts/saved_shorts
-- tables. This lets Shorts adopt the canonical Universal Interaction Service
-- as its single write path while the existing count triggers
-- (on_short_like_change, on_short_repost_change) and views
-- (short_reaction_breakdown, short_recent_activity) keep working unchanged,
-- since they still read from the legacy tables directly.
--
-- 'follow' is intentionally NOT mirrored here: follows are a cross-cutting
-- user relationship used elsewhere in the app (profile pages, etc.), not a
-- Shorts-specific interaction, and stay on the legacy `follows` table only.
--
-- Already applied directly to the live database via Supabase MCP; this file
-- exists so the trigger is tracked in git like everything else, since the
-- original shorts/short_likes/short_reposts/saved_shorts schema was not.

create or replace function public.sync_universal_interaction_to_short_legacy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger if exists universal_interactions_sync_short_legacy on public.universal_interactions;
create trigger universal_interactions_sync_short_legacy
after insert or update or delete on public.universal_interactions
for each row execute function public.sync_universal_interaction_to_short_legacy();
