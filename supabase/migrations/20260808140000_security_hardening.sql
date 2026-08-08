-- Keep the repository migration history aligned with the production hardening
-- applied to the Fresh Web Lite Supabase project.

alter view public.treasury_account_balances set (security_invoker = true);
alter view public.my_treasury_balances set (security_invoker = true);
alter view public.short_reaction_breakdown set (security_invoker = true);
alter view public.short_recent_activity set (security_invoker = true);

-- Client roles must never be able to call privileged ledger mutation or
-- administrative helper functions directly.
revoke execute on function public.assert_ledger_transaction_balanced(uuid) from public, anon, authenticated;
revoke execute on function public.create_treasury_transaction(text, text, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.send_tip(uuid, uuid, integer, text) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
revoke execute on function public.increment_short_views(uuid) from public, anon, authenticated;
revoke execute on function public.update_note_vote_counts() from public, anon, authenticated;
revoke execute on function public.update_post_comment_count() from public, anon, authenticated;
revoke execute on function public.update_post_like_count() from public, anon, authenticated;
revoke execute on function public.update_short_comment_count() from public, anon, authenticated;
revoke execute on function public.update_short_like_count() from public, anon, authenticated;
revoke execute on function public.update_short_repost_count() from public, anon, authenticated;
revoke execute on function public.reject_ledger_mutation() from public, anon, authenticated;

-- Pin mutable function resolution to the trusted schema.
alter function public.update_post_like_count() set search_path = public;
alter function public.update_short_repost_count() set search_path = public;
alter function public.update_short_like_count() set search_path = public;
alter function public.update_note_vote_counts() set search_path = public;
alter function public.update_post_comment_count() set search_path = public;
alter function public.update_short_comment_count() set search_path = public;
alter function public.increment_short_views(uuid) set search_path = public;
alter function public.send_tip(uuid, uuid, integer, text) set search_path = public;
alter function public.reject_ledger_mutation() set search_path = public;

-- Ledger base tables remain RLS-protected without client policies: all
-- mutation access is intentionally routed through controlled server functions.
