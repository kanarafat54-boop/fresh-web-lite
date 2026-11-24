-- Correct the duplicate legacy CHECK constraint left behind by the original widening migration.
-- PostgreSQL enforces every CHECK constraint on the table. Keeping the old 10-value
-- short_comment_reactions_type_check alongside the widened 18-value check still rejects
-- the eight newer reactions. This migration replaces both with one canonical constraint.
-- No reaction rows are modified or deleted.

alter table public.short_comment_reactions
  drop constraint if exists short_comment_reactions_type_check;

alter table public.short_comment_reactions
  drop constraint if exists short_comment_reactions_reaction_type_check;

alter table public.short_comment_reactions
  add constraint short_comment_reactions_reaction_type_check
  check (reaction_type in (
    'like','dislike','love','laugh','wow','sad','angry','fire','clap','support',
    'curious','inspire','insightful','agree','disagree','helpful','question','respect'
  )) not valid;

alter table public.short_comment_reactions
  validate constraint short_comment_reactions_reaction_type_check;

notify pgrst, 'reload schema';
