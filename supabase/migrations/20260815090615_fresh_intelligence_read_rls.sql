-- Restored from production schema (20260815090615): public-read policies and grants for the intelligence tables restored at 20260812125640
-- The original SQL for this version was never committed (placeholder). This file reconstructs the effective
-- end-state of the objects it introduced, from production catalogs read on 2026-10-23/24. Production has
-- already applied this version, so it will not re-run there. Everything below is idempotent.
-- Reconstruction note: statement-level history is not recoverable; final definitions are used.

drop policy if exists "fresh intelligence arbitrations are readable" on public.fresh_intelligence_arbitrations;
create policy "fresh intelligence arbitrations are readable" on public.fresh_intelligence_arbitrations for select to anon,authenticated
  using (true);

drop policy if exists "fresh intelligence claim revisions are readable" on public.fresh_intelligence_claim_revisions;
create policy "fresh intelligence claim revisions are readable" on public.fresh_intelligence_claim_revisions for select to anon,authenticated
  using (true);
