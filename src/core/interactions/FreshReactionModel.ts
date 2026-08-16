export type UniversalReactionKind =
  | "like" | "love" | "laugh" | "wow" | "celebrate" | "support"
  | "curious" | "inspire" | "insightful" | "agree" | "disagree"
  | "helpful" | "question" | "respect" | "fire" | "sad" | "angry"
  | "custom";

export type InteractionMediaKind = "text" | "image" | "gallery" | "video" | "audio" | "file" | "live" | "poll" | "article" | "mixed";

export type UniversalCommentAttachment = {
  kind: InteractionMediaKind;
  url: string;
  mimeType?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  altText?: string;
  metadata?: Record<string, unknown>;
};

export type UniversalComment = {
  id: string;
  actorId: string;
  targetId: string;
  targetType: string;
  body?: string;
  attachments: UniversalCommentAttachment[];
  replyToId?: string;
  reactions: Partial<Record<UniversalReactionKind, number>>;
  createdAt: string;
  editedAt?: string;
};

export const UNIVERSAL_REACTIONS: readonly UniversalReactionKind[] = [
  "like", "love", "laugh", "wow", "celebrate", "support", "curious",
  "inspire", "insightful", "agree", "disagree", "helpful", "question",
  "respect", "fire", "sad", "angry", "custom",
];

export const INTERACTION_MEDIA_KINDS: readonly InteractionMediaKind[] = [
  "text", "image", "gallery", "video", "audio", "file", "live", "poll", "article", "mixed",
];

/**
 * Platform-wide interaction contract. Shorts consumes this model, but the
 * same contract is intentionally available to posts, videos, news, live,
 * stories, photos, audio, articles and future Fresh media types.
 */
export function supportsAttachment(kind: InteractionMediaKind): boolean {
  return INTERACTION_MEDIA_KINDS.includes(kind);
}
