-- Performance: add covering indexes for foreign keys reported by Supabase advisors.
-- No RLS or authorization semantics are changed.

create index if not exists idx_direct_messages_sender_id
  on public.direct_messages(sender_id);

create index if not exists idx_short_captions_created_by
  on public.short_captions(created_by);

create index if not exists idx_short_gifts_recipient_id
  on public.short_gifts(recipient_id);

create index if not exists idx_short_gifts_sender_id
  on public.short_gifts(sender_id);

create index if not exists idx_short_gifts_transaction_id
  on public.short_gifts(transaction_id);
