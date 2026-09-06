/**
 * Stable, UI-agnostic contracts for Fresh Flow.
 *
 * These contracts let Shorts, Long Videos, News/Posts, Podcasts and AR/VR
 * share the same media foundation without forcing a visual redesign.
 */

export type FreshFlowMediaType =
  | "short"
  | "long-video"
  | "post"
  | "news"
  | "podcast"
  | "ar-experience"
  | "vr-experience";

export type FreshFlowModerationState =
  | "pending"
  | "approved"
  | "limited"
  | "blocked"
  | "removed";

export type FreshFlowSafetyDecision = "allow" | "limit" | "block" | "review";

export interface FreshFlowMediaIntelligence {
  transcript?: string;
  language?: string;
  topics: string[];
  entities: string[];
  people: string[];
  places: string[];
  objects: string[];
  scenes: string[];
  captionsAvailable: boolean;
  safetySignals: string[];
  qualitySignals: string[];
  embeddingRef?: string;
}

export interface FreshFlowRights {
  ownerId?: string;
  license?: string;
  territory?: string[];
  expiresAt?: string;
}

export interface FreshFlowSafety {
  moderationState: FreshFlowModerationState;
  decision: FreshFlowSafetyDecision;
  ageSuitability?: string;
  reportCount: number;
  creatorTrustScore?: number;
}

export interface FreshFlowMediaItem {
  id: string;
  mediaType: FreshFlowMediaType;
  creatorId: string;
  createdAt: string;
  title?: string;
  description?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  intelligence: FreshFlowMediaIntelligence;
  rights: FreshFlowRights;
  safety: FreshFlowSafety;
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
}

export interface FreshFlowFeedRequest {
  cursor?: string;
  limit: number;
  sessionId?: string;
  userId?: string;
}

export interface FreshFlowFeedPage<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
