/**
 * Fresh Flow
 *
 * Product-level contract for universal discovery. Flow is not a second feed;
 * it is the orchestration layer that lets existing media ecosystems participate
 * in one intent-aware discovery experience.
 */
import type { MediaKind, MediaObject } from '../media';

export type FreshFlowLane =
  | 'for_you'
  | 'following'
  | 'news'
  | 'long_form'
  | 'live'
  | 'audio'
  | 'learning'
  | 'immersive';

export type FreshFlowIntent =
  | 'discover'
  | 'understand'
  | 'follow_topic'
  | 'investigate'
  | 'learn'
  | 'create'
  | 'connect'
  | 'act';

export interface FreshFlowRequest {
  intent: FreshFlowIntent;
  lane?: FreshFlowLane;
  mediaKinds?: MediaKind[];
  topicIds?: string[];
  cursor?: string;
  limit: number;
}

export interface FreshFlowCandidate {
  media: MediaObject;
  score: number;
  reasons: string[];
  source: 'following' | 'interest' | 'context' | 'knowledge' | 'freshness';
}

export interface FreshFlowPage {
  items: FreshFlowCandidate[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface FreshFlowPolicy {
  /** Never require endless continuation to satisfy a request. */
  allowExplicitStop: boolean;
  /** Prefer useful diversity over repeated near-duplicates. */
  diversifyMediaKinds: boolean;
  /** Preserve provenance and attribution through discovery. */
  requireProvenance: boolean;
  /** Keep ranking reasons inspectable by downstream UI/AI. */
  exposeReasons: boolean;
}

export const DEFAULT_FRESH_FLOW_POLICY: FreshFlowPolicy = {
  allowExplicitStop: true,
  diversifyMediaKinds: true,
  requireProvenance: true,
  exposeReasons: true,
};
