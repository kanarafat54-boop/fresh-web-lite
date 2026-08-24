import { supabase } from "../../../lib/supabase";

export const COMMENT_REACTION_TYPES = [
  "like", "dislike", "love", "laugh", "wow", "celebrate", "support", "curious",
  "inspire", "insightful", "agree", "disagree", "helpful", "question", "respect",
  "fire", "sad", "angry",
] as const;

export type CommentReactionType = (typeof COMMENT_REACTION_TYPES)[number];
export type CommentReactionTarget = "post" | "short";

export interface CommentReactionSummary {
  reaction_type: CommentReactionType;
  reaction_count: number;
  reacted_by_me: boolean;
}

function assertReactionType(value: string): asserts value is CommentReactionType {
  if (!(COMMENT_REACTION_TYPES as readonly string[]).includes(value)) {
    throw new Error(`Unsupported comment reaction: ${value}`);
  }
}

export async function setCommentReaction(
  commentId: string,
  targetType: CommentReactionTarget,
  reactionType: CommentReactionType,
): Promise<void> {
  assertReactionType(reactionType);
  const { error } = await supabase.rpc("set_comment_reaction", {
    p_comment_id: commentId,
    p_target_type: targetType,
    p_reaction_type: reactionType,
  });
  if (error) throw error;
}

export async function removeCommentReaction(
  commentId: string,
  targetType: CommentReactionTarget,
): Promise<void> {
  const { error } = await supabase.rpc("remove_comment_reaction", {
    p_comment_id: commentId,
    p_target_type: targetType,
  });
  if (error) throw error;
}

export async function getCommentReactionSummary(
  commentId: string,
  targetType: CommentReactionTarget,
): Promise<CommentReactionSummary[]> {
  const { data, error } = await supabase.rpc("get_comment_reaction_summary", {
    p_comment_id: commentId,
    p_target_type: targetType,
  });
  if (error) throw error;
  return (data ?? []) as CommentReactionSummary[];
}
