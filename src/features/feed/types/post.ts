export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  createdAt: string;
}
