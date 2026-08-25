/**
 * Fresh Media Context Layer
 *
 * Resolves the context that can travel with a media object without making the
 * feed component responsible for provenance, knowledge, accessibility, or
 * derivative relationships.
 */
import type { FreshFlowSurface, MediaKind } from './freshFlow';
import type { MediaKnowledgeDescriptor, MediaObject, MediaProvenance } from './MediaOperatingSystem';

export interface MediaSourceReference {
  id: string;
  title?: string;
  url?: string;
  publisher?: string;
  retrievedAt?: string;
  relationship: 'origin' | 'reference' | 'evidence' | 'coverage' | 'derivative';
}

export interface MediaDerivativeReference {
  mediaId: string;
  kind: MediaKind;
  relationship: 'remix' | 'duet' | 'quote' | 'translation' | 'transformation' | 'response';
}

export interface MediaContextDescriptor {
  mediaId: string;
  kind: MediaKind;
  surface?: FreshFlowSurface;
  provenance: MediaProvenance;
  knowledge: MediaKnowledgeDescriptor;
  sources: MediaSourceReference[];
  derivatives: MediaDerivativeReference[];
  relatedMediaIds: string[];
  accessibility: MediaObject['accessibility'];
  temporal?: {
    validFrom?: string;
    validUntil?: string;
    lastVerifiedAt?: string;
  };
}

export interface MediaContextPatch {
  surface?: FreshFlowSurface;
  sources?: MediaSourceReference[];
  derivatives?: MediaDerivativeReference[];
  relatedMediaIds?: string[];
  temporal?: MediaContextDescriptor['temporal'];
}

export function createMediaContext(media: MediaObject, patch: MediaContextPatch = {}): MediaContextDescriptor {
  return {
    mediaId: media.id,
    kind: media.kind,
    surface: patch.surface,
    provenance: media.provenance,
    knowledge: media.knowledge,
    sources: patch.sources ?? [],
    derivatives: patch.derivatives ?? [],
    relatedMediaIds: patch.relatedMediaIds ?? [],
    accessibility: media.accessibility,
    temporal: patch.temporal,
  };
}

export function mergeMediaContext(
  current: MediaContextDescriptor,
  patch: MediaContextPatch,
): MediaContextDescriptor {
  return {
    ...current,
    ...patch,
    sources: patch.sources ? [...patch.sources] : current.sources,
    derivatives: patch.derivatives ? [...patch.derivatives] : current.derivatives,
    relatedMediaIds: patch.relatedMediaIds ? [...patch.relatedMediaIds] : current.relatedMediaIds,
  };
}

export function getMediaContextCapabilities(context: MediaContextDescriptor): string[] {
  const capabilities = new Set<string>();

  if (context.knowledge.transcriptAvailable) capabilities.add('transcript');
  if (context.sources.length > 0) capabilities.add('provenance');
  if (context.sources.some((source) => source.relationship === 'evidence')) capabilities.add('evidence');
  if (context.derivatives.length > 0) capabilities.add('lineage');
  if (context.accessibility.captions) capabilities.add('captions');
  if (context.accessibility.audioDescription) capabilities.add('audio-description');
  if (context.accessibility.altText) capabilities.add('alt-text');
  if (context.relatedMediaIds.length > 0) capabilities.add('related-media');

  return [...capabilities];
}
