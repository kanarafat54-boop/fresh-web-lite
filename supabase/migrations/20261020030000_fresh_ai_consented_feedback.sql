-- Fresh AI feedback is private user-owned data. It is never training data by default.
create table if not exists public.fresh_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id text not null check (char_length(request_id) between 1 and 120),
  feedback_kind text not null check (feedback_kind in ('correction', 'rating')),
  rating smallint check (rating is null or rating in (-1, 1)),
  correction text check (correction is null or char_length(correction) <= 8000),
  training_opt_in boolean not null default false check (training_opt_in = true),
  consent_version text not null check (char_length(consent_version) between 1 and 80),
  authorization_id text not null check (char_length(authorization_id) between 8 and 120),
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  constraint fresh_ai_feedback_payload_check check (
    (feedback_kind = 'correction' and correction is not null and char_length(btrim(correction)) > 0)
    or (feedback_kind = 'rating' and rating is not null)
  )
);

create index if not exists fresh_ai_feedback_review_queue_idx
  on public.fresh_ai_feedback (review_status, created_at);

create index if not exists fresh_ai_feedback_owner_idx
  on public.fresh_ai_feedback (user_id, created_at desc);

alter table public.fresh_ai_feedback enable row level security;
alter table public.fresh_ai_feedback force row level security;

drop policy if exists "Users submit their own opted-in Fresh AI feedback" on public.fresh_ai_feedback;
create policy "Users submit their own opted-in Fresh AI feedback"
  on public.fresh_ai_feedback for insert to authenticated
  with check (
    auth.uid() = user_id
    and training_opt_in = true
    and review_status = 'pending'
    and reviewed_at is null
    and reviewed_by is null
  );

drop policy if exists "Users read their own Fresh AI feedback" on public.fresh_ai_feedback;
create policy "Users read their own Fresh AI feedback"
  on public.fresh_ai_feedback for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.fresh_ai_feedback from anon, public;
grant select, insert on public.fresh_ai_feedback to authenticated;
