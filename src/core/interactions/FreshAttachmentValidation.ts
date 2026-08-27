import {
  validateCommentAttachment,
  validateCommentAttachments,
  type AttachmentValidationResult,
} from './attachmentValidation';

export type AttachmentValidation = { valid: boolean; error?: string };

/**
 * Compatibility facade for older callers.
 * The richer attachmentValidation module is the canonical validator.
 */
export function validateInteractionAttachment(
  file: File,
  kind: 'image' | 'audio' | 'video' | 'file',
): AttachmentValidation {
  const result = validateCommentAttachment(file, kind);
  return result.ok ? { valid: true } : { valid: false, error: result.reason };
}

export function validateInteractionAttachments(
  files: File[],
  maxCount = 6,
): AttachmentValidation {
  const results: AttachmentValidationResult[] = validateCommentAttachments(files, maxCount);
  const failed = results.find((result) => !result.ok);
  return failed ? { valid: false, error: failed.reason } : { valid: true };
}
