/**
 * "Why am I seeing this?" for a Short (spec 11.4).
 *
 * Every reason here is derived from a signal Fresh really has for this viewer and this Short: the tab they
 * are on, whether they follow the creator, hashtags that match their saved interests, and topics or creators
 * from their own watch history that the ranking actually uses. If none apply, the answer says so instead of
 * inventing a reason.
 */
export type WhyReason = { id: string; text: string };

export type WhyInput = {
  tab: string;
  signedIn: boolean;
  isFollowingAuthor: boolean;
  isHot: boolean;
  hashtags: string[];
  interests: string[];
  showLessTopics: string[];
  /** Taste weights from the viewer's own history (positive = liked more). */
  authorWeight: number | null;
  topicWeights: Record<string, number>;
  authorName: string;
};

const TAB_REASONS: Record<string, string> = {
  following: "You are on the Following tab, which shows Shorts from creators you follow.",
  trending: "You are on the Trending tab, which shows Shorts getting a lot of attention right now.",
  learn: "You are on the Learn tab, which shows Shorts about learning and how-to topics.",
  relax: "You are on the Relax tab, which shows calmer Shorts.",
};

export function explainShort(input: WhyInput): WhyReason[] {
  const reasons: WhyReason[] = [];
  const tabReason = TAB_REASONS[input.tab];
  if (tabReason) reasons.push({ id: "tab", text: tabReason });

  if (input.isFollowingAuthor) reasons.push({ id: "following", text: `You follow ${input.authorName}.` });

  const tags = input.hashtags.map((t) => t.toLowerCase());
  const matchedInterests = input.interests.map((t) => t.toLowerCase()).filter((t) => tags.includes(t));
  if (matchedInterests.length) reasons.push({ id: "interests", text: `You asked for more of ${matchedInterests.slice(0, 3).map((t) => `#${t}`).join(", ")}, and this Short uses ${matchedInterests.length > 1 ? "those tags" : "that tag"}.` });

  if (input.signedIn && input.authorWeight !== null && input.authorWeight > 0) {
    reasons.push({ id: "author-history", text: `You have watched or liked other Shorts by ${input.authorName}.` });
  }
  const liked = tags.filter((t) => (input.topicWeights[t] ?? 0) > 0);
  if (input.signedIn && liked.length) reasons.push({ id: "topic-history", text: `You have engaged with ${liked.slice(0, 3).map((t) => `#${t}`).join(", ")} before.` });

  if (input.isHot && input.tab !== "trending") reasons.push({ id: "hot", text: "Many people are watching and reacting to it right now." });

  if (reasons.length === 0) {
    reasons.push({
      id: "general",
      text: input.signedIn
        ? "Fresh has no specific signal about you for this Short. It is part of the general mix for this tab."
        : "You are not signed in, so this is part of the general mix. Sign in to see recommendations shaped by what you watch.",
    });
  }
  return reasons;
}

/** Hashtags the viewer asked to see less of that this Short uses, so the sheet can point to the control. */
export function mutedOverlap(input: Pick<WhyInput, "hashtags" | "showLessTopics">): string[] {
  const tags = input.hashtags.map((t) => t.toLowerCase());
  return input.showLessTopics.map((t) => t.toLowerCase()).filter((t) => tags.includes(t));
}
