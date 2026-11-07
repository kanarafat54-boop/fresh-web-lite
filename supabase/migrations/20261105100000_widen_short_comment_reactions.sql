-- Fresh Shorts comment reactions (spec 3.8): allow the richer set. Additive widening, no data changes.
-- Every reaction type that was allowed before is still allowed. Apply after schema review.
-- Rollback: re-add the previous constraint (only valid while no row uses a new type).

alter table public.short_comment_reactions
  drop constraint if exists short_comment_reactions_reaction_type_check;

alter table public.short_comment_reactions
  add constraint short_comment_reactions_reaction_type_check
  check (reaction_type in (
    'like','dislike','love','laugh','wow','sad','angry','fire','clap','support',
    'curious','inspire','insightful','agree','disagree','helpful','question','respect'
  ));

notify pgrst, 'reload schema';
