-- Consent-gated Fresh AI feedback. Preserve the existing feedback/evaluation schema.
create table if not exists public.fresh_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  rating integer check (rating is null or rating between 1 and 5),
  correct boolean,
  comment text check (comment is null or char_length(comment) <= 4000),
  created_at timestamptz not null default now()
);

alter table public.fresh_ai_feedback
  add column if not exists feedback_kind text,
  add column if not exists correction text,
  add column if not exists training_opt_in boolean not null default false,
  add column if not exists consent_version text,
  add column if not exists authorization_id text,
  add column if not exists review_status text not null default 'not-eligible',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- Historical rows have no explicit training consent and must never enter the training queue.
update public.fresh_ai_feedback
set training_opt_in = false,
    review_status = 'not-eligible'
where consent_version is null or authorization_id is null;

alter table public.fresh_ai_feedback
  drop constraint if exists fresh_ai_feedback_kind_check,
  drop constraint if exists fresh_ai_feedback_review_status_check,
  drop constraint if exists fresh_ai_feedback_payload_check,
  add constraint fresh_ai_feedback_kind_check
    check (feedback_kind is null or feedback_kind in ('correction', 'rating')),
  add constraint fresh_ai_feedback_review_status_check
    check (review_status in ('pending', 'approved', 'rejected', 'not-eligible')),
  add constraint fresh_ai_feedback_payload_check
    check (
      feedback_kind is null
      or (feedback_kind = 'correction' and correction is not null and char_length(btrim(correction)) > 0 and char_length(correction) <= 8000)
      or (feedback_kind = 'rating' and rating is not null and rating between 1 and 5)
    );

create index if not exists fresh_ai_feedback_review_queue_idx
  on public.fresh_ai_feedback (review_status, created_at)
  where training_opt_in = true;

create index if not exists fresh_ai_feedback_owner_idx
  on public.fresh_ai_feedback (user_id, created_at desc);

alter table public.fresh_ai_feedback enable row level security;
alter table public.fresh_ai_feedback force row level security;

drop policy if exists "Users submit their own opted-in Fresh AI feedback" on public.fresh_ai_feedback;
drop policy if exists fresh_ai_feedback_insert_own on public.fresh_ai_feedback;
create policy fresh_ai_feedback_insert_own
  on public.fresh_ai_feedback for insert to authenticated
  with check (
    auth.uid() = user_id
    and training_opt_in = true
    and consent_version = 'fresh-ai-feedback-consent-v1'
    and authorization_id is not null
    and review_status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Users read their own Fresh AI feedback" on public.fresh_ai_feedback;
drop policy if exists fresh_ai_feedback_select_own on public.fresh_ai_feedback;
create policy fresh_ai_feedback_select_own
  on public.fresh_ai_feedback for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.fresh_ai_feedback from anon, public;
grant select, insert on public.fresh_ai_feedback to authenticated;
