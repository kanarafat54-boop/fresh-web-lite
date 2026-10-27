-- Keep reviewer lookups and referential checks efficient as Fresh AI feedback grows.
-- Additive and safe to replay; does not change row access or data.
CREATE INDEX IF NOT EXISTS fresh_ai_feedback_reviewed_by_idx
  ON public.fresh_ai_feedback (reviewed_by);
