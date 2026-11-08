-- Fresh Autonomous Learning Core (FALC) v1.
-- Events store private object references + hashes, never raw conversation/media payloads.
-- Client writes require explicit capture consent. Training eligibility starts false and
-- cannot be self-approved by a client. Autonomous objectives are worker-managed.

create table if not exists public.fresh_ai_learning_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  modality text not null check (modality in ('text','speech','image','video','document','demonstration','evaluation','synthetic-practice')),
  source_kind text not null check (source_kind in ('authorized-conversation','authorized-speech','authorized-upload','user-correction','approved-research','self-practice','evaluation-result')),
  payload_reference text not null check (char_length(payload_reference) between 1 and 512 and payload_reference !~* '^https?://'),
  content_sha256 text not null check (content_sha256 ~ '^[a-fA-F0-9]{64}$'),
  summary text not null check (char_length(btrim(summary)) between 1 and 240),
  provenance jsonb not null default '{}'::jsonb,
  capture_allowed boolean not null default false,
  memory_opt_in boolean not null default false,
  training_opt_in boolean not null default false,
  consent_version text,
  consent_granted_at timestamptz,
  consent_expires_at timestamptz,
  consent_revoked_at timestamptz,
  review_status text not null default 'not-eligible' check (review_status in ('not-eligible','pending','approved','rejected')),
  training_eligible boolean not null default false,
  captured_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key),
  constraint fresh_ai_learning_event_capture_consent_check check (
    capture_allowed = false or (
      consent_version = 'fresh-autonomous-learning-v1'
      and consent_granted_at is not null
    )
  ),
  constraint fresh_ai_learning_event_training_gate_check check (
    training_eligible = false
    and (training_opt_in = false or review_status in ('pending','approved','rejected'))
  )
);

create index if not exists fresh_ai_learning_events_owner_recent_idx
  on public.fresh_ai_learning_events (user_id, created_at desc);
create index if not exists fresh_ai_learning_events_review_queue_idx
  on public.fresh_ai_learning_events (review_status, created_at)
  where training_opt_in = true and training_eligible = false;

alter table public.fresh_ai_learning_events enable row level security;
alter table public.fresh_ai_learning_events force row level security;

drop policy if exists fresh_ai_learning_events_select_own on public.fresh_ai_learning_events;
create policy fresh_ai_learning_events_select_own
  on public.fresh_ai_learning_events for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists fresh_ai_learning_events_insert_own on public.fresh_ai_learning_events;
create policy fresh_ai_learning_events_insert_own
  on public.fresh_ai_learning_events for insert to authenticated
  with check (
    auth.uid() = user_id
    and capture_allowed = true
    and consent_version = 'fresh-autonomous-learning-v1'
    and consent_granted_at is not null
    and training_eligible = false
    and review_status = case when training_opt_in then 'pending' else 'not-eligible' end
  );

drop policy if exists fresh_ai_learning_events_delete_own on public.fresh_ai_learning_events;
create policy fresh_ai_learning_events_delete_own
  on public.fresh_ai_learning_events for delete to authenticated
  using (auth.uid() = user_id);

revoke all on public.fresh_ai_learning_events from anon, public;
grant select, insert, delete on public.fresh_ai_learning_events to authenticated;

-- Objectives are created/claimed/completed by a trusted server-side worker only.
create table if not exists public.fresh_ai_learning_objectives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  skill text not null check (char_length(btrim(skill)) between 1 and 80),
  source_event_ids uuid[] not null default '{}',
  due_at timestamptz not null default now(),
  status text not null default 'queued' check (status in ('queued','running','evaluating','completed','blocked','failed')),
  attempts integer not null default 0 check (attempts between 0 and 20),
  result_reference text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fresh_ai_learning_objectives_due_idx
  on public.fresh_ai_learning_objectives (status, due_at)
  where status = 'queued';

alter table public.fresh_ai_learning_objectives enable row level security;
alter table public.fresh_ai_learning_objectives force row level security;

drop policy if exists fresh_ai_learning_objectives_select_own on public.fresh_ai_learning_objectives;
create policy fresh_ai_learning_objectives_select_own
  on public.fresh_ai_learning_objectives for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.fresh_ai_learning_objectives from anon, public, authenticated;
grant select on public.fresh_ai_learning_objectives to authenticated;

comment on table public.fresh_ai_learning_events is
  'FALC v1: consent-gated learning event metadata. Raw conversation/media content must remain in separately permissioned private storage.';
comment on table public.fresh_ai_learning_objectives is
  'FALC v1: autonomous practice objectives; writes and state transitions are worker-only.';
