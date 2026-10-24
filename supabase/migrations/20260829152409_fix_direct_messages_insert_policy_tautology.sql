-- Restored (20260829152409): final direct-messages insert policy (requires an accepted connection with the recipient).
-- Reconstructed from production; idempotent.
drop policy if exists "direct messages sender insert" on public.direct_messages;
create policy "direct messages sender insert" on public.direct_messages for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = sender_id) AND (EXISTS ( SELECT 1 FROM connection_requests cr WHERE ((cr.status = 'accepted'::text) AND (((cr.requester_id = ( SELECT auth.uid() AS uid)) AND (cr.recipient_id = direct_messages.recipient_id)) OR ((cr.recipient_id = ( SELECT auth.uid() AS uid)) AND (cr.requester_id = direct_messages.recipient_id)))))));
