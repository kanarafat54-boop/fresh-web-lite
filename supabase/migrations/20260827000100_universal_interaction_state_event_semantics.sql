-- Refine universal interaction persistence into stateful and event interactions.
-- Reactions/votes/saves/follows/reposts/quotes are actor-target state; comments,
-- shares, remixes, duets and collaborations remain repeatable events.

-- Remove the original global uniqueness rule, which incorrectly prevented
-- multiple event interactions such as comments and shares.
drop index if exists public.universal_interactions_actor_target_action_uidx;
drop index if exists public.universal_interactions_actor_target_reaction_uidx;
drop index if exists public.universal_interactions_actor_target_vote_uidx;
drop index if exists public.universal_interactions_actor_target_save_uidx;
drop index if exists public.universal_interactions_actor_target_follow_uidx;
drop index if exists public.universal_interactions_actor_target_repost_uidx;
drop index if exists public.universal_interactions_actor_target_quote_uidx;

-- A nullable state key lets PostgreSQL enforce one current state per actor/target
-- while leaving event rows unconstrained. It also gives the client a stable
-- ON CONFLICT target for atomic upserts.
alter table public.universal_interactions
drop column if exists state_key;

alter table public.universal_interactions
add column state_key text generated always as (
  case
    when interaction_type in ('react','vote','save','follow','repost','quote')
      then interaction_type
    else null
  end
) stored;

create unique index if not exists universal_interactions_state_uidx
  on public.universal_interactions(actor_id, target_type, target_id, state_key)
  where state_key is not null;

create index if not exists universal_interactions_event_idx
  on public.universal_interactions(target_type, target_id, interaction_type, created_at desc)
  where state_key is null;
