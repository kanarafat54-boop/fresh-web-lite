import type { CommentReactionType } from './types';

export type ImmersiveMode = 'standard' | 'ar' | 'vr' | 'spatial';
export type RemixLayout = 'side_by_side' | 'top_bottom' | 'overlay' | 'sequence';

export interface InteractionTarget {
  shortId: string;
  commentId?: string;
}

export interface ReactionMutation {
  target: InteractionTarget;
  reaction: CommentReactionType | null;
}

export interface RemixLineage {
  sourceShortId: string;
  sourceStartMs?: number;
  sourceEndMs?: number;
  layout: RemixLayout;
  immersiveMode?: ImmersiveMode;
}

export function isImmersiveMode(value: string | undefined): value is ImmersiveMode {
  return value === 'standard' || value === 'ar' || value === 'vr' || value === 'spatial';
}

export function validateRemixLineage(lineage: RemixLineage): string[] {
  const errors: string[] = [];
  if (!lineage.sourceShortId.trim()) errors.push('A source Short is required.');
  if (lineage.sourceStartMs !== undefined && lineage.sourceStartMs < 0) errors.push('Source start cannot be negative.');
  if (lineage.sourceEndMs !== undefined && lineage.sourceEndMs < 0) errors.push('Source end cannot be negative.');
  if (lineage.sourceStartMs !== undefined && lineage.sourceEndMs !== undefined && lineage.sourceEndMs <= lineage.sourceStartMs) {
    errors.push('Source end must be greater than source start.');
  }
  return errors;
}
