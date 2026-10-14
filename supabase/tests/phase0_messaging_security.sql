-- pgTAP catalog assertions for Phase 0 access hardening.
-- Run after applying the Phase 0 messaging migrations with: supabase test db

begin;
select plan(34);

select ok((select relrowsecurity from pg_class where oid = 'public.direct_messages'::regclass),
  'RLS is enabled on direct messages');
select ok((select relrowsecurity from pg_class where oid = 'public.connection_requests'::regclass),
  'RLS is enabled on connection requests');
select ok((select relrowsecurity from pg_class where oid = 'public.fresh_communication_threads'::regclass),
  'RLS is enabled on Fresh Communication threads');
select ok((select relrowsecurity from pg_class where oid = 'public.fresh_communication_messages'::regclass),
  'RLS is enabled on Fresh Communication messages');
select ok((select relrowsecurity from pg_class where oid = 'public.ecosystem_profiles'::regclass),
  'RLS is enabled on ecosystem profiles');

select ok(not has_table_privilege('anon', 'public.direct_messages', 'SELECT'),
  'anon cannot read direct messages');
select ok(not has_table_privilege('anon', 'public.direct_messages', 'INSERT'),
  'anon cannot insert direct messages');
select ok(has_table_privilege('authenticated', 'public.direct_messages', 'SELECT'),
  'authenticated can read only policy-authorized direct messages');
select ok(has_column_privilege('authenticated', 'public.direct_messages', 'sender_id', 'INSERT'),
  'authenticated can set direct-message sender column');
select ok(not has_table_privilege('authenticated', 'public.direct_messages', 'DELETE'),
  'authenticated cannot delete direct messages');
select ok(not has_table_privilege('anon', 'public.fresh_communication_threads', 'SELECT'),
  'anon cannot read Fresh Communication threads');
select ok(not has_table_privilege('anon', 'public.fresh_communication_messages', 'INSERT'),
  'anon cannot insert Fresh Communication messages');
select ok(not has_table_privilege('authenticated', 'public.fresh_communication_messages', 'DELETE'),
  'authenticated cannot delete Fresh Communication messages');
select ok(has_table_privilege('authenticated', 'public.fresh_communication_threads', 'SELECT'),
  'authenticated can select threads subject to owner policy');
select ok(has_table_privilege('authenticated', 'public.fresh_communication_messages', 'SELECT'),
  'authenticated can select messages subject to owner policy');
select ok(not has_table_privilege('anon', 'public.connection_requests', 'SELECT'),
  'anon cannot read connection requests');
select ok(has_table_privilege('authenticated', 'public.connection_requests', 'SELECT'),
  'authenticated can read own connection requests');
select ok(not has_table_privilege('authenticated', 'public.connection_requests', 'UPDATE'),
  'connection requests do not expose table-wide update');
select ok(has_column_privilege('authenticated', 'public.connection_requests', 'status', 'UPDATE'),
  'authenticated can transition only the status column');
select ok(not has_column_privilege('authenticated', 'public.connection_requests', 'requester_id', 'UPDATE'),
  'authenticated cannot rewrite requester identity');
select ok(exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'connection_requests'
    and policyname = 'connection requests recipient response'
    and cmd = 'UPDATE'
), 'recipient-only response policy exists');
select ok(not exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'fresh_communication_messages'
    and policyname = 'fresh message sender'
), 'old broad sender ALL policy is removed');

select ok(has_table_privilege('anon', 'public.ecosystem_profiles', 'SELECT'),
  'anon can read enabled ecosystem profiles');
select ok(not has_table_privilege('anon', 'public.ecosystem_profiles', 'INSERT'),
  'anon cannot create ecosystem profiles');
select ok(has_table_privilege('authenticated', 'public.ecosystem_profiles', 'INSERT'),
  'authenticated can create owner-scoped ecosystem profiles');
select ok(has_table_privilege('authenticated', 'public.ecosystem_profiles', 'UPDATE'),
  'authenticated can update owner-scoped ecosystem profiles');
select ok(not has_table_privilege('authenticated', 'public.ecosystem_profiles', 'DELETE'),
  'authenticated cannot delete ecosystem profiles through the browser');


-- Schema-parity checks against the production tables inspected for this fixture.
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'connection_requests' and column_name = 'updated_at'
), 'connection requests fixture includes the production updated_at column');
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'fresh_communication_threads' and column_name = 'updated_at'
), 'Fresh Communication threads include updated_at for owner ordering');
select ok(exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'ecosystem_profiles' and column_name = 'fresh_id'
) and not exists (
  select 1 from information_schema.columns
  where table_schema = 'public' and table_name = 'ecosystem_profiles' and column_name = 'owner_id'
), 'ecosystem profiles use the production fresh_id ownership column');
select is((
  select count(*)::integer from pg_policies
  where schemaname = 'public' and tablename = 'connection_requests'
    and cmd = 'SELECT'
), 1, 'duplicate connection-request read policies are removed');
select ok(not exists (
  select 1 from pg_policies
  where schemaname = 'public' and tablename = 'ecosystem_profiles'
    and policyname in ('users can create their ecosystem profiles',
                       'users can update their ecosystem profiles',
                       'users can delete their ecosystem profiles')
), 'duplicate legacy ecosystem profile policies are removed');
select ok(not has_table_privilege('authenticated', 'public.connection_requests', 'TRUNCATE'),
  'authenticated users cannot truncate connection requests');
select ok(has_table_privilege('service_role', 'public.direct_messages', 'SELECT'),
  'service_role retains direct-message access');

select * from finish();
rollback;
