export interface Chapter {
  time: number;
  label: string;
}

export type ShortsImmersiveMode = "ar" | "vr" | "spatial";
export type ShortsRemixMode = "remix" | "duet";
export type ShortsRemixLayout = "side_by_side" | "top_bottom" | "overlay" | "sequence";

export interface ShortLineage {
  sourceShortId: string;
  mode: ShortsRemixMode;
  layout?: ShortsRemixLayout;
  sourceStartMs?: number;
  sourceEndMs?: number;
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
  lineage?: ShortLineage;
  immersiveModes?: ShortsImmersiveMode[];
}
