-- Defense in depth for the corrections table. Apply only after schema review.
--
-- fresh_ai_preference_pairs is protected today by row level security alone: it has a SELECT policy
-- for the owner of each row and no write policies, so signed-in users cannot insert or edit rows.
-- But the roles anon and authenticated still hold INSERT, UPDATE, DELETE, TRUNCATE (and more) as table
-- privileges, so a single mistaken policy added later would let a user mark their own correction as
-- approved. Only the server (service_role, via /api/ai/feedback) writes this table; remove the
-- privileges nobody needs. Users keep SELECT on their own rows through the existing policy.
--
-- This changes access, not data. It is a separate file so it can be applied or skipped on its own.
-- Rollback: grant insert, update, delete on public.fresh_ai_preference_pairs to authenticated;

revoke insert, update, delete, truncate, references, trigger on public.fresh_ai_preference_pairs from anon, authenticated;
revoke select on public.fresh_ai_preference_pairs from anon;

notify pgrst, 'reload schema';
