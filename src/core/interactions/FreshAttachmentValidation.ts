export type AttachmentValidation = { valid: boolean; error?: string };

const MAX_BYTES: Record<string, number> = {
  image: 15 * 1024 * 1024,
  audio: 50 * 1024 * 1024,
  video: 250 * 1024 * 1024,
  file: 25 * 1024 * 1024,
};

export function validateInteractionAttachment(file: File, kind: "image" | "audio" | "video" | "file"): AttachmentValidation {
  if (!file || !file.size) return { valid: false, error: "Attachment is empty." };
  const limit = MAX_BYTES[kind];
  if (limit && file.size > limit) return { valid: false, error: `Attachment exceeds the ${Math.round(limit / 1024 / 1024)} MB limit.` };
  const prefixes = { image: "image/", audio: "audio/", video: "video/", file: "" };
  if (prefixes[kind] && !file.type.startsWith(prefixes[kind])) {
    return { valid: false, error: `Expected a ${kind} attachment.` };
  }
  return { valid: true };
}

export function validateInteractionAttachments(files: File[], maxCount = 6): AttachmentValidation {
  if (files.length > maxCount) return { valid: false, error: `You can attach up to ${maxCount} files.` };
  for (const file of files) {
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "file";
    const result = validateInteractionAttachment(file, kind);
    if (!result.valid) return result;
  }
  return { valid: true };
}
