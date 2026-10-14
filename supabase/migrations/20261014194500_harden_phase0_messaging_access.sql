-- Phase 0: harden the exposed messaging tables without changing their data.
-- Fresh Communication currently has an owner-only thread model (no participant table).
-- Do not imply multi-party membership until an explicit membership model exists.

alter table public.direct_messages enable row level security;
alter table public.fresh_communication_threads enable row level security;
alter table public.fresh_communication_messages enable row level security;

-- Remove default/broad browser grants first. Keep service_role grants intact.
revoke all privileges on table public.direct_messages from public, anon, authenticated;
revoke all privileges on table public.fresh_communication_threads from public, anon, authenticated;
revoke all privileges on table public.fresh_communication_messages from public, anon, authenticated;

-- Direct messages: browser operations currently used by messagingService.ts only need
-- read, send, and setting read_at on messages received by the current user.
grant select on table public.direct_messages to authenticated;
grant insert (sender_id, recipient_id, body) on table public.direct_messages to authenticated;
grant update (read_at) on table public.direct_messages to authenticated;

-- Ensure only a genuinely authenticated user can use the direct-message insert policy.
drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert"
  on public.direct_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1
      from public.connection_requests cr
      where cr.status = 'accepted'
        and (
          (cr.requester_id = (select auth.uid()) and cr.recipient_id = direct_messages.recipient_id)
          or
          (cr.recipient_id = (select auth.uid()) and cr.requester_id = direct_messages.recipient_id)
        )
    )
  );

-- Keep direct-message SELECT and UPDATE policies in place: they already restrict
-- reads to the sender/recipient and read-state changes to the recipient.

-- Owner-only thread access. Do not grant delete or arbitrary column updates.
grant select on table public.fresh_communication_threads to authenticated;
grant insert (owner_id, kind, title) on table public.fresh_communication_threads to authenticated;
grant update (title) on table public.fresh_communication_threads to authenticated;

drop policy if exists "fresh thread owner" on public.fresh_communication_threads;
create policy "fresh thread owner select"
  on public.fresh_communication_threads
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "fresh thread owner insert"
  on public.fresh_communication_threads
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "fresh thread owner update"
  on public.fresh_communication_threads
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

-- A message is visible only to the owner of its thread, and a user can only
-- append to their own thread. This is deliberately conservative because the
-- current schema has no thread-membership/participant relation.
grant select on table public.fresh_communication_messages to authenticated;
grant insert (thread_id, sender_id, kind, body) on table public.fresh_communication_messages to authenticated;

drop policy if exists "fresh message sender" on public.fresh_communication_messages;
create policy "fresh message thread owner select"
  on public.fresh_communication_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.fresh_communication_threads t
      where t.id = fresh_communication_messages.thread_id
        and t.owner_id = (select auth.uid())
    )
  );

create policy "fresh message owner insert"
  on public.fresh_communication_messages
  for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1
      from public.fresh_communication_threads t
      where t.id = fresh_communication_messages.thread_id
        and t.owner_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
