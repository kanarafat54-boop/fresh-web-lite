import { rankFreshFlow } from "./FreshFlowRanking.ts";
import type { Short } from "../../shorts/types/short.ts";

export const SUGGESTION_LIMIT = 8;

type Options = {
  limit?: number;
  /** Authors the viewer blocked: never suggested. */
  blockedIds?: ReadonlySet<string>;
  /** Short ids to leave out (for example ones already on screen). */
  exclude?: ReadonlySet<string>;
  /** Authors the viewer follows: their Shorts are placed first, up to half of the row. */
  followingIds?: ReadonlySet<string>;
};

/**
 * Choose the Shorts to suggest on the Fresh Web Lite Home and the Fresh Flow Home.
 *
 * Honest and simple: Shorts without a playable video and blocked creators are dropped, the rest are ranked by the
 * same Fresh Flow discovery ranking the For You feed uses (recent, not yet over-viewed, one creator never dominates),
 * and Shorts from creators the viewer follows lead the row but never fill more than half of it, so discovery stays
 * open. No Short appears twice. This is not a personalised model: there is no taste profile behind it.
 */
export function pickSuggestions(shorts: readonly Short[], options: Options = {}): Short[] {
  const limit = Math.max(1, options.limit ?? SUGGESTION_LIMIT);
  const seen = new Set<string>();
  const usable = shorts.filter((short) => {
    if (!short?.id || seen.has(short.id)) return false;
    seen.add(short.id);
    if (!short.videoUrl) return false;
    if (options.exclude?.has(short.id)) return false;
    if (options.blockedIds?.has(short.authorId)) return false;
    return true;
  });
  const ranked = rankFreshFlow(usable);
  const following = options.followingIds;
  if (!following || following.size === 0) return ranked.slice(0, limit);
  const fromFollowed = ranked.filter((short) => following.has(short.authorId)).slice(0, Math.floor(limit / 2));
  const lead = new Set(fromFollowed.map((short) => short.id));
  const rest = ranked.filter((short) => !lead.has(short.id));
  return [...fromFollowed, ...rest].slice(0, limit);
}
