/**
 * Comment reactions for Fresh Shorts (specification 3.8). "like" stays the quick heart on each comment;
 * the other reactions open from a picker. The first group already exists in the database check
 * constraint; the second group needs migration 20261105100000_widen_short_comment_reactions.sql, and the
 * panel says so instead of failing silently when that migration has not been applied.
 */
export type CommentReactionType =
  | "like" | "love" | "laugh" | "wow" | "sad" | "fire" | "clap" | "support"
  | "curious" | "inspire" | "insightful" | "agree" | "disagree" | "helpful" | "question" | "respect";

export type CommentReactionDef = { type: CommentReactionType; emoji: string; label: string; needsMigration: boolean };

export const COMMENT_REACTIONS: CommentReactionDef[] = [
  { type: "love", emoji: "❤️", label: "Love", needsMigration: false },
  { type: "laugh", emoji: "😂", label: "Funny", needsMigration: false },
  { type: "wow", emoji: "😮", label: "Wow", needsMigration: false },
  { type: "sad", emoji: "😢", label: "Sad", needsMigration: false },
  { type: "fire", emoji: "🔥", label: "Fire", needsMigration: false },
  { type: "clap", emoji: "👏", label: "Applause", needsMigration: false },
  { type: "support", emoji: "🙌", label: "Support", needsMigration: false },
  { type: "curious", emoji: "🤔", label: "Curious", needsMigration: true },
  { type: "inspire", emoji: "✨", label: "Inspiring", needsMigration: true },
  { type: "insightful", emoji: "💡", label: "Insightful", needsMigration: true },
  { type: "agree", emoji: "👍", label: "Agree", needsMigration: true },
  { type: "disagree", emoji: "👎", label: "Disagree", needsMigration: true },
  { type: "helpful", emoji: "🤝", label: "Helpful", needsMigration: true },
  { type: "question", emoji: "❓", label: "Question", needsMigration: true },
  { type: "respect", emoji: "🙏", label: "Respect", needsMigration: true },
];

const BY_TYPE = new Map<string, CommentReactionDef>(COMMENT_REACTIONS.map((r) => [r.type, r]));

export function reactionDef(type: string): CommentReactionDef | null {
  return BY_TYPE.get(type) ?? null;
}

export type ReactionSummary = { counts: Record<string, number>; mine: string | null };

export function emptySummary(): ReactionSummary {
  return { counts: {}, mine: null };
}

/** Builds one summary per comment from raw reaction rows. */
export function summarizeReactions(rows: Array<{ comment_id: string; user_id: string; reaction_type: string }>, myUserId: string | null | undefined): Record<string, ReactionSummary> {
  const out: Record<string, ReactionSummary> = {};
  for (const row of rows) {
    const entry = out[row.comment_id] ?? (out[row.comment_id] = emptySummary());
    entry.counts[row.reaction_type] = (entry.counts[row.reaction_type] ?? 0) + 1;
    if (myUserId && row.user_id === myUserId) entry.mine = row.reaction_type;
  }
  return out;
}

/** Result of choosing `next` when the person currently has `summary.mine`: picking it again removes it. */
export function applyReactionChoice(summary: ReactionSummary, next: string): ReactionSummary {
  const counts = { ...summary.counts };
  const drop = (type: string | null) => {
    if (!type) return;
    const left = (counts[type] ?? 0) - 1;
    if (left > 0) counts[type] = left; else delete counts[type];
  };
  if (summary.mine === next) {
    drop(next);
    return { counts, mine: null };
  }
  drop(summary.mine);
  counts[next] = (counts[next] ?? 0) + 1;
  return { counts, mine: next };
}

/** Non-like reactions worth showing as chips, most used first. */
export function breakdownChips(summary: ReactionSummary): Array<{ type: string; emoji: string; label: string; count: number }> {
  return Object.entries(summary.counts)
    .filter(([type, count]) => type !== "like" && count > 0 && BY_TYPE.has(type))
    .map(([type, count]) => ({ type, emoji: BY_TYPE.get(type)!.emoji, label: BY_TYPE.get(type)!.label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** True when a database error means the reaction type is not allowed yet (migration not applied). */
export function isUnappliedReactionError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "23514" || /reaction_type_check|violates check constraint/i.test(error.message ?? "");
}
