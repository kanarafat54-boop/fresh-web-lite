-- Phase 0: prevent a requester from self-accepting a connection.
-- The app only updates status for cancellation or recipient response. Lock the
-- identity columns at the privilege layer and use separate state-transition policies.

alter table public.connection_requests enable row level security;

revoke all privileges on table public.connection_requests from public, anon, authenticated;

grant select on table public.connection_requests to authenticated;
grant insert (requester_id, recipient_id, status) on table public.connection_requests to authenticated;
grant update (status) on table public.connection_requests to authenticated;

-- Remove duplicated permissive policies found in the live database.
drop policy if exists "connection requests participant read" on public.connection_requests;
drop policy if exists "connection requests participants read" on public.connection_requests;
drop policy if exists "connection requests participant update" on public.connection_requests;
drop policy if exists "connection requests participants update" on public.connection_requests;
drop policy if exists "connection requests requester insert" on public.connection_requests;
drop policy if exists "connection requests requester delete" on public.connection_requests;

create policy "connection requests participants read"
  on public.connection_requests
  for select
  to authenticated
  using ((select auth.uid()) = requester_id or (select auth.uid()) = recipient_id);

create policy "connection requests requester insert"
  on public.connection_requests
  for insert
  to authenticated
  with check (
    (select auth.uid()) = requester_id
    and requester_id <> recipient_id
    and status = 'pending'
  );

-- Requesters can cancel pending requests, and can re-send a declined/cancelled
-- request by transitioning it back to pending. They cannot modify accepted rows.
create policy "connection requests requester state transition"
  on public.connection_requests
  for update
  to authenticated
  using (
    (select auth.uid()) = requester_id
    and status in ('pending', 'declined', 'cancelled')
  )
  with check (
    (select auth.uid()) = requester_id
    and status in ('pending', 'cancelled')
  );

-- Only the recipient can accept or decline a pending request.
create policy "connection requests recipient response"
  on public.connection_requests
  for update
  to authenticated
  using (
    (select auth.uid()) = recipient_id
    and status = 'pending'
  )
  with check (
    (select auth.uid()) = recipient_id
    and status in ('accepted', 'declined')
  );

notify pgrst, 'reload schema';
