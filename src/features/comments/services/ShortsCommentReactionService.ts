import { supabase } from "../../../lib/supabase";
import type { ReactionKind } from "../../shorts/core/ShortsInteractionModel";

export type ShortsCommentReaction = Extract<
  ReactionKind,
  | "like"
  | "dislike"
  | "love"
  | "laugh"
  | "wow"
  | "sad"
  | "angry"
  | "fire"
  | "clap"
  | "support"
>;

export interface CommentReactionState {
  counts: Partial<Record<ShortsCommentReaction, number>>;
  mine?: ShortsCommentReaction;
}

export interface CommentReactionChange {
  commentId: string;
  userId: string;
  reactionType: ShortsCommentReaction;
}

const TABLE = "short_comment_reactions";

function isSupportedReaction(value: string): value is ShortsCommentReaction {
  return [
    "like",
    "dislike",
    "love",
    "laugh",
    "wow",
    "sad",
    "angry",
    "fire",
    "clap",
    "support",
  ].includes(value);
}

export async function getCommentReactionState(
  commentIds: string[],
  userId?: string,
): Promise<Record<string, CommentReactionState>> {
  if (!commentIds.length) return {};

  const { data, error } = await supabase
    .from(TABLE)
    .select("comment_id,user_id,reaction_type")
    .in("comment_id", commentIds);

  if (error) throw error;

  const state: Record<string, CommentReactionState> = {};
  for (const row of data ?? []) {
    const type = String(row.reaction_type);
    if (!isSupportedReaction(type)) continue;
    state[row.comment_id] ??= { counts: {} };
    state[row.comment_id].counts[type] =
      (state[row.comment_id].counts[type] ?? 0) + 1;
    if (userId && row.user_id === userId) state[row.comment_id].mine = type;
  }

  return state;
}

export async function setCommentReaction(
  commentId: string,
  userId: string,
  reaction: ShortsCommentReaction,
): Promise<void> {
  const { data: existing, error: existingError } = await supabase
    .from(TABLE)
    .select("reaction_type")
    .eq("comment_id", commentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.reaction_type === reaction) {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  if (existing) {
    const { error } = await supabase
      .from(TABLE)
      .update({ reaction_type: reaction })
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from(TABLE).insert({
    comment_id: commentId,
    user_id: userId,
    reaction_type: reaction,
  });
  if (error) throw error;
}

export function subscribeToCommentReactions(
  commentIds: string[],
  onChange: (change: CommentReactionChange) => void,
) {
  if (!commentIds.length) return () => undefined;

  const channel = supabase
    .channel(`short-comment-reactions:${commentIds.join(",")}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>;
        if (!commentIds.includes(String(row.comment_id))) return;
        const reactionType = String(row.reaction_type ?? "");
        if (!isSupportedReaction(reactionType)) return;
        onChange({
          commentId: String(row.comment_id),
          userId: String(row.user_id),
          reactionType,
        });
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
