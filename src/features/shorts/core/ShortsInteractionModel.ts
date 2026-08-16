export type ShortsMediaKind = "video" | "image" | "audio" | "gallery" | "text" | "live";

export type ReactionKind =
  | "like"
  | "love"
  | "laugh"
  | "wow"
  | "celebrate"
  | "support"
  | "curious"
  | "inspire"
  | "insightful"
  | "agree"
  | "disagree"
  | "helpful"
  | "question"
  | "respect"
  | "fire"
  | "sad"
  | "angry"
  | "custom";

export type CommentAttachment = {
  kind: ShortsMediaKind;
  url: string;
  mimeType?: string;
  durationMs?: number;
  thumbnailUrl?: string;
  altText?: string;
};

export type ShortsComment = {
  id: string;
  authorId: string;
  body?: string;
  attachments: CommentAttachment[];
  reactions: Partial<Record<ReactionKind, number>>;
  replyToId?: string;
  createdAt: string;
  editedAt?: string;
};

export type ShortsInteractionPolicy = {
  allowVideoComments: boolean;
  allowAudioComments: boolean;
  allowImageComments: boolean;
  allowGalleryComments: boolean;
  allowTextComments: boolean;
  allowReplies: boolean;
  allowCustomReactions: boolean;
};

/**
 * Unified interaction contract for Shorts. The viewer and composer should use
 * this contract so text, image, video and audio comments behave consistently.
 */
export const DEFAULT_SHORTS_INTERACTION_POLICY: ShortsInteractionPolicy = {
  allowVideoComments: true,
  allowAudioComments: true,
  allowImageComments: true,
  allowGalleryComments: true,
  allowTextComments: true,
  allowReplies: true,
  allowCustomReactions: true,
};

export const REACTION_KINDS: ReactionKind[] = [
  "like", "love", "laugh", "wow", "celebrate", "support", "curious",
  "inspire", "insightful", "agree", "disagree", "helpful", "question",
  "respect", "fire", "sad", "angry", "custom",
];

export function canAttachComment(policy: ShortsInteractionPolicy, kind: ShortsMediaKind): boolean {
  switch (kind) {
    case "video": return policy.allowVideoComments;
    case "audio": return policy.allowAudioComments;
    case "image": return policy.allowImageComments;
    case "gallery": return policy.allowGalleryComments;
    case "text": return policy.allowTextComments;
    default: return false;
  }
}
