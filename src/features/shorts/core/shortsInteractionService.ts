import { supabase } from "../../../lib/supabase";

export type CommentReaction =
  | "like" | "love" | "laugh" | "wow" | "celebrate" | "support"
  | "curious" | "inspire" | "insightful" | "agree" | "disagree"
  | "helpful" | "question" | "respect" | "fire" | "sad" | "angry";

export type RemixMode = "remix" | "duet";
export type RemixLayout = "side_by_side" | "top_bottom" | "overlay" | "sequence";
export type ImmersiveMode = "ar" | "vr" | "spatial";

export async function setShortCommentReaction(commentId: string, reaction: CommentReaction | null) {
  const { error } = await supabase.rpc("set_short_comment_reaction", {
    p_comment_id: commentId,
    p_reaction_type: reaction,
  });
  if (error) throw error;
}

export async function loadShortCommentReactions(commentIds: string[]) {
  if (!commentIds.length) return new Map<string, Record<string, number>>();

  const { data, error } = await supabase
    .from("short_comment_reaction_counts")
    .select("comment_id,reaction_type,reaction_count")
    .in("comment_id", commentIds);
  if (error) throw error;

  const result = new Map<string, Record<string, number>>();
  for (const row of data ?? []) {
    const current = result.get(row.comment_id) ?? {};
    current[row.reaction_type] = Number(row.reaction_count);
    result.set(row.comment_id, current);
  }
  return result;
}

export async function getMyShortCommentReactions(commentIds: string[], userId: string) {
  if (!commentIds.length) return new Map<string, string>();

  const { data, error } = await supabase
    .from("short_comment_reactions")
    .select("comment_id,reaction_type")
    .eq("user_id", userId)
    .in("comment_id", commentIds);
  if (error) throw error;

  return new Map((data ?? []).map((row) => [row.comment_id, row.reaction_type]));
}

export async function createShortRemix(input: {
  sourceShortId: string;
  remixShortId: string;
  creatorId: string;
  mode: RemixMode;
  layout?: RemixLayout;
  sourceStartMs?: number;
  sourceEndMs?: number;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("short_remixes")
    .insert({
      source_short_id: input.sourceShortId,
      remix_short_id: input.remixShortId,
      creator_id: input.creatorId,
      mode: input.mode,
      layout: input.layout ?? "side_by_side",
      source_start_ms: input.sourceStartMs ?? null,
      source_end_ms: input.sourceEndMs ?? null,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function startImmersiveSession(input: {
  shortId: string;
  userId: string;
  mode: ImmersiveMode;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase
    .from("short_immersive_sessions")
    .insert({
      short_id: input.shortId,
      user_id: input.userId,
      mode: input.mode,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function endImmersiveSession(sessionId: string) {
  const { error } = await supabase
    .from("short_immersive_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) throw error;
}
