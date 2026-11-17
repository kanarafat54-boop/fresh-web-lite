/**
 * Fresh Flow ↔ Creator Studio domain integration.
 *
 * This is the product contract between the 24 independent media systems and
 * the single Creator Studio. It describes creation routing and shared services;
 * it does not claim that a provider, editor, or publishing destination is live.
 */
import type { FreshFlowIndependentSystem } from "./freshFlowSystemRegistry.ts";
import type { StudioMediaKind, StudioWorkspaceId } from "../../fresh-studio/shared/types.ts";

export type StudioCreationIntent =
  | "record" | "import" | "edit" | "compose" | "write" | "design"
  | "animate" | "broadcast" | "schedule" | "package" | "publish";

export type FreshFlowStudioProfile = {
  systemId: FreshFlowIndependentSystem["id"];
  mediaKind: StudioMediaKind;
  workspace: StudioWorkspaceId;
  intents: readonly StudioCreationIntent[];
  /** Capability IDs describe required integrations, not client-side permissions. */
  capabilities: readonly string[];
  /** Shared Studio services this domain is expected to consume. */
  sharedServices: readonly ("projects" | "assets" | "review" | "distribution" | "analytics" | "monetization" | "collaboration" | "fresh-ai")[];
  implementation: "existing-foundation" | "partial-foundation" | "domain-work-required" | "provider-required" | "device-required";
};

const COMMON = ["projects", "assets", "review", "distribution"] as const;
const MEASURED = ["analytics", "monetization"] as const;
const AI = ["fresh-ai"] as const;

export const FRESH_FLOW_STUDIO_PROFILES: readonly FreshFlowStudioProfile[] = [
  { systemId: "fresh-shorts", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "package", "publish"], capabilities: ["media.video", "short-video", "captions"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "existing-foundation" },
  { systemId: "long-video", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "package", "publish"], capabilities: ["media.video", "long-video", "adaptive-playback"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "partial-foundation" },
  { systemId: "movies-series", mediaKind: "video", workspace: "video", intents: ["import", "edit", "package", "publish"], capabilities: ["media.video", "film-catalog", "series-catalog", "rights-management"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "fresh-live", mediaKind: "live", workspace: "live", intents: ["record", "broadcast", "schedule", "publish"], capabilities: ["media.live", "live-ingest-and-egress", "live-moderation"], sharedServices: [...COMMON, "analytics", "collaboration"], implementation: "provider-required" },
  { systemId: "sports-events", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "package", "publish"], capabilities: ["media.video", "sports-discovery", "rights-management"], sharedServices: [...COMMON, ...MEASURED, "collaboration"], implementation: "domain-work-required" },
  { systemId: "fresh-posts", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "design", "import", "publish"], capabilities: ["media.text", "media.image", "social-publishing"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "communities", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "design", "publish"], capabilities: ["media.text", "media.image", "community-publishing", "moderation"], sharedServices: [...COMMON, "analytics", "collaboration"], implementation: "domain-work-required" },
  { systemId: "stories", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "design", "publish"], capabilities: ["media.video", "media.image", "temporary-media", "audience-controls"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "creator-channels", mediaKind: "custom", workspace: "custom", intents: ["compose", "write", "design", "package", "publish"], capabilities: ["media.text", "media.image", "creator-pages", "collections"], sharedServices: [...COMMON, ...MEASURED, "collaboration"], implementation: "domain-work-required" },
  { systemId: "fresh-music", mediaKind: "audio", workspace: "audio", intents: ["record", "import", "edit", "package", "publish"], capabilities: ["media.audio", "music-catalog", "audio-playback", "rights-management"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "partial-foundation" },
  { systemId: "fresh-podcasts", mediaKind: "podcast", workspace: "podcast", intents: ["record", "import", "edit", "compose", "package", "publish"], capabilities: ["media.audio", "podcast-shows", "transcription"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "radio-audio-live", mediaKind: "live", workspace: "live", intents: ["record", "broadcast", "schedule", "publish"], capabilities: ["media.audio", "media.live", "radio-stations", "live-ingest-and-egress"], sharedServices: [...COMMON, "analytics", "collaboration"], implementation: "provider-required" },
  { systemId: "audiobooks", mediaKind: "audio", workspace: "audio", intents: ["record", "import", "edit", "package", "publish"], capabilities: ["media.audio", "spoken-books", "chapters", "transcription"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "fresh-news", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "import", "package", "publish"], capabilities: ["media.text", "news-publishers", "source-attribution", "corrections"], sharedServices: [...COMMON, "analytics", "collaboration", "fresh-ai"], implementation: "domain-work-required" },
  { systemId: "books-reading", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "design", "package", "publish"], capabilities: ["media.text", "ebooks", "comics", "reading-progress"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "domain-work-required" },
  { systemId: "learn", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "record", "package", "publish"], capabilities: ["media.text", "media.video", "courses", "assessments"], sharedServices: [...COMMON, ...MEASURED, "collaboration", ...AI], implementation: "domain-work-required" },
  { systemId: "research-knowledge", mediaKind: "custom", workspace: "custom", intents: ["write", "compose", "import", "package", "publish"], capabilities: ["media.text", "media.data", "research-search", "source-attribution"], sharedServices: [...COMMON, "analytics", "collaboration", ...AI], implementation: "domain-work-required" },
  { systemId: "images-art", mediaKind: "image", workspace: "image", intents: ["record", "import", "edit", "design", "publish"], capabilities: ["media.image", "image-gallery", "rights-review"], sharedServices: [...COMMON, ...MEASURED, ...AI], implementation: "partial-foundation" },
  { systemId: "vr-ar-spatial", mediaKind: "animation3d", workspace: "animation", intents: ["record", "import", "edit", "animate", "package", "publish"], capabilities: ["media.spatial", "vr", "ar", "device-detection"], sharedServices: [...COMMON, "analytics", ...AI], implementation: "device-required" },
  { systemId: "interactive-experiences", mediaKind: "custom", workspace: "custom", intents: ["compose", "design", "edit", "package", "publish"], capabilities: ["media.interactive", "sandboxed-content-runtime", "interactive-media"], sharedServices: [...COMMON, "analytics", "collaboration"], implementation: "domain-work-required" },
  { systemId: "gaming-esports", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "compose", "package", "publish"], capabilities: ["media.video", "media.interactive", "game-discovery", "esports"], sharedServices: [...COMMON, ...MEASURED, "collaboration"], implementation: "domain-work-required" },
  { systemId: "fresh-studio", mediaKind: "video", workspace: "video", intents: ["record", "import", "edit", "compose", "write", "design", "animate", "broadcast", "package", "publish"], capabilities: ["media.text", "media.image", "media.audio", "media.video", "media.spatial", "media.composite"], sharedServices: [...COMMON, ...MEASURED, "collaboration", ...AI], implementation: "existing-foundation" },
  { systemId: "live-creation", mediaKind: "live", workspace: "live", intents: ["record", "broadcast", "schedule", "publish"], capabilities: ["media.live", "live-ingest-and-egress", "live-moderation", "scenes"], sharedServices: [...COMMON, "analytics", "collaboration"], implementation: "provider-required" },
  { systemId: "events-performances", mediaKind: "live", workspace: "live", intents: ["record", "import", "broadcast", "schedule", "package", "publish"], capabilities: ["media.live-event", "media.live", "event-listings", "registration"], sharedServices: [...COMMON, ...MEASURED, "collaboration"], implementation: "provider-required" },
] as const;

const PROFILES_BY_SYSTEM = new Map(FRESH_FLOW_STUDIO_PROFILES.map((profile) => [profile.systemId, profile]));

export function getFreshFlowStudioProfile(systemId: string): FreshFlowStudioProfile | undefined {
  return PROFILES_BY_SYSTEM.get(systemId as FreshFlowStudioProfile["systemId"]);
}

export function getFreshFlowStudioProfilesByWorkspace(workspace: StudioWorkspaceId): FreshFlowStudioProfile[] {
  return FRESH_FLOW_STUDIO_PROFILES.filter((profile) => profile.workspace === workspace);
}

/** Resolve a supported Studio project kind without changing an existing project record. */
export function resolveStudioKindForFreshFlowSystem(systemId: string): StudioMediaKind | null {
  return getFreshFlowStudioProfile(systemId)?.mediaKind ?? null;
}

/** Build the stable source metadata to attach when a domain creates a Studio project. */
export function freshFlowStudioProjectContext(systemId: string): { sourceSystemId: string; workspace: StudioWorkspaceId } | null {
  const profile = getFreshFlowStudioProfile(systemId);
  return profile ? { sourceSystemId: profile.systemId, workspace: profile.workspace } : null;
}
