/**
 * Fresh Flow — independent media system registry.
 *
 * Family grouping is for discovery/navigation only. Every registered system
 * owns a distinct product experience and contract. This metadata is not a
 * route implementation, provider integration, feature flag, or authorization.
 * Server APIs must independently authorize every operation.
 */

export type FreshFlowSystemFamilyId =
  | "video-broadcast"
  | "social-community"
  | "audio"
  | "reading-knowledge"
  | "visual-immersive"
  | "creation-participation";

export type FreshFlowSystemStatus = "planned" | "partial" | "provider-required" | "device-required" | "verified";

export type FreshFlowIndependentSystem = {
  /** Stable, URL-safe product identifier. */
  id: string;
  label: string;
  family: FreshFlowSystemFamilyId;
  /** Proposed canonical path; it must not be treated as registered routing yet. */
  routePath: string;
  description: string;
  /** Every system gets its own UI and user journeys. */
  experienceBoundary: "independent";
  /** Proposed until implementation evidence is recorded. */
  status: FreshFlowSystemStatus;
  capabilities: string[];
};

export const FRESH_FLOW_SYSTEM_FAMILIES: Array<{
  id: FreshFlowSystemFamilyId;
  label: string;
  description: string;
}> = [
  { id: "video-broadcast", label: "Video & Broadcast", description: "Short-form, long-form, film/TV, live broadcasts and sports." },
  { id: "social-community", label: "Social & Community", description: "Publishing, groups, temporary updates and creator-owned channels." },
  { id: "audio", label: "Audio", description: "Music, podcasts, audio-first live experiences and audiobooks." },
  { id: "reading-knowledge", label: "Reading, Knowledge & Publishing", description: "News, books, structured learning and research." },
  { id: "visual-immersive", label: "Visual & Immersive Media", description: "Images, spatial experiences, interactive media and gaming." },
  { id: "creation-participation", label: "Creation & Participation", description: "Recorded-media production, live production and events." },
];

export const FRESH_FLOW_INDEPENDENT_SYSTEMS: FreshFlowIndependentSystem[] = [
  { id: "fresh-shorts", label: "Fresh Shorts", family: "video-broadcast", routePath: "/fresh-flow/shorts", description: "Immersive short-video discovery, playback, social interaction and creation entry points.", experienceBoundary: "independent", status: "planned", capabilities: ["short-video", "immersive-player", "discovery", "social-interactions", "creator-publishing"] },
  { id: "long-video", label: "Long Video", family: "video-broadcast", routePath: "/fresh-flow/long-video", description: "Long-form playback, channels, playlists, chapters, history and recommendations.", experienceBoundary: "independent", status: "planned", capabilities: ["long-video", "adaptive-playback", "channels", "playlists", "watch-history"] },
  { id: "movies-series", label: "Movies & Series", family: "video-broadcast", routePath: "/fresh-flow/movies-series", description: "Structured films and television with seasons, episodes, watchlists and rights-aware playback.", experienceBoundary: "independent", status: "planned", capabilities: ["film-catalog", "series-catalog", "episodes", "watchlists", "rights-management"] },
  { id: "fresh-live", label: "Fresh Live", family: "video-broadcast", routePath: "/fresh-flow/live", description: "Viewer-facing audiovisual broadcasts, chat, co-hosts, moderation and reconnect flows.", experienceBoundary: "independent", status: "planned", capabilities: ["live-video", "live-chat", "co-hosting", "moderation", "reconnect"] },
  { id: "sports-events", label: "Sports & Events", family: "video-broadcast", routePath: "/fresh-flow/sports-events", description: "Sports discovery, schedules, highlights, fan experiences and rights-aware event streams.", experienceBoundary: "independent", status: "planned", capabilities: ["sports-discovery", "schedules", "highlights", "fan-experience", "rights-management"] },
  { id: "fresh-posts", label: "Fresh Posts", family: "social-community", routePath: "/fresh-flow/posts", description: "Social text and media publishing, discussions, links and feed interactions.", experienceBoundary: "independent", status: "planned", capabilities: ["text-posts", "image-posts", "carousels", "links", "comments"] },
  { id: "communities", label: "Communities", family: "social-community", routePath: "/fresh-flow/communities", description: "Member-led groups, forums, roles, topic discovery and moderation.", experienceBoundary: "independent", status: "planned", capabilities: ["groups", "forums", "memberships", "roles", "moderation"] },
  { id: "stories", label: "Stories", family: "social-community", routePath: "/fresh-flow/stories", description: "Sequential, time-limited updates with audience, privacy and expiry controls.", experienceBoundary: "independent", status: "planned", capabilities: ["temporary-media", "sequences", "audience-controls", "expiry"] },
  { id: "creator-channels", label: "Creator Channels", family: "social-community", routePath: "/fresh-flow/creator-channels", description: "Creator-owned publishing destinations, collections and supported audience relationships.", experienceBoundary: "independent", status: "planned", capabilities: ["creator-pages", "collections", "subscriptions", "memberships"] },
  { id: "fresh-music", label: "Fresh Music", family: "audio", routePath: "/fresh-flow/music", description: "Music catalog, artist and album pages, playlists, discovery and playback.", experienceBoundary: "independent", status: "planned", capabilities: ["music-catalog", "artists", "albums", "playlists", "audio-playback"] },
  { id: "fresh-podcasts", label: "Fresh Podcasts", family: "audio", routePath: "/fresh-flow/podcasts", description: "Shows, episodes, subscriptions, queues and listening progress.", experienceBoundary: "independent", status: "planned", capabilities: ["podcast-shows", "episodes", "subscriptions", "queues", "playback-progress"] },
  { id: "radio-audio-live", label: "Radio & Audio Live", family: "audio", routePath: "/fresh-flow/radio-audio-live", description: "Radio stations, audio-first live rooms and real-time audio broadcasts.", experienceBoundary: "independent", status: "planned", capabilities: ["radio-stations", "audio-live", "audio-rooms", "audio-playback"] },
  { id: "audiobooks", label: "Audiobooks", family: "audio", routePath: "/fresh-flow/audiobooks", description: "Spoken books, chapters, bookmarks, playback progress and libraries.", experienceBoundary: "independent", status: "planned", capabilities: ["spoken-books", "chapters", "bookmarks", "listening-progress"] },
  { id: "fresh-news", label: "Fresh News", family: "reading-knowledge", routePath: "/fresh-flow/news", description: "Publisher/source-aware news discovery, attribution, topic pages and context.", experienceBoundary: "independent", status: "planned", capabilities: ["news-publishers", "source-attribution", "topics", "corrections", "news-discovery"] },
  { id: "books-reading", label: "Books & Reading", family: "reading-knowledge", routePath: "/fresh-flow/books-reading", description: "Digital books, comics, magazines, reading views, bookmarks and progress.", experienceBoundary: "independent", status: "planned", capabilities: ["ebooks", "comics", "magazines", "bookmarks", "reading-progress"] },
  { id: "learn", label: "Learn", family: "reading-knowledge", routePath: "/fresh-flow/learn", description: "Structured lessons, courses, tutorials, assessments and learning progress.", experienceBoundary: "independent", status: "planned", capabilities: ["courses", "lessons", "tutorials", "assessments", "learning-progress"] },
  { id: "research-knowledge", label: "Research & Knowledge", family: "reading-knowledge", routePath: "/fresh-flow/research-knowledge", description: "Research discovery, source-backed explainers, evidence collections and references.", experienceBoundary: "independent", status: "planned", capabilities: ["research-search", "sources", "evidence-collections", "references", "knowledge-organization"] },
  { id: "images-art", label: "Images & Art", family: "visual-immersive", routePath: "/fresh-flow/images-art", description: "Photography, illustration, galleries, portfolios and visual collections.", experienceBoundary: "independent", status: "planned", capabilities: ["images", "illustration", "galleries", "portfolios", "collections"] },
  { id: "vr-ar-spatial", label: "VR / AR / Spatial", family: "visual-immersive", routePath: "/fresh-flow/vr-ar-spatial", description: "Virtual, augmented and spatial experiences with device checks and fallbacks.", experienceBoundary: "independent", status: "planned", capabilities: ["vr", "ar", "spatial-scenes", "device-detection", "2d-fallback"] },
  { id: "interactive-experiences", label: "Interactive Experiences", family: "visual-immersive", routePath: "/fresh-flow/interactive-experiences", description: "Branching narratives, interactive media and participatory experiences.", experienceBoundary: "independent", status: "planned", capabilities: ["branching-narratives", "interactive-media", "participation", "safe-execution"] },
  { id: "gaming-esports", label: "Gaming & Esports", family: "visual-immersive", routePath: "/fresh-flow/gaming-esports", description: "Game discovery, esports, game-related media, streams and communities.", experienceBoundary: "independent", status: "planned", capabilities: ["game-discovery", "esports", "gaming-media", "streams", "communities"] },
  { id: "fresh-studio", label: "Fresh Studio", family: "creation-participation", routePath: "/fresh-flow/studio", description: "Cross-system recording/import, editing, captions, drafts, rights, scheduling and publishing.", experienceBoundary: "independent", status: "planned", capabilities: ["media-library", "recording", "editing", "captions", "drafts", "publishing"] },
  { id: "live-creation", label: "Live Creation", family: "creation-participation", routePath: "/fresh-flow/live-creation", description: "Creator-side live production control room for setup, scenes, guests, moderation and stream health.", experienceBoundary: "independent", status: "planned", capabilities: ["broadcast-setup", "scenes", "guests", "live-moderation", "stream-health"] },
  { id: "events-performances", label: "Events & Performances", family: "creation-participation", routePath: "/fresh-flow/events-performances", description: "Non-sports events, performances, premieres, registration and audience participation.", experienceBoundary: "independent", status: "planned", capabilities: ["event-listings", "performances", "premieres", "registration", "audience-participation"] },
];

export function getFreshFlowSystem(id: string): FreshFlowIndependentSystem | undefined {
  return FRESH_FLOW_INDEPENDENT_SYSTEMS.find((system) => system.id === id);
}

export function getFreshFlowSystemsByFamily(family: FreshFlowSystemFamilyId): FreshFlowIndependentSystem[] {
  return FRESH_FLOW_INDEPENDENT_SYSTEMS.filter((system) => system.family === family);
}

export function validateFreshFlowSystemRegistry(): string[] {
  const errors: string[] = [];
  const familyIds = new Set(FRESH_FLOW_SYSTEM_FAMILIES.map((family) => family.id));
  const systemIds = new Set<string>();
  const routePaths = new Set<string>();

  if (FRESH_FLOW_SYSTEM_FAMILIES.length !== 6) errors.push("Fresh Flow must have exactly six system families");
  if (FRESH_FLOW_INDEPENDENT_SYSTEMS.length !== 24) errors.push("Fresh Flow must register exactly 24 independent systems");

  for (const system of FRESH_FLOW_INDEPENDENT_SYSTEMS) {
    if (systemIds.has(system.id)) errors.push(`duplicate system id: ${system.id}`);
    systemIds.add(system.id);
    if (!familyIds.has(system.family)) errors.push(`unknown family for system ${system.id}: ${system.family}`);
    if (routePaths.has(system.routePath)) errors.push(`duplicate proposed route path: ${system.routePath}`);
    routePaths.add(system.routePath);
    if (system.experienceBoundary !== "independent") errors.push(`system must have an independent experience: ${system.id}`);
    if (!system.description.trim()) errors.push(`missing description: ${system.id}`);
    if (!system.capabilities.length) errors.push(`missing capabilities: ${system.id}`);
  }

  for (const family of FRESH_FLOW_SYSTEM_FAMILIES) {
    if (!FRESH_FLOW_INDEPENDENT_SYSTEMS.some((system) => system.family === family.id)) {
      errors.push(`family has no systems: ${family.id}`);
    }
  }
  return errors;
}
