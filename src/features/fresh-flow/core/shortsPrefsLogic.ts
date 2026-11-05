/** Pure helpers for Shorts recommendation controls (spec section 7). No network, unit-testable. */

export type ShortPrefs = {
  interests: string[];
  mutedTopics: string[];
  mutedCreators: string[];
  showLessTopics: string[];
  /** Watch history older than this no longer shapes the taste profile (reset without deleting events). */
  tasteResetAt: string | null;
};

export const EMPTY_PREFS: ShortPrefs = { interests: [], mutedTopics: [], mutedCreators: [], showLessTopics: [], tasteResetAt: null };

export function hashtagsOf(caption: string): string[] {
  return [...new Set([...caption.matchAll(/#([\p{L}\p{N}_]+)/gu)].map((m) => m[1].toLowerCase()))];
}

type Rankable = { authorId: string; caption: string };

/**
 * Hides muted creators/topics, then stably moves "show more" topics up and "show less" topics down.
 * Order inside each group is unchanged, so the underlying ranking still decides everything else.
 */
export function applyShortPrefs<T extends Rankable>(shorts: readonly T[], prefs: ShortPrefs): T[] {
  const mutedTopics = new Set(prefs.mutedTopics);
  const mutedCreators = new Set(prefs.mutedCreators);
  const more = new Set(prefs.interests);
  const less = new Set(prefs.showLessTopics);
  const visible = shorts.filter((short) => {
    if (mutedCreators.has(short.authorId)) return false;
    return !hashtagsOf(short.caption).some((tag) => mutedTopics.has(tag));
  });
  const score = (short: T) => {
    const tags = hashtagsOf(short.caption);
    if (tags.some((tag) => more.has(tag))) return 0;
    if (tags.some((tag) => less.has(tag))) return 2;
    return 1;
  };
  return visible.map((short, index) => ({ short, index, score: score(short) })).sort((a, b) => a.score - b.score || a.index - b.index).map((entry) => entry.short);
}

export function addUnique(list: readonly string[], values: readonly string[]): string[] {
  return [...new Set([...list, ...values])];
}

export function removeValue(list: readonly string[], value: string): string[] {
  return list.filter((item) => item !== value);
}
