/**
 * Fresh Flow — Media Operating Architecture
 *
 * Principle: Massive underneath. Minimal on the surface.
 *
 * Three layers (never all fully exposed at once):
 *   A · Media Director   — what am I consuming?
 *   B · Discovery Director — how is content selected?
 *   C · Content Experience — how do I interact?
 *
 * Design law: the interface must never expose the entire architecture
 * merely because the architecture exists. Controls appear contextually.
 */

export type FreshFlowMediaWorldId =
  | "short"
  | "long-videos"
  | "news-posts"
  | "vr-ar"
  | "podcasts"
  | "others";

/** App route ids kept stable for routing / deep links. */
export type FreshFlowRouteId =
  | "fresh-flow"
  | "fresh-flow-long-videos"
  | "fresh-flow-news-posts"
  | "fresh-flow-ar-vr"
  | "fresh-flow-podcasts"
  | "fresh-flow-more";

export type FreshFlowExperienceMode =
  | "watch"
  | "read"
  | "listen"
  | "explore"
  | "enter"
  | "create"
  | "share"
  | "save"
  | "interact";

export type FreshFlowUniversalService =
  | "search"
  | "voice"
  | "translate"
  | "share"
  | "save"
  | "history"
  | "follow"
  | "notifications"
  | "ai";

export type DiscoveryMode = {
  id: string;
  label: string;
  description?: string;
};

export type MediaWorld = {
  id: FreshFlowMediaWorldId;
  routeId: FreshFlowRouteId;
  label: string;
  shortLabel: string;
  icon: string;
  /** Primary experience modes for this world. */
  experience: FreshFlowExperienceMode[];
  /** Discovery director chips (Layer B). */
  discovery: DiscoveryMode[];
  description: string;
  /** Surface UX: immersive vertical, cinematic, information, environment, audio, emerging. */
  surface: "immersive-vertical" | "cinematic" | "information" | "environment" | "audio-first" | "emerging";
};

export const FRESH_FLOW_UNIVERSAL_SERVICES: Array<{
  id: FreshFlowUniversalService;
  label: string;
}> = [
  { id: "search", label: "Search" },
  { id: "voice", label: "Voice" },
  { id: "translate", label: "Translate" },
  { id: "share", label: "Share" },
  { id: "save", label: "Save" },
  { id: "history", label: "History" },
  { id: "follow", label: "Follow" },
  { id: "notifications", label: "Notifications" },
  { id: "ai", label: "Fresh AI" },
];

export const FRESH_FLOW_MEDIA_WORLDS: MediaWorld[] = [
  {
    id: "short",
    routeId: "fresh-flow",
    label: "Fresh Short",
    shortLabel: "Short",
    icon: "⚡",
    surface: "immersive-vertical",
    experience: ["watch", "interact", "share", "save", "create"],
    description: "Immersive vertical content environment — the default entry experience.",
    discovery: [
      { id: "for-you", label: "For You" },
      { id: "following", label: "Following" },
      { id: "trending", label: "Trending" },
      { id: "learn", label: "Learn" },
      { id: "relax", label: "Relax" },
      { id: "more", label: "More" },
    ],
  },
  {
    id: "long-videos",
    routeId: "fresh-flow-long-videos",
    label: "Long Videos",
    shortLabel: "Long",
    icon: "▶",
    surface: "cinematic",
    experience: ["watch", "save", "share", "create"],
    description: "Cinematic structured player — movies, docs, courses, live.",
    discovery: [
      { id: "discover", label: "Discover" },
      { id: "following", label: "Following" },
      { id: "trending", label: "Trending" },
      { id: "learn", label: "Learn" },
      { id: "entertainment", label: "Entertainment" },
      { id: "documentaries", label: "Documentaries" },
      { id: "live", label: "Live" },
      { id: "more", label: "More" },
    ],
  },
  {
    id: "news-posts",
    routeId: "fresh-flow-news-posts",
    label: "News / Posts",
    shortLabel: "News",
    icon: "☰",
    surface: "information",
    experience: ["read", "share", "save", "interact"],
    description: "Information layer — reported news and community posts kept distinct.",
    discovery: [
      { id: "news", label: "News" },
      { id: "posts", label: "Posts" },
      { id: "following", label: "Following" },
      { id: "trending", label: "Trending" },
      { id: "local", label: "Local" },
      { id: "global", label: "Global" },
      { id: "topics", label: "Topics" },
      { id: "more", label: "More" },
    ],
  },
  {
    id: "vr-ar",
    routeId: "fresh-flow-ar-vr",
    label: "VR / AR",
    shortLabel: "VR/AR",
    icon: "⬡",
    surface: "environment",
    experience: ["enter", "explore", "interact", "create"],
    description: "Enter environments — UI recedes once the experience begins.",
    discovery: [
      { id: "vr", label: "VR" },
      { id: "ar", label: "AR" },
      { id: "immersive", label: "Immersive" },
      { id: "360", label: "360°" },
      { id: "experiences", label: "Experiences" },
      { id: "spaces", label: "Spaces" },
      { id: "more", label: "More" },
    ],
  },
  {
    id: "podcasts",
    routeId: "fresh-flow-podcasts",
    label: "Podcasts",
    shortLabel: "Audio",
    icon: "🎙",
    surface: "audio-first",
    experience: ["listen", "save", "share"],
    description: "Audio-first playback — continues while navigating when appropriate.",
    discovery: [
      { id: "discover", label: "Discover" },
      { id: "following", label: "Following" },
      { id: "trending", label: "Trending" },
      { id: "episodes", label: "Episodes" },
      { id: "shows", label: "Shows" },
      { id: "live", label: "Live" },
      { id: "downloads", label: "Downloads" },
      { id: "more", label: "More" },
    ],
  },
  {
    id: "others",
    routeId: "fresh-flow-more",
    label: "Others",
    shortLabel: "More",
    icon: "▦",
    surface: "emerging",
    experience: ["explore", "interact", "create", "share"],
    description: "Emerging media layer — new formats without breaking the architecture.",
    discovery: [
      { id: "music", label: "Music" },
      { id: "images", label: "Images" },
      { id: "stories", label: "Stories" },
      { id: "gifs", label: "GIFs" },
      { id: "live", label: "Live" },
      { id: "interactive", label: "Interactive" },
      { id: "experiences", label: "Experiences" },
      { id: "emerging", label: "Emerging" },
    ],
  },
];

export function worldByRouteId(routeId: string | null | undefined): MediaWorld {
  const found = FRESH_FLOW_MEDIA_WORLDS.find((w) => w.routeId === routeId);
  return found ?? FRESH_FLOW_MEDIA_WORLDS[0];
}

export function worldById(id: FreshFlowMediaWorldId): MediaWorld {
  return FRESH_FLOW_MEDIA_WORLDS.find((w) => w.id === id) ?? FRESH_FLOW_MEDIA_WORLDS[0];
}

/** Layer visibility policy — surface stays minimal. */
export type LayerVisibility = {
  /** Media Director (Flow Switch) — summoned, not permanent chrome. */
  mediaDirector: "hidden" | "summoned";
  /** Discovery chips — after content is established (e.g. Short after ~5s). */
  discovery: "hidden" | "contextual";
  /** Interaction controls — collapse when idle. */
  interaction: "hidden" | "contextual";
};

export function defaultLayerVisibility(args: {
  immersiveContent: boolean;
  contentSettled: boolean;
  flowSwitchOpen: boolean;
}): LayerVisibility {
  if (args.flowSwitchOpen) {
    return { mediaDirector: "summoned", discovery: "hidden", interaction: "hidden" };
  }
  if (args.immersiveContent && !args.contentSettled) {
    return { mediaDirector: "hidden", discovery: "hidden", interaction: "hidden" };
  }
  if (args.immersiveContent && args.contentSettled) {
    return { mediaDirector: "hidden", discovery: "contextual", interaction: "contextual" };
  }
  return { mediaDirector: "hidden", discovery: "contextual", interaction: "contextual" };
}
