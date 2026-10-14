-- pgTAP catalog assertions for Phase 0 access hardening.
-- Run after applying the Phase 0 messaging migrations with: supabase test db

begin;
select plan(22);

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

select * from finish();
rollback;
