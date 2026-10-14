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

# Seed only synthetic records, as the database owner.
psql -X -v ON_ERROR_STOP=1 -q -c "
  INSERT INTO public.connection_requests (requester_id, recipient_id, status)
  VALUES ('$A', '$B', 'accepted');
  INSERT INTO public.ecosystem_profiles (owner_id, enabled, display_name)
  VALUES ('$A', true, 'Phase 0 fixture profile');
"

# Request state transitions: requester cannot self-accept; recipient can accept.
as_user_sql authenticated "$A" "INSERT INTO public.connection_requests (requester_id, recipient_id, status) VALUES ('$A', '$C', 'pending')"
expect_denied "requester cannot self-accept a pending connection" authenticated "$A" "UPDATE public.connection_requests SET status = 'accepted' WHERE requester_id = '$A' AND recipient_id = '$C'"
as_user_sql authenticated "$C" "UPDATE public.connection_requests SET status = 'accepted' WHERE requester_id = '$A' AND recipient_id = '$C' AND status = 'pending'"
expect_value "accepted" "recipient can accept the pending connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$A' AND recipient_id = '$C'")"
as_user_sql authenticated "$A" "UPDATE public.connection_requests SET status = 'pending' WHERE requester_id = '$A' AND recipient_id = '$B' AND status = 'accepted'"
expect_value "accepted" "requester cannot reset an accepted connection" "$(psql -X -qAt -c "SELECT status FROM public.connection_requests WHERE requester_id = '$A' AND recipient_id = '$B'")"

# Direct messages: accepted pair can send; unrelated users cannot send or read them.
expect_denied "unconnected user cannot send a direct message" authenticated "$C" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$C', '$D', 'should be denied')"
expect_denied "sender identity cannot be forged" authenticated "$A" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$C', '$B', 'forged sender')"
as_user_sql authenticated "$A" "INSERT INTO public.direct_messages (sender_id, recipient_id, body) VALUES ('$A', '$B', 'accepted connection message')"
expect_value "0" "unrelated user cannot read another user's direct message" "$(as_user_sql authenticated "$C" "SELECT count(*) FROM public.direct_messages WHERE sender_id = '$A' OR recipient_id = '$A'")"

# Fresh Communication: only the thread owner can see or append to their thread.
THREAD_ID="$(as_user_sql authenticated "$A" "INSERT INTO public.fresh_communication_threads (owner_id, kind, title) VALUES ('$A', 'test', 'Owner-only test') RETURNING id")"
expect_value "0" "another user cannot read an owner-only thread" "$(as_user_sql authenticated "$B" "SELECT count(*) FROM public.fresh_communication_threads WHERE id = '$THREAD_ID'")"
expect_denied "another user cannot append to an owner-only thread" authenticated "$B" "INSERT INTO public.fresh_communication_messages (thread_id, sender_id, kind, body) VALUES ('$THREAD_ID', '$B', 'text', 'should be denied')"
as_user_sql authenticated "$A" "INSERT INTO public.fresh_communication_messages (thread_id, sender_id, kind, body) VALUES ('$THREAD_ID', '$A', 'text', 'owner message')"

# Public profile reads are preserved, but anonymous writes are not.
expect_value "1" "anonymous users can read enabled public profiles" "$(as_user_sql anon "" "SELECT count(*) FROM public.ecosystem_profiles WHERE enabled = true")"
expect_denied "anonymous users cannot create ecosystem profiles" anon "" "INSERT INTO public.ecosystem_profiles (owner_id, enabled, display_name) VALUES ('$D', true, 'anonymous write')"

echo "Phase 0 isolated PostgreSQL behavior tests passed."
