import type { Short } from "../../features/shorts/types";
import { createMediaContext } from "./MediaContextLayer";
import type { MediaContextDescriptor } from "./MediaContextLayer";
import type { MediaKind } from "./MediaOperatingSystem";

/** Converts an existing Shorts item into the shared Fresh Media OS context. */
export function createShortMediaContext(short: Short): MediaContextDescriptor {
  return createMediaContext({
    mediaId: short.id,
    kind: "short" as MediaKind,
    title: short.title,
    description: short.description,
    creatorId: short.creator.id,
    creatorName: short.creator.name,
    publishedAt: short.createdAt,
    source: {
      kind: "creator",
      id: short.creator.id,
      name: short.creator.name,
    },
    accessibility: {
      transcript: false,
      captions: false,
      audioDescription: false,
    },
    capabilities: {
      comments: true,
      reactions: true,
      remix: true,
      save: true,
      share: true,
    },
  });
}
