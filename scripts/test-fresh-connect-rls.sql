-- Behavioral authorization test for Fresh Connect (connection requests, direct
-- messages) and the owner-only Fresh Communication thread tables.
--
-- Runs ONLY against a disposable PostgreSQL database after the real migrations
-- have been applied (see scripts/test-fresh-connect-rls.sh). It exercises the
-- real RLS policies and column grants as the `anon` and `authenticated` roles
-- with different simulated JWT subjects; it never touches production data.
--
-- Requires an `auth.uid()` that reads the `request.jwt.claim.sub` setting, which
-- is how Supabase evaluates it, and roles anon/authenticated/service_role.

create schema if not exists connect_test;

create or replace function connect_test.login(uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  set local role authenticated;
end;
$$;

create or replace function connect_test.logout() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
end;
$$;

-- The statement must be REJECTED (privilege, RLS check, or constraint).
create or replace function connect_test.expect_denied(label text, stmt text) returns void
language plpgsql as $$
begin
  begin
    execute stmt;
  exception when insufficient_privilege or check_violation or not_null_violation or unique_violation then
    return;
  end;
  raise exception 'FAIL (statement succeeded but must be denied): %', label;
end;
$$;

-- The statement must succeed and affect exactly `want` rows.
create or replace function connect_test.expect_rows(label text, stmt text, want int) returns void
language plpgsql as $$
declare got int;
begin
  execute stmt;
  get diagnostics got = row_count;
  if got <> want then
    raise exception 'FAIL (%): expected % row(s), got %', label, want, got;
  end if;
end;
$$;

-- A SELECT count must equal `want`.
create or replace function connect_test.expect_count(label text, stmt text, want int) returns void
language plpgsql as $$
declare got int;
begin
  execute 'select count(*) from (' || stmt || ') q' into got;
  if got <> want then
    raise exception 'FAIL (%): expected % visible row(s), got %', label, want, got;
  end if;
end;
$$;

grant usage on schema connect_test to anon, authenticated;
grant execute on all functions in schema connect_test to anon, authenticated;

do $$
declare
  a uuid := gen_random_uuid();   -- requester
  b uuid := gen_random_uuid();   -- recipient
  c uuid := gen_random_uuid();   -- unrelated user
  req_id uuid;
  msg_id uuid;
  thread_id uuid;
begin
  insert into auth.users (id) values (a), (b), (c);

  -- ---------------------------------------------------------------- anon
  perform connect_test.logout();
  set local role anon;
  perform connect_test.expect_denied('anon cannot read connection_requests', 'select 1 from public.connection_requests');
  perform connect_test.expect_denied('anon cannot read direct_messages', 'select 1 from public.direct_messages');
  perform connect_test.expect_denied('anon cannot read fresh_communication_threads', 'select 1 from public.fresh_communication_threads');
  perform connect_test.expect_denied('anon cannot read fresh_communication_messages', 'select 1 from public.fresh_communication_messages');
  reset role;

  -- ------------------------------------------------- connection request rules
  perform connect_test.login(a);
  perform connect_test.expect_denied('cannot request on behalf of another user',
    format('insert into public.connection_requests (requester_id, recipient_id) values (%L, %L)', b, c));
  perform connect_test.expect_denied('cannot create an already-accepted request',
    format('insert into public.connection_requests (requester_id, recipient_id, status) values (%L, %L, ''accepted'')', a, b));
  perform connect_test.expect_denied('cannot request yourself',
    format('insert into public.connection_requests (requester_id, recipient_id) values (%L, %L)', a, a));
  perform connect_test.expect_rows('requester can create a pending request',
    format('insert into public.connection_requests (requester_id, recipient_id) values (%L, %L)', a, b), 1);
  select id into req_id from public.connection_requests where requester_id = a and recipient_id = b;
  perform connect_test.expect_denied('duplicate request for the same pair is rejected',
    format('insert into public.connection_requests (requester_id, recipient_id) values (%L, %L)', a, b));
  perform connect_test.expect_rows('requester can see their request',
    format('select 1 from public.connection_requests where id = %L', req_id), 1) ;

  -- A cannot self-accept, or rewrite identity columns.
  perform connect_test.expect_denied('requester cannot self-accept',
    format('update public.connection_requests set status = ''accepted'' where id = %L', req_id));
  perform connect_test.expect_denied('identity columns are not updatable',
    format('update public.connection_requests set recipient_id = %L where id = %L', c, req_id));
  perform connect_test.expect_denied('browser roles cannot delete requests',
    format('delete from public.connection_requests where id = %L', req_id));

  -- Messaging is blocked until the request is accepted.
  perform connect_test.expect_denied('no direct message before acceptance',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''hi'')', a, b));
  perform connect_test.logout();

  -- ------------------------------------------------------------ outsider C
  perform connect_test.login(c);
  perform connect_test.expect_count('outsider cannot see the request',
    format('select 1 from public.connection_requests where id = %L', req_id), 0);
  perform connect_test.expect_rows('outsider cannot accept someone else''s request',
    format('update public.connection_requests set status = ''accepted'' where id = %L', req_id), 0);
  perform connect_test.logout();

  -- ----------------------------------------------------------- recipient B
  perform connect_test.login(b);
  perform connect_test.expect_count('recipient sees the incoming request',
    format('select 1 from public.connection_requests where id = %L', req_id), 1);
  perform connect_test.expect_rows('recipient accepts',
    format('update public.connection_requests set status = ''accepted'' where id = %L', req_id), 1);
  perform connect_test.logout();

  -- Once accepted the requester cannot cancel/revert it.
  perform connect_test.login(a);
  perform connect_test.expect_rows('requester cannot revert an accepted connection',
    format('update public.connection_requests set status = ''cancelled'' where id = %L', req_id), 0);

  -- ------------------------------------------------------ direct messages
  perform connect_test.expect_denied('sender id cannot be spoofed',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''spoof'')', b, a));
  perform connect_test.expect_denied('empty message body is rejected',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''   '')', a, b));
  perform connect_test.expect_denied('cannot message an unconnected user',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''hi'')', a, c));
  perform connect_test.expect_denied('read_at cannot be forged on insert',
    format('insert into public.direct_messages (sender_id, recipient_id, body, read_at) values (%L, %L, ''x'', now())', a, b));
  perform connect_test.expect_rows('accepted connection can send a message',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''hello b'')', a, b), 1);
  select id into msg_id from public.direct_messages where sender_id = a and recipient_id = b;
  perform connect_test.expect_rows('sender cannot mark a message they sent as read',
    format('update public.direct_messages set read_at = now() where id = %L', msg_id), 0);
  perform connect_test.expect_denied('message body is immutable for browser roles',
    format('update public.direct_messages set body = ''edited'' where id = %L', msg_id));
  perform connect_test.expect_denied('browser roles cannot delete messages',
    format('delete from public.direct_messages where id = %L', msg_id));
  perform connect_test.logout();

  perform connect_test.login(b);
  perform connect_test.expect_count('recipient can read the message',
    format('select 1 from public.direct_messages where id = %L', msg_id), 1);
  perform connect_test.expect_rows('recipient can reply (connection is two-way)',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''hello a'')', b, a), 1);
  perform connect_test.expect_rows('recipient can mark received message read',
    format('update public.direct_messages set read_at = now() where id = %L', msg_id), 1);
  perform connect_test.expect_denied('recipient cannot rewrite the sender',
    format('update public.direct_messages set sender_id = %L where id = %L', c, msg_id));
  perform connect_test.logout();

  perform connect_test.login(c);
  perform connect_test.expect_count('outsider cannot read any direct message', 'select 1 from public.direct_messages', 0);
  perform connect_test.expect_denied('outsider cannot inject a message into the pair',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''intrude'')', c, a));
  perform connect_test.expect_rows('outsider cannot mark others'' messages read',
    format('update public.direct_messages set read_at = now() where id = %L', msg_id), 0);
  perform connect_test.logout();

  -- ----------------------------------- decline blocks messaging, resend works
  perform connect_test.login(a);
  perform connect_test.expect_rows('requester sends a request to C',
    format('insert into public.connection_requests (requester_id, recipient_id) values (%L, %L)', a, c), 1);
  perform connect_test.logout();
  perform connect_test.login(c);
  perform connect_test.expect_rows('recipient declines',
    format('update public.connection_requests set status = ''declined'' where requester_id = %L and recipient_id = %L', a, c), 1);
  perform connect_test.logout();
  perform connect_test.login(a);
  perform connect_test.expect_denied('no message to a user who declined',
    format('insert into public.direct_messages (sender_id, recipient_id, body) values (%L, %L, ''pls'')', a, c));
  perform connect_test.expect_denied('requester cannot flip declined straight to accepted',
    format('update public.connection_requests set status = ''accepted'' where requester_id = %L and recipient_id = %L', a, c));
  perform connect_test.expect_rows('requester may re-send a declined request',
    format('update public.connection_requests set status = ''pending'' where requester_id = %L and recipient_id = %L', a, c), 1);
  perform connect_test.logout();

  -- ----------------------------------------- owner-only Fresh Communication
  perform connect_test.login(a);
  perform connect_test.expect_denied('cannot create a thread owned by someone else',
    format('insert into public.fresh_communication_threads (owner_id, title) values (%L, ''x'')', b));
  perform connect_test.expect_rows('owner creates a thread',
    format('insert into public.fresh_communication_threads (owner_id, title) values (%L, ''mine'')', a), 1);
  select id into thread_id from public.fresh_communication_threads where owner_id = a;
  perform connect_test.expect_rows('owner posts in own thread',
    format('insert into public.fresh_communication_messages (thread_id, sender_id, body) values (%L, %L, ''note'')', thread_id, a), 1);
  perform connect_test.logout();

  perform connect_test.login(b);
  perform connect_test.expect_count('other user cannot see the thread',
    format('select 1 from public.fresh_communication_threads where id = %L', thread_id), 0);
  perform connect_test.expect_count('other user cannot read thread messages',
    format('select 1 from public.fresh_communication_messages where thread_id = %L', thread_id), 0);
  perform connect_test.expect_denied('other user cannot post into the thread',
    format('insert into public.fresh_communication_messages (thread_id, sender_id, body) values (%L, %L, ''intrude'')', thread_id, b));
  perform connect_test.expect_rows('other user cannot rename the thread',
    format('update public.fresh_communication_threads set title = ''pwn'' where id = %L', thread_id), 0);
  perform connect_test.logout();

  raise notice 'Fresh Connect behavioral authorization checks passed';
end
$$;

drop schema connect_test cascade;
