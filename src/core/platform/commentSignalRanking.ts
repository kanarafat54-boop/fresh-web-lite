/**
 * Domain expertise / signal-value comment ranking.
 * Fits: Comments panel · Fresh Flow · Connect hubs.
 *
 * Score is not pure upvotes. It combines author badges, channel contribution,
 * and optional LLM context relevance. Pure client ranking is available now;
 * badge/LLM adapters plug in without changing the comment data model.
 */

export type AuthorBadge =
  | "verified_engineer"
  | "verified_artist"
  | "channel_top_contributor"
  | "moderator"
  | "verified"
  | "member";

export type CommentSignalInput = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  /** Legacy upvote-style engagement if present */
  upvotes?: number;
  badges?: AuthorBadge[];
  /** 0..1 relevance of comment text to content topic (from LLM classifier when available) */
  contextRelevance?: number;
  /** Channel contribution depth 0..1 */
  contributorScore?: number;
};

export type RankedComment = CommentSignalInput & {
  signalValue: number;
};

const BADGE_WEIGHT: Record<AuthorBadge, number> = {
  verified_engineer: 0.28,
  verified_artist: 0.22,
  channel_top_contributor: 0.3,
  moderator: 0.18,
  verified: 0.12,
  member: 0.04,
};

function badgeBoost(badges: AuthorBadge[] = []): number {
  if (!badges.length) return BADGE_WEIGHT.member;
  return Math.min(1, badges.reduce((sum, b) => sum + (BADGE_WEIGHT[b] ?? 0), 0));
}

function recencyBoost(iso: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (ageHours < 1) return 1;
  if (ageHours < 24) return 0.85;
  if (ageHours < 168) return 0.55;
  return 0.3;
}

/**
 * signalValue =
 *   0.35·badge + 0.25·contextRelevance + 0.20·contributor + 0.10·upvoteNorm + 0.10·recency
 */
export function scoreCommentSignal(input: CommentSignalInput): number {
  const badge = badgeBoost(input.badges);
  const context = Math.max(0, Math.min(1, input.contextRelevance ?? 0.4));
  const contributor = Math.max(0, Math.min(1, input.contributorScore ?? 0.2));
  const upvoteNorm = Math.max(0, Math.min(1, Math.log10(1 + (input.upvotes ?? 0)) / 3));
  const recency = recencyBoost(input.createdAt);
  return 0.35 * badge + 0.25 * context + 0.2 * contributor + 0.1 * upvoteNorm + 0.1 * recency;
}

export function rankCommentsBySignal(comments: CommentSignalInput[]): RankedComment[] {
  return comments
    .map((c) => ({ ...c, signalValue: scoreCommentSignal(c) }))
    .sort((a, b) => b.signalValue - a.signalValue);
}

/** Preserve tree order among siblings while ranking roots by signal. */
export function rankRootsBySignal<T extends { id: string; parent_id?: string | null; created_at: string; author_id: string; content?: string | null }>(
  roots: T[],
  badgeMap?: Map<string, AuthorBadge[]>,
): Array<T & { signalValue: number }> {
  const inputs: CommentSignalInput[] = roots.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    content: r.content ?? "",
    createdAt: r.created_at,
    badges: badgeMap?.get(r.author_id),
  }));
  const ranked = rankCommentsBySignal(inputs);
  const scoreById = new Map(ranked.map((r) => [r.id, r.signalValue]));
  return [...roots]
    .map((r) => ({ ...r, signalValue: scoreById.get(r.id) ?? 0 }))
    .sort((a, b) => b.signalValue - a.signalValue);
}
