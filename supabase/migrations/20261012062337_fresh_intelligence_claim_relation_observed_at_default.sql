-- Keep relation persistence compatible with callers that do not provide observed_at.
ALTER TABLE public.fresh_intelligence_claim_relations
  ALTER COLUMN observed_at SET DEFAULT now();
