-- Owner-reviewed learning loop, v2. Additive: nothing is deleted or dropped.
-- Apply only after schema review.
--
-- What changes
--  * Every correction gets a review state (pending / approved / rejected) plus who reviewed it, when,
--    why, and which knowledge row it produced. Rejecting keeps the evidence instead of deleting it.
--  * The owner can edit the wording before approving (for example to remove personal details). The
--    original text is kept in submitted_output; preferred_output holds what was actually approved, so
--    training never sees text the owner removed.
--  * Approving a question that was already approved before updates that knowledge row instead of
--    creating a duplicate.
--  * Secret-shaped and card-like values cannot become shared knowledge, even through the SQL editor.
--  * approve_fresh_ai_correction(uuid) keeps working exactly as documented; it now calls the new
--    function so there is a single code path.
--
-- Keep the secret patterns in sync with src/core/fresh-ai/FreshAICorrectionScreening.ts.

-- The table exists in production but no earlier migration creates it (see supabase/baseline). This
-- definition mirrors production exactly, so it does nothing there and lets a clean replay work.
create table if not exists public.fresh_ai_preference_pairs (
  id uuid default gen_random_uuid() not null,
  user_id uuid references auth.users(id) on delete set null,
  request_id uuid,
  prompt text not null,
  preferred_output text not null,
  rejected_output text not null,
  rationale text,
  label text default 'better'::text not null,
  safety_checked boolean default false not null,
  reward_signal numeric(6,4),
  created_at timestamp with time zone default now() not null,
  constraint fresh_ai_preference_pairs_label_check check ((label = any (array['better'::text, 'worse'::text, 'tie'::text]))),
  constraint fresh_ai_preference_pairs_pkey primary key (id)
);
alter table public.fresh_ai_preference_pairs enable row level security;

alter table public.fresh_ai_preference_pairs
  add column if not exists review_status text not null default 'pending',
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text,
  add column if not exists knowledge_id uuid,
  add column if not exists submitted_output text;

do $$
begin
  alter table public.fresh_ai_preference_pairs
    add constraint fresh_ai_preference_pairs_review_status_check
    check (review_status in ('pending', 'approved', 'rejected'));
exception when duplicate_object then null;
end $$;

-- Rows approved under the old function (safety_checked = true) are approved.
update public.fresh_ai_preference_pairs
set review_status = 'approved'
where coalesce(safety_checked, false) and review_status = 'pending';

create index if not exists fresh_ai_preference_pairs_review_idx
  on public.fresh_ai_preference_pairs (review_status, created_at);

-- Keeps the consent ledger (fresh_ai_feedback) in step with the review decision on the preference pair.
create or replace function public.sync_fresh_ai_feedback_review(p_request_id text, p_user_id uuid, p_status text, p_reviewer uuid)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if to_regclass('public.fresh_ai_feedback') is null or p_request_id is null then
    return;
  end if;
  update public.fresh_ai_feedback
  set review_status = p_status, reviewed_at = now(), reviewed_by = p_reviewer
  where request_id::text = p_request_id
    and user_id is not distinct from p_user_id
    and feedback_kind = 'correction'
    and review_status = 'pending';
end;
$$;

revoke all on function public.sync_fresh_ai_feedback_review(text, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.sync_fresh_ai_feedback_review(text, uuid, text, uuid) to service_role;

create or replace function public.review_fresh_ai_correction(
  p_pair_id uuid,
  p_decision text,
  p_reviewer uuid default null,
  p_note text default null,
  p_final_text text default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pair record;
  v_text text;
  v_title text;
  v_note text := left(btrim(coalesce(p_note, '')), 500);
  v_id uuid;
begin
  if p_decision is null or p_decision not in ('approve', 'reject') then
    raise exception 'Decision must be approve or reject' using errcode = '22023';
  end if;

  select * into v_pair from public.fresh_ai_preference_pairs where id = p_pair_id for update;
  if not found then
    raise exception 'Correction % was not found', p_pair_id using errcode = 'P0002';
  end if;
  if v_pair.review_status <> 'pending' or coalesce(v_pair.safety_checked, false) then
    raise exception 'Correction % was already reviewed (%)', p_pair_id, v_pair.review_status using errcode = '23505';
  end if;

  if p_decision = 'reject' then
    update public.fresh_ai_preference_pairs
    set review_status = 'rejected', reviewed_at = now(), reviewed_by = p_reviewer, review_note = nullif(v_note, '')
    where id = p_pair_id;
    perform public.sync_fresh_ai_feedback_review(v_pair.request_id::text, v_pair.user_id, 'rejected', p_reviewer);
    return null;
  end if;

  v_text := btrim(coalesce(nullif(btrim(p_final_text), ''), v_pair.preferred_output));
  v_title := left(btrim(v_pair.prompt), 200);

  if length(v_text) < 10 or length(v_text) > 2000 then
    raise exception 'Correction text must be between 10 and 2000 characters' using errcode = '22023';
  end if;

  -- The title and text are shown to every user once approved: refuse credentials and card-like numbers.
  if (v_title || E'\n' || v_text) ~ 'eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}'
     or (v_title || E'\n' || v_text) ~ '(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}'
     or (v_title || E'\n' || v_text) ~ 'gh[pousr]_[A-Za-z0-9]{20,}'
     or (v_title || E'\n' || v_text) ~ 'AKIA[0-9A-Z]{16}'
     or (v_title || E'\n' || v_text) ~ '-----BEGIN [A-Z ]*PRIVATE KEY-----'
     or (v_title || E'\n' || v_text) ~* '(postgres(ql)?|mysql|mongodb)://[^[:space:]]+:[^[:space:]@]+@'
     or (v_title || E'\n' || v_text) ~ '(^|[^0-9])([0-9][ -]?){12,18}[0-9]([^0-9]|$)'
  then
    raise exception 'Correction contains a secret-shaped or card-like value and cannot become shared knowledge'
      using errcode = '22023';
  end if;

  select k.id into v_id
  from public.fresh_ai_knowledge k
  where k.project_id = 'fresh-web-lite-platform'
    and k.user_id is null
    and k.title = v_title
    and k.metadata ->> 'dataset' = 'approved-corrections-v1'
  order by k.created_at
  limit 1
  for update;

  if v_id is not null then
    update public.fresh_ai_knowledge
    set content = v_text,
        source = 'owner-approved-user-correction',
        provenance = jsonb_build_object('kind', 'user-correction', 'pair_id', v_pair.id),
        updated_at = now()
    where id = v_id;
  else
    insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
    values (null, 'fresh-web-lite-platform', v_title, v_text, 'text', 'owner-approved-user-correction',
            jsonb_build_object('kind', 'user-correction', 'pair_id', v_pair.id),
            'PROBABLE', 0.8, jsonb_build_object('dataset', 'approved-corrections-v1'))
    returning id into v_id;
  end if;

  update public.fresh_ai_preference_pairs
  set review_status = 'approved',
      safety_checked = true,
      reward_signal = coalesce(reward_signal, 1),
      reviewed_at = now(),
      reviewed_by = p_reviewer,
      review_note = nullif(v_note, ''),
      knowledge_id = v_id,
      submitted_output = case when v_text is distinct from v_pair.preferred_output then v_pair.preferred_output else submitted_output end,
      preferred_output = v_text
  where id = p_pair_id;

  perform public.sync_fresh_ai_feedback_review(v_pair.request_id::text, v_pair.user_id, 'approved', p_reviewer);
  return v_id;
end;
$$;

-- Same signature and behavior as before for the documented SQL-editor workflow.
create or replace function public.approve_fresh_ai_correction(p_pair_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
begin
  return public.review_fresh_ai_correction(p_pair_id, 'approve', null, 'approved via SQL editor', null);
end;
$$;

revoke all on function public.review_fresh_ai_correction(uuid, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_fresh_ai_correction(uuid, text, uuid, text, text) to service_role;
revoke all on function public.approve_fresh_ai_correction(uuid) from public, anon, authenticated;
grant execute on function public.approve_fresh_ai_correction(uuid) to service_role;

notify pgrst, 'reload schema';
