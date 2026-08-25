/**
 * Fresh Media Operating System
 *
 * Shared semantic primitives for media across Fresh Flow, Live, long-form video,
 * news, audio, images, posts, and immersive experiences. Existing feature
 * modules remain the source of truth while they progressively adopt these primitives.
 */
import type { MediaKind } from './freshFlow';

export type MediaInteraction =
  | 'view'
  | 'react'
  | 'comment'
  | 'reply'
  | 'share'
  | 'save'
  | 'repost'
  | 'follow'
  | 'quote'
  | 'duet'
  | 'remix'
  | 'collaborate'
  | 'enter_immersive';

export type MediaDerivativePolicy = {
  allowRemix: boolean;
  allowDuet: boolean;
  allowAITransformation: boolean;
  requireAttribution: boolean;
  commercialUse: 'allowed' | 'restricted' | 'prohibited';
};

export interface MediaProvenance {
  sourceMediaId?: string;
  parentMediaId?: string;
  creatorId: string;
  createdAt: string;
  derivativeDepth: number;
  policy: MediaDerivativePolicy;
};

export interface MediaKnowledgeDescriptor {
  topics: string[];
  entities: string[];
  languages: string[];
  transcriptAvailable: boolean;
  claims?: string[];
};

export interface MediaObject {
  id: string;
  kind: MediaKind;
  creatorId: string;
  provenance: MediaProvenance;
  knowledge: MediaKnowledgeDescriptor;
  durationMs?: number;
  accessibility: {
    captions: boolean;
    audioDescription: boolean;
    altText: boolean;
  };
};

export interface MediaInteractionEvent {
  id: string;
  mediaId: string;
  actorId: string;
  interaction: MediaInteraction;
  occurredAt: string;
  ephemeral: boolean;
  metadata?: Record<string, unknown>;
};

/** High-frequency media events can be streamed/batched separately from durable engagement. */
export interface MediaEventIngestionPolicy {
  mode: 'durable' | 'ephemeral' | 'batched';
  aggregationWindowMs?: number;
  dedupeKey?: string;
};

export const DEFAULT_LIVE_REACTION_POLICY: MediaEventIngestionPolicy = {
  mode: 'batched',
  aggregationWindowMs: 250,
  dedupeKey: 'actor-media-interaction',
};
