-- Hardening for the Fresh Proof and Machine Access functions (found by the Supabase security advisor).
-- Trigger functions are never meant to be called directly, so no client role may execute them, and every new
-- function now has a pinned search_path. Applied to the live project on 2026-11-11 with the owner's approval.

revoke all on function public.proof_records_before_insert() from public, anon, authenticated;
revoke all on function public.proof_records_refuse_change() from public, anon, authenticated;
revoke all on function public.machine_audit_refuse_change() from public, anon, authenticated;

alter function public.proof_hash_input(text, uuid, bigint, text, text, text, text, text) set search_path = public;
alter function public.proof_records_refuse_change() set search_path = public;
alter function public.proof_verify_chain(uuid) set search_path = public;
alter function public.proof_daily_digest(date) set search_path = public;
alter function public.machine_audit_refuse_change() set search_path = public;

notify pgrst, 'reload schema';
