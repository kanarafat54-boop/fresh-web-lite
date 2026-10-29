-- Make direct_messages SELECT / mark-read policies reproducible from the repository.
--
-- Production already has these two policies (created by historical remote
-- migrations whose repository copies are intentional no-ops:
-- 20260829100151_connect_and_direct_messages.sql and
-- 20260829152959_direct_messages_for_connect.sql). 20261014194500 even says
-- "keep direct-message SELECT and UPDATE policies in place", but nothing in the
-- repository creates them, so a clean replay (new project, disaster recovery,
-- CI) yields a table where no one can read their messages or mark them read.
--
-- This migration is idempotent and semantically identical to the live policies
-- (it only wraps auth.uid() in a scalar subselect so it is evaluated once per
-- statement). It does not widen access and changes no grants or data.

drop policy if exists "direct messages participant read" on public.direct_messages;
create policy "direct messages participant read"
  on public.direct_messages
  for select
  to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

drop policy if exists "direct messages recipient mark read" on public.direct_messages;
create policy "direct messages recipient mark read"
  on public.direct_messages
  for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

notify pgrst, 'reload schema';
