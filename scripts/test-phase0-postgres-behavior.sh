#!/usr/bin/env bash
set -euo pipefail

A="11111111-1111-4111-8111-111111111111"
B="22222222-2222-4222-8222-222222222222"
C="33333333-3333-4333-8333-333333333333"
D="44444444-4444-4444-8444-444444444444"
DENIAL_LOG="${RUNNER_TEMP:-/tmp}/phase0-denial.log"

as_user_sql() {
  local role="$1"
  local uid="$2"
  local statement="$3"
  if [[ -n "$uid" ]]; then
    psql -X -v ON_ERROR_STOP=1 -qAt -c "SET ROLE $role; SET request.jwt.claim.sub = '$uid'; $statement"
  else
    psql -X -v ON_ERROR_STOP=1 -qAt -c "SET ROLE $role; $statement"
  fi
}

expect_denied() {
  local label="$1"
  local role="$2"
  local uid="$3"
  local statement="$4"
  if as_user_sql "$role" "$uid" "$statement" >"$DENIAL_LOG" 2>&1; then
    echo "FAIL: $label (statement unexpectedly succeeded)"
    exit 1
  fi
  if ! grep -Eiq 'permission denied|row-level security|violates row-level security' "$DENIAL_LOG"; then
    echo "FAIL: $label (failed for an unexpected reason)"
    cat "$DENIAL_LOG"
    exit 1
  fi
  echo "PASS: $label"
}

expect_value() {
  local expected="$1"
  local label="$2"
  local actual="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "FAIL: $label (expected '$expected', got '$actual')"
    exit 1
  fi
  echo "PASS: $label"
}

# Seed only synthetic identities in the disposable database.
psql -X -v ON_ERROR_STOP=1 -q -c "
  INSERT INTO public.users (id) VALUES ('$A'), ('$B'), ('$C'), ('$D');
  INSERT INTO auth.users (id) VALUES ('$A'), ('$B'), ('$C'), ('$D');
  INSERT INTO public.connection_requests (requester_id, recipient_id, status)
  VALUES ('$A', '$B', 'accepted');
"

# Request state transitions: requester cannot self-accept; recipient can accept.
as_user_sql authenticated "$A" "INSERT INTO public.connection_requests (requester_id, recipient_id, status) VALUES ('$A', '$C', 'pending')"
expect_denied "requester cannot self-accept a pending connection" authenticated "$A" "UPDATE public.connection_requests SET status = 'accepted' WHERE requester_id = '$A' AND recipient_id = '$C'"
as_user_sql authenticated "$C" "UPDATE public.connection_requests SET status = 'accepted' WHERE requester_id = '$A' AND recipient_id = '$C' AND status = 'pending'"
expect_value "accepted" "recipient can accept the pending connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$A' AND recipient_id = '$C'")"
as_user_sql authenticated "$A" "UPDATE public.connection_requests SET status = 'pending' WHERE requester_id = '$A' AND recipient_id = '$B' AND status = 'accepted'"
expect_value "accepted" "requester cannot reset an accepted connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$A' AND recipient_id = '$B'")"

# Request cancellation and re-send behavior.
as_user_sql authenticated "$A" "INSERT INTO public.connection_requests (requester_id, recipient_id, status) VALUES ('$A', '$D', 'pending')"
as_user_sql authenticated "$A" "UPDATE public.connection_requests SET status = 'cancelled' WHERE requester_id = '$A' AND recipient_id = '$D' AND status = 'pending'"
expect_value "cancelled" "requester can cancel a pending connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$A' AND recipient_id = '$D'")"
as_user_sql authenticated "$C" "INSERT INTO public.connection_requests (requester_id, recipient_id, status) VALUES ('$C', '$D', 'pending')"
as_user_sql authenticated "$D" "UPDATE public.connection_requests SET status = 'declined' WHERE requester_id = '$C' AND recipient_id = '$D' AND status = 'pending'"
as_user_sql authenticated "$C" "UPDATE public.connection_requests SET status = 'pending' WHERE requester_id = '$C' AND recipient_id = '$D' AND status = 'declined'"
expect_value "pending" "requester can re-send a declined connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$C' AND recipient_id = '$D'")"

# Direct messages: accepted pair can send; unrelated users cannot send or read them.
expect_denied "unconnected user cannot send a direct message" authenticated "$C" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$C', '$D', 'should be denied')"
expect_denied "sender identity cannot be forged" authenticated "$A" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$C', '$B', 'forged sender')"
as_user_sql authenticated "$A" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$A', '$B', 'accepted connection message')"
expect_value "0" "unrelated user cannot read another user's direct message" "$(as_user_sql authenticated "$C" "SELECT count(*) FROM public.direct_messages WHERE sender_id = '$A' OR recipient_id = '$A'")"

# Only recipients may set read receipts; senders cannot mark their outgoing messages as read.
as_user_sql authenticated "$A" "UPDATE public.direct_messages SET read_at = now() WHERE sender_id = '$A' AND recipient_id = '$B'"
expect_value "0" "sender cannot mark an outgoing message as read" "$(psql -X -qAt -c "SELECT count(*) FROM public.direct_messages WHERE sender_id = '$A' AND recipient_id = '$B' AND read_at IS NOT NULL")"
as_user_sql authenticated "$B" "UPDATE public.direct_messages SET read_at = now() WHERE sender_id = '$A' AND recipient_id = '$B'"
expect_value "1" "recipient can mark an incoming message as read" "$(psql -X -qAt -c "SELECT count(*) FROM public.direct_messages WHERE sender_id = '$A' AND recipient_id = '$B' AND read_at IS NOT NULL")"

# Fresh Communication: only the thread owner can see or append to their thread.
THREAD_ID="$(as_user_sql authenticated "$A" "INSERT INTO public.fresh_communication_threads (owner_id, kind, title) VALUES ('$A', 'test', 'Owner-only test') RETURNING id")"
expect_value "0" "another user cannot read an owner-only thread" "$(as_user_sql authenticated "$B" "SELECT count(*) FROM public.fresh_communication_threads WHERE id = '$THREAD_ID'")"
expect_denied "another user cannot append to an owner-only thread" authenticated "$B" "INSERT INTO public.fresh_communication_messages (thread_id, sender_id, kind, body) VALUES ('$THREAD_ID', '$B', 'text', 'should be denied')"
as_user_sql authenticated "$A" "INSERT INTO public.fresh_communication_messages (thread_id, sender_id, kind, body) VALUES ('$THREAD_ID', '$A', 'text', 'owner message')"

# Public profile reads are preserved; writes and updates remain owner-scoped.
PROFILE_ID="$(as_user_sql authenticated "$A" "INSERT INTO public.ecosystem_profiles (fresh_id, ecosystem_id, title, enabled) VALUES ('$A', 'phase0-test', 'Owner profile', true) RETURNING id")"
expect_value "1" "anonymous users can read enabled public profiles" "$(as_user_sql anon "" "SELECT count(*) FROM public.ecosystem_profiles WHERE enabled = true AND id = '$PROFILE_ID'")"
expect_denied "anonymous users cannot create ecosystem profiles" anon "" "INSERT INTO public.ecosystem_profiles (fresh_id, ecosystem_id, title, enabled) VALUES ('$D', 'anonymous-write', 'anonymous write', true)"
as_user_sql authenticated "$B" "UPDATE public.ecosystem_profiles SET title = 'hijacked profile' WHERE id = '$PROFILE_ID'"
expect_value "Owner profile" "another user cannot update an owner's ecosystem profile" "$(psql -X -qAt -c "SELECT title FROM public.ecosystem_profiles WHERE id = '$PROFILE_ID'")"
as_user_sql authenticated "$A" "UPDATE public.ecosystem_profiles SET title = 'Updated owner profile' WHERE id = '$PROFILE_ID'"
expect_value "Updated owner profile" "profile owner can update their own ecosystem profile" "$(psql -X -qAt -c "SELECT title FROM public.ecosystem_profiles WHERE id = '$PROFILE_ID'")"

echo "Phase 0 isolated PostgreSQL behavior tests passed."
