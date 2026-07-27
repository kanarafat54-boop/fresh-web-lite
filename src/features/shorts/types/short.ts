export interface Chapter {
  time: number;
  label: string;
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
}
