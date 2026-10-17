-- Pin search_path for exact function signatures that exist at replay time.
-- Historical production schemas can contain functions introduced outside the
-- tracked clean-replay chain. Do not create overloads or fail a fresh replay
-- solely because one of those historical signatures is absent.
DO $migration$
BEGIN
  IF to_regprocedure('public.set_universal_interaction_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_universal_interaction_updated_at() SET search_path = public';
  END IF;
  IF to_regprocedure('public.touch_profile_details()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.touch_profile_details() SET search_path = public';
  END IF;
  IF to_regprocedure('public.touch_connection_request()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.touch_connection_request() SET search_path = public';
  END IF;
  IF to_regprocedure('public.search_shorts_fulltext(text,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.search_shorts_fulltext(text,integer) SET search_path = public';
  END IF;
  IF to_regprocedure('public.search_posts_fulltext(text,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.search_posts_fulltext(text,integer) SET search_path = public';
  END IF;
  IF to_regprocedure('public.treasury_assert_transaction_balanced(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.treasury_assert_transaction_balanced(uuid) SET search_path = public';
  END IF;
  IF to_regprocedure('public.touch_creator_draft()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.touch_creator_draft() SET search_path = public';
  END IF;
END
$migration$;
