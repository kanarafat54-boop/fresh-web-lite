-- Owner-approved learning loop. Users can share a correction (with explicit consent) from the
-- thumbs-down button; it lands in fresh_ai_preference_pairs with safety_checked = false.
-- Approving a correction turns it into searchable Fresh AI knowledge. Apply only after schema review.
create or replace function public.approve_fresh_ai_correction(p_pair_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pair record;
  v_id uuid;
begin
  select * into v_pair from public.fresh_ai_preference_pairs where id = p_pair_id for update;
  if not found then
    raise exception 'Correction % was not found', p_pair_id using errcode = 'P0002';
  end if;
  if coalesce(v_pair.safety_checked, false) then
    raise exception 'Correction % was already approved', p_pair_id using errcode = '23505';
  end if;

  insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
  values (null, 'fresh-web-lite-platform', left(btrim(v_pair.prompt), 200), btrim(v_pair.preferred_output), 'text',
          'owner-approved-user-correction', jsonb_build_object('kind', 'user-correction', 'pair_id', v_pair.id),
          'PROBABLE', 0.8, jsonb_build_object('dataset', 'approved-corrections-v1'))
  returning id into v_id;

  update public.fresh_ai_preference_pairs set safety_checked = true, reward_signal = coalesce(reward_signal, 1) where id = p_pair_id;
  return v_id;
end;
$$;
revoke all on function public.approve_fresh_ai_correction(uuid) from public, anon, authenticated;
grant execute on function public.approve_fresh_ai_correction(uuid) to service_role;
