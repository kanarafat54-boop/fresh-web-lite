export interface Chapter {
  time: number;
  label: string;
}

export type ShortsInteractionMode = "standard" | "ar" | "vr" | "spatial";

export interface ImmersiveMetadata {
  sceneId?: string;
  anchorId?: string;
  projection?: "flat" | "360" | "180" | "spatial";
  supportsHandTracking?: boolean;
  supportsHeadTracking?: boolean;
  metadataVersion?: number;
}

export interface Short {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  caption: string;
  soundName: string | null;
  videoUrl: string;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  repostCount: number;
  myReaction: string | null;
  repostedByMe: boolean;
  isFollowingAuthor: boolean;
  reactionBreakdown: Record<string, number>;
  isHot: boolean;
  chapters: Chapter[];
  createdAt: string;
  remixOfShortId?: string | null;
  duetOfShortId?: string | null;
  interactionMode?: ShortsInteractionMode;
  immersiveMetadata?: ImmersiveMetadata;
}
