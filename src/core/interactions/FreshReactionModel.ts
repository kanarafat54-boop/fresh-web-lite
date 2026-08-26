export type UniversalReactionKind =
  | "like" | "love" | "laugh" | "wow" | "celebrate" | "support"
  | "curious" | "inspire" | "insightful" | "agree" | "disagree"
  | "helpful" | "question" | "respect" | "fire" | "sad" | "angry"
  | "custom";

/** Every Fresh object that may participate in universal interactions. */
export type UniversalInteractionTargetType =
  | "short" | "video" | "post" | "text" | "image" | "gallery"
  | "audio" | "podcast" | "live" | "news" | "article" | "story"
  | "poll" | "comment" | "reply" | "quote" | "remix" | "duet"
  | "learning" | "knowledge" | "marketplace" | "profile" | "ar"
  | "vr" | "mixed";

/** Target-specific capabilities remain separate from reactions. */
export type UniversalInteractionCapability =
  | "react" | "comment" | "reply" | "save" | "share" | "repost"
  | "quote" | "vote" | "remix" | "duet" | "collaborate";

export type InteractionMediaKind = "text" | "image" | "gallery" | "video" | "audio" | "file" | "live" | "poll" | "article" | "mixed";

export type UniversalInteractionTarget = {
  id: string;
  type: UniversalInteractionTargetType;
  capabilities: readonly UniversalInteractionCapability[];
};

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
  targetType: UniversalInteractionTargetType;
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

export function supportsAttachment(kind: InteractionMediaKind): boolean {
  return INTERACTION_MEDIA_KINDS.includes(kind);
}

export function canInteractWithTarget(
  target: UniversalInteractionTarget,
  capability: UniversalInteractionCapability,
): boolean {
  return target.capabilities.includes(capability);
}

export function canReactToTarget(target: UniversalInteractionTarget): boolean {
  return canInteractWithTarget(target, "react");
}

/** Poll voting is a separate action; reacting to a poll never casts a vote. */
export function canVoteOnTarget(target: UniversalInteractionTarget): boolean {
  return target.type === "poll" && canInteractWithTarget(target, "vote");
}
