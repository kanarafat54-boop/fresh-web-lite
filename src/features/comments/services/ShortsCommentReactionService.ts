import { supabase } from "../../../lib/supabase";

export const SHORT_COMMENT_REACTIONS = [
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
] as const;

export type ShortCommentReaction = (typeof SHORT_COMMENT_REACTIONS)[number];

export interface CommentReactionState {
  reaction: ShortCommentReaction | null;
  counts: Partial<Record<ShortCommentReaction, number>>;
}

export type CommentReactionStateMap = Record<string, CommentReactionState>;

type ReactionRow = { comment_id: string; reaction_type: string; user_id: string };

function isReaction(value: string): value is ShortCommentReaction {
  return (SHORT_COMMENT_REACTIONS as readonly string[]).includes(value);
}

function emptyState(): CommentReactionState {
  return { reaction: null, counts: {} };
}

function normalizeCounts(rows: Array<{ reaction_type: string }>): Partial<Record<ShortCommentReaction, number>> {
  const counts: Partial<Record<ShortCommentReaction, number>> = {};
  for (const row of rows) {
    if (isReaction(row.reaction_type)) counts[row.reaction_type] = (counts[row.reaction_type] ?? 0) + 1;
  }
  return counts;
}

export async function getCommentReactionStates(commentIds: string[], userId?: string | null): Promise<CommentReactionStateMap> {
  const ids = [...new Set(commentIds.filter(Boolean))];
  const states: CommentReactionStateMap = Object.fromEntries(ids.map((id) => [id, emptyState()]));
  if (!ids.length) return states;

  const { data, error } = await supabase
    .from("short_comment_reactions")
    .select("comment_id,reaction_type,user_id")
    .in("comment_id", ids);

  if (error) throw error;

  const grouped = new Map<string, ReactionRow[]>();
  for (const raw of (data ?? []) as ReactionRow[]) {
    if (!grouped.has(raw.comment_id)) grouped.set(raw.comment_id, []);
    grouped.get(raw.comment_id)!.push(raw);
  }

  for (const id of ids) {
    const rows = grouped.get(id) ?? [];
    states[id] = {
      reaction: userId
        ? rows.find((row) => row.user_id === userId && isReaction(row.reaction_type))?.reaction_type ?? null
        : null,
      counts: normalizeCounts(rows),
    };
  }

  return states;
}

export async function getCommentReactionState(commentId: string, userId?: string | null): Promise<CommentReactionState> {
  const states = await getCommentReactionStates([commentId], userId);
  return states[commentId] ?? emptyState();
}

export async function setCommentReaction(
  commentId: string,
  userId: string,
  reaction: ShortCommentReaction,
): Promise<CommentReactionState> {
  const { error: upsertError } = await supabase.from("short_comment_reactions").upsert(
    { comment_id: commentId, user_id: userId, reaction_type: reaction },
    { onConflict: "comment_id,user_id" },
  );
  if (upsertError) throw upsertError;
  return getCommentReactionState(commentId, userId);
}

export async function clearCommentReaction(commentId: string, userId: string): Promise<CommentReactionState> {
  const { error } = await supabase
    .from("short_comment_reactions")
    .delete()
    .eq("comment_id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
  return getCommentReactionState(commentId, userId);
}

export async function toggleCommentReaction(
  commentId: string,
  userId: string,
  reaction: ShortCommentReaction,
): Promise<CommentReactionState> {
  const current = await getCommentReactionState(commentId, userId);
  if (current.reaction === reaction) return clearCommentReaction(commentId, userId);
  return setCommentReaction(commentId, userId, reaction);
}
