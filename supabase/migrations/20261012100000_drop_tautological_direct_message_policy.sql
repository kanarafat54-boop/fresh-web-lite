-- Remove a duplicate policy whose recipient check became tautological.
-- The existing "direct messages sender insert" policy enforces both sender identity
-- and an accepted connection to the exact recipient, so it remains the sole insert path.
drop policy if exists "direct messages sender insert when connected"
  on public.direct_messages;
