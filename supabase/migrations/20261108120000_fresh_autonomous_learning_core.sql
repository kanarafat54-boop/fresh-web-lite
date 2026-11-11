-- FALC milestone 1. Persist metadata only; raw conversational/media payloads are prohibited.
-- Learning-capture authorization and model-training consent are independent controls.
create table if not exists public.fresh_ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique check (char_length(event_id) between 1 and 128),
  user_id uuid references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('conversation_observation','speech_observation','perception_observation','research_observation','user_correction','evaluation_failure','practice_result')),
  source_type text not null check (source_type in ('authorized_conversation','authorized_speech','authorized_media','approved_research','evaluation','autonomous_practice')),
  objective text not null check (char_length(btrim(objective)) between 1 and 240),
  confidence numeric(4,3) not null check (confidence between 0 and 1),
  metadata jsonb not null default '{}'::jsonb
    check (octet_length(metadata::text) <= 8192)
    check (metadata - array['language','modality','durationSeconds','category','domain','taskType','sourceLabel','confidenceBand','referenceId','tagCount'] = '{}'::jsonb),
  provenance jsonb not null default '{}'::jsonb,
  capture_authorized boolean not null default false check (capture_authorized = true),
  training_opt_in boolean not null default false,
  consent_version text,
  authorization_id text,
  review_status text not null default 'pending' check (review_status in ('pending','approved','rejected')),
  training_eligible boolean not null default false,
  created_at timestamptz not null default now(),
  constraint fresh_ai_learning_training_gate check (
    not training_eligible or (
      training_opt_in = true and consent_version = 'fresh-ai-feedback-consent-v1'
      and authorization_id is not null and char_length(btrim(authorization_id)) > 0
      and review_status = 'approved' and coalesce((provenance->>'verified')::boolean, false) = true
    )
  )
);
create index if not exists fresh_ai_learning_events_user_created_idx on public.fresh_ai_learning_events(user_id, created_at desc);
create index if not exists fresh_ai_learning_events_training_queue_idx on public.fresh_ai_learning_events(review_status, created_at) where training_eligible = true;
alter table public.fresh_ai_learning_events enable row level security;
alter table public.fresh_ai_learning_events force row level security;
drop policy if exists fresh_ai_learning_events_select_own on public.fresh_ai_learning_events;
create policy fresh_ai_learning_events_select_own on public.fresh_ai_learning_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists fresh_ai_learning_events_insert_own on public.fresh_ai_learning_events;
create policy fresh_ai_learning_events_insert_own on public.fresh_ai_learning_events for insert to authenticated
with check (auth.uid() = user_id and capture_authorized = true and training_eligible = false and review_status = 'pending');
revoke all on public.fresh_ai_learning_events from anon, public;
grant select, insert on public.fresh_ai_learning_events to authenticated;

create table if not exists public.fresh_ai_learning_objectives (
  id uuid primary key default gen_random_uuid(),
  objective_id text not null unique check (char_length(objective_id) between 1 and 128),
  owner_id uuid references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text not null check (char_length(btrim(description)) between 1 and 1000),
  domain text not null check (char_length(btrim(domain)) between 1 and 80),
  source text not null default 'user_requested' check (source in ('autonomous','user_requested')),
  status text not null default 'queued' check (status in ('queued','running','blocked','completed','failed')),
  priority smallint not null default 5 check (priority between 0 and 10),
  max_attempts smallint not null default 3 check (max_attempts between 1 and 5),
  attempts smallint not null default 0 check (attempts between 0 and max_attempts),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fresh_ai_learning_objectives_queue_idx on public.fresh_ai_learning_objectives(status, priority desc, created_at asc);
alter table public.fresh_ai_learning_objectives enable row level security;
alter table public.fresh_ai_learning_objectives force row level security;
drop policy if exists fresh_ai_learning_objectives_select_own on public.fresh_ai_learning_objectives;
create policy fresh_ai_learning_objectives_select_own on public.fresh_ai_learning_objectives for select to authenticated using (auth.uid() = owner_id);
drop policy if exists fresh_ai_learning_objectives_insert_own on public.fresh_ai_learning_objectives;
create policy fresh_ai_learning_objectives_insert_own on public.fresh_ai_learning_objectives for insert to authenticated
with check (auth.uid() = owner_id and source = 'user_requested' and status = 'queued' and attempts = 0);
revoke all on public.fresh_ai_learning_objectives from anon, public;
grant select, insert on public.fresh_ai_learning_objectives to authenticated;
comment on table public.fresh_ai_learning_events is 'FALC metadata-only experience ledger. Training eligibility requires separate explicit consent, verified provenance and human review.';
comment on table public.fresh_ai_learning_objectives is 'FALC bounded objective queue. Autonomous execution requires a trusted server-side scheduler and service-role adapter.';
