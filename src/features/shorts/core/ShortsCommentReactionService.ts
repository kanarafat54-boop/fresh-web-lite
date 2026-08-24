import { supabase } from "../../../lib/supabase";
import type { ReactionKind } from "./ShortsInteractionModel";

export interface ShortsCommentReactionState {
  commentId: string;
  counts: Partial<Record<ReactionKind, number>>;
  mine?: ReactionKind;
}

export interface ShortsCommentReactionResult {
  state: ShortsCommentReactionState;
  changed: boolean;
}

/**
 * Server-backed comment reaction boundary.
 *
 * The UI should call this service instead of writing directly to the reaction
 * table. This keeps reaction semantics in one place as Shorts gains richer
 * clients (web, mobile, AR/VR and future surfaces).
 */
export async function getShortsCommentReactionState(
  commentId: string,
  userId?: string,
): Promise<ShortsCommentReactionState> {
  const { data, error } = await supabase
    .from("short_comment_reactions")
    .select("user_id,reaction_type")
    .eq("comment_id", commentId);

  if (error) throw error;

  const counts: Partial<Record<ReactionKind, number>> = {};
  let mine: ReactionKind | undefined;

  for (const row of data ?? []) {
    const reaction = row.reaction_type as ReactionKind;
    counts[reaction] = (counts[reaction] ?? 0) + 1;
    if (userId && row.user_id === userId) mine = reaction;
  }

  return { commentId, counts, mine };
}

export async function setShortsCommentReaction(
  commentId: string,
  userId: string,
  reaction: ReactionKind,
): Promise<ShortsCommentReactionResult> {
  const current = await getShortsCommentReactionState(commentId, userId);

  if (current.mine === reaction) {
    const { error } = await supabase
      .from("short_comment_reactions")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  } else if (current.mine) {
    const { error } = await supabase
      .from("short_comment_reactions")
      .update({ reaction_type: reaction })
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("short_comment_reactions")
      .insert({ comment_id: commentId, user_id: userId, reaction_type: reaction });
    if (error) throw error;
  }

  const state = await getShortsCommentReactionState(commentId, userId);
  return { state, changed: true };
}

export async function clearShortsCommentReaction(
  commentId: string,
  userId: string,
): Promise<ShortsCommentReactionState> {
  const { error } = await supabase
    .from("short_comment_reactions")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", userId);
  if (error) throw error;

  return getShortsCommentReactionState(commentId, userId);
}
