-- Historical production hardening for function signatures that existed in the
-- live database when this migration was recorded. Some signatures are absent
-- from a clean replay because their original definitions came from untracked
-- production setup/history-marker migrations. Guard each exact signature so
-- the migration is safe to replay from an empty database without creating
-- replacement overloads or silently altering a different signature.
DO $migration$
BEGIN
  IF to_regprocedure('public.ensure_profile_details_for_user()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.ensure_profile_details_for_user() FROM PUBLIC, anon, authenticated';
    EXECUTE 'ALTER FUNCTION public.ensure_profile_details_for_user() SET search_path = public';
  END IF;

  IF to_regprocedure('public.sync_universal_interaction_to_short_legacy()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.sync_universal_interaction_to_short_legacy() FROM PUBLIC, anon, authenticated';
    EXECUTE 'ALTER FUNCTION public.sync_universal_interaction_to_short_legacy() SET search_path = public';
  END IF;

  IF to_regprocedure('public.treasury_ensure_user_account(text,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_ensure_user_account(text,text,text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_ensure_user_account(text,text,text) FROM anon';
    EXECUTE 'ALTER FUNCTION public.treasury_ensure_user_account(text,text,text) SET search_path = public';
  END IF;

  IF to_regprocedure('public.treasury_resolve_recipient(text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_resolve_recipient(text,text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_resolve_recipient(text,text) FROM anon';
    EXECUTE 'ALTER FUNCTION public.treasury_resolve_recipient(text,text) SET search_path = public';
  END IF;

  IF to_regprocedure('public.treasury_resolve_recipient_by_id(uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_resolve_recipient_by_id(uuid,text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_resolve_recipient_by_id(uuid,text) FROM anon';
    EXECUTE 'ALTER FUNCTION public.treasury_resolve_recipient_by_id(uuid,text) SET search_path = public';
  END IF;

  IF to_regprocedure('public.treasury_transfer_internal(uuid,uuid,bigint,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_transfer_internal(uuid,uuid,bigint,text,text) FROM PUBLIC';
    EXECUTE 'REVOKE ALL ON FUNCTION public.treasury_transfer_internal(uuid,uuid,bigint,text,text) FROM anon';
    EXECUTE 'ALTER FUNCTION public.treasury_transfer_internal(uuid,uuid,bigint,text,text) SET search_path = public';
  END IF;
END
$migration$;
