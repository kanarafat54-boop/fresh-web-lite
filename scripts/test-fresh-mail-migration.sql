-- Runs only against a disposable PostgreSQL service in CI, never production Supabase.
DO $$
DECLARE
  v_owner_id uuid := gen_random_uuid();
  v_other_owner_id uuid := gen_random_uuid();
  address_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('fresh_mail_addresses'),
      ('fresh_mail_messages'),
      ('fresh_mail_webhook_events')
    ) AS t(table_name)
    WHERE NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t.table_name
        AND c.relrowsecurity
    )
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled on every private Fresh Mail table';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('fresh_mail_addresses'),
      ('fresh_mail_messages'),
      ('fresh_mail_webhook_events')
    ) AS t(table_name)
    WHERE has_table_privilege('anon', format('public.%I', table_name), 'SELECT')
       OR has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'INSERT')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'UPDATE')
       OR has_table_privilege('authenticated', format('public.%I', table_name), 'DELETE')
  ) THEN
    RAISE EXCEPTION 'A browser role has direct access to a private Fresh Mail table';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.fresh_mail_messages', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.fresh_mail_messages', 'INSERT') THEN
    RAISE EXCEPTION 'service_role is missing expected server access';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'fresh_mail_addresses_one_active_per_owner_uq'
  ) THEN
    RAISE EXCEPTION 'One-active-mailbox-per-owner index is missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'fresh_mail_messages_owner_idempotency_uq'
  ) THEN
    RAISE EXCEPTION 'Outbound idempotency index is missing';
  END IF;

  INSERT INTO auth.users (id) VALUES (v_owner_id), (v_other_owner_id);

  INSERT INTO public.fresh_mail_addresses (owner_id, email_address, status)
  VALUES (v_owner_id, 'test-owner@fresh-mail.invalid', 'active');

  -- A second active address for the same account must fail.
  BEGIN
    INSERT INTO public.fresh_mail_addresses (owner_id, email_address, status)
    VALUES (v_owner_id, 'test-owner-2@fresh-mail.invalid', 'active');
    RAISE EXCEPTION 'Duplicate active mailbox unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  -- The same idempotency key may be used by different accounts, but not twice by one account.
  INSERT INTO public.fresh_mail_messages
    (owner_id, idempotency_key, direction, from_address, status)
  VALUES
    (v_owner_id, 'outbound:test-key-1', 'outbound', 'test-owner@fresh-mail.invalid', 'queued');

  BEGIN
    INSERT INTO public.fresh_mail_messages
      (owner_id, idempotency_key, direction, from_address, status)
    VALUES
      (v_owner_id, 'outbound:test-key-1', 'outbound', 'test-owner@fresh-mail.invalid', 'queued');
    RAISE EXCEPTION 'Duplicate idempotency key unexpectedly succeeded';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;

  INSERT INTO public.fresh_mail_messages
    (owner_id, idempotency_key, direction, from_address, status)
  VALUES
    (v_other_owner_id, 'outbound:test-key-1', 'outbound', 'other@fresh-mail.invalid', 'queued');

  RAISE NOTICE 'Fresh Mail migration integration checks passed';
END $$;
