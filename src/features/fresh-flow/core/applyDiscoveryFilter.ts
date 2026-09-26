/**
 * Layer B — Discovery Director wiring.
 * Maps architecture discovery ids to real feed filters without inventing content.
 */

export type MediaKind = "long-videos" | "ar-vr" | "podcasts" | "others";

export type DiscoverablePost = {
  id: string;
  authorId: string;
  content: string;
  videoUrl: string | null;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
};

/** Keyword / structure matchers for discovery modes (client-side, soft filter). */
const DISCOVERY_KEYWORDS: Record<string, RegExp[]> = {
  discover: [],
  following: [],
  trending: [],
  learn: [/\blearn\b|\btutorial\b|\bcourse\b|\bhow to\b|\beducation\b|\blesson\b/i],
  entertainment: [/\bentertain\b|\bmovie\b|\bfilm\b|\bcomedy\b|\bseries\b|\bshow\b/i],
  documentaries: [/\bdoc(umentary)?\b|\bdocs?\b|\bnon[- ]?fiction\b/i],
  live: [/\blive\b|\bstream\b|\bbroadcast\b/i],
  more: [],
  vr: [/\bvr\b|\bvirtual reality\b|\b360\b/i],
  ar: [/\bar\b|\baugmented reality\b/i],
  immersive: [/\bimmersive\b|\bspatial\b|\bmetaverse\b/i],
  "360": [/\b360\b|\bequirectangular\b/i],
  experiences: [/\bexperience\b|\bworld\b|\bspace\b/i],
  spaces: [/\bspace\b|\broom\b|\bvenue\b/i],
  episodes: [/\bepisode\b|\bep\.\b|\bep\s*\d/i],
  shows: [/\bshow\b|\bseries\b|\bpodcast\b/i],
  downloads: [],
  music: [/\bmusic\b|\bsong\b|\btrack\b|\balbum\b|\b#music\b/i],
  images: [],
  stories: [/\bstory\b|\bstories\b|\breel\b/i],
  gifs: [/\bgif\b|\.gif\b/i],
  interactive: [/\binteractive\b|\bgame\b|\bquiz\b/i],
  emerging: [/\bai[- ]?gen|\bexperimental\b|\bbeta\b/i],
  news: [/\bnews\b|\bbreaking\b|\breport\b|\bheadline\b/i],
  posts: [],
  local: [/\blocal\b|\bnearby\b|\bcity\b|\bcountry\b/i],
  global: [/\bglobal\b|\bworld\b|\binternational\b/i],
  topics: [],
  relax: [/\brelax\b|\bcalm\b|\bambient\b|\bsleep\b|\bchill\b/i],
};

function engagementScore(p: DiscoverablePost): number {
  return (p.likeCount ?? 0) * 3 + (p.commentCount ?? 0) * 5;
}

/**
 * Apply Layer B discovery filter to an already kind-filtered list.
 * Soft fallthrough: if keyword match is empty, keep the kind list so the rail never blanks the world.
 */
export function applyDiscoveryFilter(
  posts: DiscoverablePost[],
  discoveryId: string | undefined,
  options?: { followingAuthorIds?: Set<string> },
): DiscoverablePost[] {
  if (!discoveryId || discoveryId === "discover" || discoveryId === "more" || discoveryId === "posts") {
    return posts;
  }

  if (discoveryId === "following") {
    const ids = options?.followingAuthorIds;
    if (!ids || ids.size === 0) return [];
    return posts.filter((p) => ids.has(p.authorId));
  }

  if (discoveryId === "trending") {
    return [...posts].sort((a, b) => engagementScore(b) - engagementScore(a));
  }

  if (discoveryId === "images") {
    return posts.filter((p) => Boolean(p.imageUrl) && !p.videoUrl);
  }

  if (discoveryId === "downloads") {
    return posts;
  }

  const patterns = DISCOVERY_KEYWORDS[discoveryId];
  if (!patterns || patterns.length === 0) return posts;

  const matched = posts.filter((p) => {
    const text = `${p.content ?? ""}`;
    return patterns.some((re) => re.test(text));
  });
  return matched.length > 0 ? matched : posts;
}

export function matchesMediaKind(
  post: Pick<DiscoverablePost, "content" | "videoUrl" | "imageUrl">,
  kind: MediaKind,
): boolean {
  const text = (post.content ?? "").toLowerCase();
  if (kind === "long-videos") return Boolean(post.videoUrl);
  if (kind === "podcasts") return /#podcast\b|#podcasts\b|podcast/.test(text);
  if (kind === "ar-vr") return /#ar\b|#vr\b|ar\/vr|augmented reality|virtual reality|immersive|360/.test(text);
  return Boolean(post.videoUrl || post.imageUrl);
}
