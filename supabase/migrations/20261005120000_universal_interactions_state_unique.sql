-- Keep toggleable universal interactions idempotent for reaction/save/follow/repost state.
alter table public.universal_interactions
  add constraint universal_interactions_actor_target_type_key
  unique (actor_id, target_type, target_id, interaction_type);
