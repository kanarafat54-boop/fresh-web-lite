/**
 * Fresh Flow — the universal discovery/media experience.
 *
 * Product naming is intentionally separate from the underlying media format:
 * `MediaKind` describes what an object is; `FreshFlowSurface` describes how
 * Fresh presents it to a person. This keeps Shorts, long-form video, Live,
 * News, Audio, Posts and immersive media on one extensible foundation.
 */

export const MEDIA_KINDS = [
  'short',
  'long_video',
  'live',
  'news',
  'audio',
  'podcast',
  'image',
  'gallery',
  'story',
  'post',
  'article',
  'immersive',
] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export const FRESH_FLOW_SURFACES = [
  'discovery',
  'following',
  'creator',
  'community',
  'search',
  'topic',
  'news',
  'learning',
  'immersive',
] as const;

export type FreshFlowSurface = (typeof FRESH_FLOW_SURFACES)[number];

export interface FreshFlowMediaReference {
  mediaId: string;
  kind: MediaKind;
  surface?: FreshFlowSurface;
  creatorId?: string;
  topicIds?: string[];
  sourceMediaId?: string;
  /** True when the interaction should be treated as ephemeral/high-frequency. */
  realtime?: boolean;
}

export interface FreshFlowContext {
  surface: FreshFlowSurface;
  intent?: string;
  media?: FreshFlowMediaReference;
  previousMediaId?: string;
  nextMediaId?: string;
}

/**
 * Maps technical media kinds to user-facing Fresh Flow labels without making
 * those labels part of persistence or domain identity.
 */
export const FRESH_FLOW_LABELS: Record<MediaKind, string> = {
  short: 'Shorts',
  long_video: 'Watch',
  live: 'Live',
  news: 'News',
  audio: 'Audio',
  podcast: 'Podcasts',
  image: 'Images',
  gallery: 'Gallery',
  story: 'Stories',
  post: 'Posts',
  article: 'Articles',
  immersive: 'Worlds',
};

export function isMediaKind(value: string): value is MediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

export function getFreshFlowLabel(kind: MediaKind): string {
  return FRESH_FLOW_LABELS[kind];
}
