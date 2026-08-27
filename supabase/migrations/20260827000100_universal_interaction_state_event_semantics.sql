-- Refine universal interaction persistence into stateful and event interactions.
-- Reactions/votes/saves/follows are actor-target state; comments/shares/etc. are events.
-- This preserves the existing table while removing the global uniqueness constraint
-- that would incorrectly prevent multiple comments or shares by the same actor.

drop index if exists public.universal_interactions_actor_target_action_uidx;

create unique index if not exists universal_interactions_actor_target_reaction_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'react';

create unique index if not exists universal_interactions_actor_target_vote_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'vote';

create unique index if not exists universal_interactions_actor_target_save_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'save';

create unique index if not exists universal_interactions_actor_target_follow_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'follow';

create unique index if not exists universal_interactions_actor_target_repost_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'repost';

create unique index if not exists universal_interactions_actor_target_quote_uidx
  on public.universal_interactions(actor_id, target_type, target_id)
  where interaction_type = 'quote';
