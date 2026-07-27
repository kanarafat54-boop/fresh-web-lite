export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  audioUrl: string | null;
  videoUrl: string | null;
  parentId: string | null;
  createdAt: string;
  replies: Comment[];
}

export type CommentTargetType = "post" | "short";
