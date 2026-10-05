-- Restore event-safe universal interaction persistence.
-- Stateful interactions use the generated state_key unique index; repeatable
-- events such as comments and shares must remain insertable.
alter table public.universal_interactions
  drop constraint if exists universal_interactions_actor_target_type_key;

create unique index if not exists universal_interactions_state_uidx
  on public.universal_interactions(actor_id, target_type, target_id, state_key)
  where state_key is not null;
