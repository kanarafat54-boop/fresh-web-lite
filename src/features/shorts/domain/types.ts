export type CommentReactionType =
  | 'like'
  | 'dislike'
  | 'love'
  | 'laugh'
  | 'wow'
  | 'celebrate'
  | 'support'
  | 'curious'
  | 'inspire'
  | 'insightful'
  | 'agree'
  | 'disagree'
  | 'helpful'
  | 'question'
  | 'respect'
  | 'fire'
  | 'sad'
  | 'angry';

export const COMMENT_REACTION_TYPES: readonly CommentReactionType[] = [
  'like', 'dislike', 'love', 'laugh', 'wow', 'celebrate', 'support', 'curious',
  'inspire', 'insightful', 'agree', 'disagree', 'helpful', 'question', 'respect',
  'fire', 'sad', 'angry',
] as const;

export function isCommentReactionType(value: string): value is CommentReactionType {
  return (COMMENT_REACTION_TYPES as readonly string[]).includes(value);
}
