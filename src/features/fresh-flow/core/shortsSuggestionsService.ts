import { loadFreshFlowShorts } from "./loadFreshFlowShorts";
import { loadBlockedIds } from "./userBlocksService";
import { pickSuggestions, SUGGESTION_LIMIT } from "./shortsSuggestions";
import type { Short } from "../../shorts/types/short";

/** Live Shorts suggestions for the two Home screens. Throws only if the Shorts themselves cannot be loaded. */
export async function loadShortsSuggestions(userId: string | null, isGuest: boolean, limit = SUGGESTION_LIMIT): Promise<Short[]> {
  const signedIn = Boolean(userId) && !isGuest;
  const [{ shorts }, blockedIds] = await Promise.all([
    loadFreshFlowShorts(userId, isGuest),
    signedIn ? loadBlockedIds(userId as string) : Promise.resolve(new Set<string>()),
  ]);
  // The loader already marks Shorts from creators the viewer follows.
  const followingIds = new Set(shorts.filter((short) => short.isFollowingAuthor).map((short) => short.authorId));
  return pickSuggestions(shorts, { limit, blockedIds, followingIds });
}
