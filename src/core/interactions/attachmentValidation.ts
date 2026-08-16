import type { InteractionMediaKind, UniversalCommentAttachment } from "./FreshReactionModel";

export type AttachmentValidationResult =
  | { ok: true; attachment: UniversalCommentAttachment }
  | { ok: false; reason: string };

const LIMITS: Record<InteractionMediaKind, { maxBytes: number; mime: RegExp }> = {
  text: { maxBytes: 0, mime: /.*/ },
  image: { maxBytes: 15 * 1024 * 1024, mime: /^image\/(jpeg|png|webp|gif|heic)$/i },
  gallery: { maxBytes: 15 * 1024 * 1024, mime: /^image\//i },
  video: { maxBytes: 50 * 1024 * 1024, mime: /^video\/(mp4|webm|quicktime)$/i },
  audio: { maxBytes: 20 * 1024 * 1024, mime: /^audio\/(mpeg|mp4|webm|ogg|wav)$/i },
  file: { maxBytes: 25 * 1024 * 1024, mime: /^(application|text)\//i },
  live: { maxBytes: 0, mime: /.*/ },
  poll: { maxBytes: 0, mime: /.*/ },
  article: { maxBytes: 0, mime: /.*/ },
  mixed: { maxBytes: 50 * 1024 * 1024, mime: /.*/ },
};

export function validateCommentAttachment(file: File, kind: Exclude<InteractionMediaKind, "text" | "live" | "poll" | "article" | "mixed">): AttachmentValidationResult {
  const rule = LIMITS[kind];
  if (!rule.mime.test(file.type)) return { ok: false, reason: `Unsupported ${kind} format.` };
  if (file.size > rule.maxBytes) return { ok: false, reason: `${kind} attachment is too large.` };
  return { ok: true, attachment: { kind, url: "", mimeType: file.type } };
}

export function validateCommentAttachments(files: File[], maxCount = 6): AttachmentValidationResult[] {
  if (files.length > maxCount) return [{ ok: false, reason: `You can attach up to ${maxCount} files.` }];
  return files.map((file) => {
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file";
    return validateCommentAttachment(file, kind);
  });
}
