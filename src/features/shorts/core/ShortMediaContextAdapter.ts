import {
  createMediaContext,
  getMediaContextCapabilities,
  type MediaContextDescriptor,
} from "../../../core/media/MediaContextLayer";
import type { MediaObject } from "../../../core/media/MediaOperatingSystem";
import type { Short } from "../types/short";

function extractTopics(caption: string): string[] {
  return [...caption.matchAll(/(^|\s)#([\p{L}\p{N}_-]+)/gu)].map((match) => match[2].toLowerCase());
}

/**
 * Adapts the mature Shorts record into the Fresh Media OS without changing
 * ShortsModule's data contract. This is intentionally a pure boundary so the
 * feed can adopt universal media context incrementally.
 */
export function createShortMediaContext(short: Short): MediaContextDescriptor {
  const media: MediaObject = {
    id: short.id,
    kind: "short",
    creatorId: short.authorId,
    provenance: {
      creatorId: short.authorId,
      createdAt: short.createdAt,
      derivativeDepth: 0,
      policy: {
        allowRemix: true,
        allowDuet: true,
        allowAITransformation: false,
        requireAttribution: true,
        commercialUse: "restricted",
      },
    },
    knowledge: {
      topics: extractTopics(short.caption),
      entities: [],
      languages: [],
      transcriptAvailable: false,
    },
    accessibility: {
      captions: false,
      audioDescription: false,
      altText: false,
    },
  };

  return createMediaContext(media, {
    surface: "discovery",
  });
}

export function getShortMediaContextCapabilities(short: Short): string[] {
  return getMediaContextCapabilities(createShortMediaContext(short));
}

export function getShortMediaContextData(short: Short): Record<string, string> {
  const context = createShortMediaContext(short);
  return {
    "data-media-id": context.mediaId,
    "data-media-kind": context.kind,
    "data-media-creator-id": context.provenance.creatorId,
    "data-media-context-capabilities": getMediaContextCapabilities(context).join(","),
    "data-media-topic-count": String(context.knowledge.topics.length),
    "data-media-derivative-depth": String(context.provenance.derivativeDepth),
  };
}
