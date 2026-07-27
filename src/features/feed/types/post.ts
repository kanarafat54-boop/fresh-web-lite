export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  myReaction: string | null;
  createdAt: string;
}
