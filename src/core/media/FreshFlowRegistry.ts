import {
  FRESH_FLOW_LABELS,
  type FreshFlowSurface,
  type MediaKind,
} from './freshFlow';

export interface FreshFlowMediaDefinition {
  kind: MediaKind;
  label: string;
  surfaces: readonly FreshFlowSurface[];
  capabilities: readonly string[];
  realtime: boolean;
  status: 'active' | 'planned';
}

/**
 * Single capability registry for Fresh Flow media. Feature modules consume
 * this registry instead of creating independent media-format lists.
 */
export const FRESH_FLOW_MEDIA_REGISTRY: readonly FreshFlowMediaDefinition[] = [
  {
    kind: 'short',
    label: FRESH_FLOW_LABELS.short,
    surfaces: ['discovery', 'following', 'creator', 'community', 'topic'],
    capabilities: ['video', 'comments', 'reactions', 'replies', 'repost', 'save', 'remix'],
    realtime: false,
    status: 'active',
  },
  {
    kind: 'long_video',
    label: FRESH_FLOW_LABELS.long_video,
    surfaces: ['discovery', 'following', 'creator', 'topic', 'learning'],
    capabilities: ['video', 'chapters', 'comments', 'reactions', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'live',
    label: FRESH_FLOW_LABELS.live,
    surfaces: ['discovery', 'following', 'creator', 'community', 'topic'],
    capabilities: ['broadcast', 'chat', 'reactions', 'gifts', 'realtime'],
    realtime: true,
    status: 'planned',
  },
  {
    kind: 'news',
    label: FRESH_FLOW_LABELS.news,
    surfaces: ['discovery', 'following', 'search', 'topic', 'news'],
    capabilities: ['article', 'provenance', 'evidence', 'comments', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'audio',
    label: FRESH_FLOW_LABELS.audio,
    surfaces: ['discovery', 'following', 'creator', 'topic'],
    capabilities: ['audio', 'comments', 'reactions', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'podcast',
    label: FRESH_FLOW_LABELS.podcast,
    surfaces: ['discovery', 'following', 'creator', 'topic', 'learning'],
    capabilities: ['audio', 'chapters', 'transcript', 'comments', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'image',
    label: FRESH_FLOW_LABELS.image,
    surfaces: ['discovery', 'following', 'creator', 'community', 'topic'],
    capabilities: ['image', 'comments', 'reactions', 'save', 'remix'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'gallery',
    label: FRESH_FLOW_LABELS.gallery,
    surfaces: ['discovery', 'following', 'creator', 'topic'],
    capabilities: ['gallery', 'comments', 'reactions', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'story',
    label: FRESH_FLOW_LABELS.story,
    surfaces: ['discovery', 'following', 'creator', 'community'],
    capabilities: ['ephemeral', 'reactions', 'replies'],
    realtime: true,
    status: 'planned',
  },
  {
    kind: 'post',
    label: FRESH_FLOW_LABELS.post,
    surfaces: ['discovery', 'following', 'creator', 'community', 'topic'],
    capabilities: ['text', 'media', 'comments', 'reactions', 'repost', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'article',
    label: FRESH_FLOW_LABELS.article,
    surfaces: ['discovery', 'following', 'search', 'topic', 'news', 'learning'],
    capabilities: ['article', 'provenance', 'evidence', 'comments', 'save'],
    realtime: false,
    status: 'planned',
  },
  {
    kind: 'immersive',
    label: FRESH_FLOW_LABELS.immersive,
    surfaces: ['discovery', 'creator', 'community', 'topic', 'immersive'],
    capabilities: ['ar', 'vr', 'spatial', 'multiplayer', 'reactions'],
    realtime: true,
    status: 'planned',
  },
];

export function getFreshFlowMediaDefinition(kind: MediaKind) {
  return FRESH_FLOW_MEDIA_REGISTRY.find((definition) => definition.kind === kind);
}

export function getActiveFreshFlowMedia() {
  return FRESH_FLOW_MEDIA_REGISTRY.filter((definition) => definition.status === 'active');
}
