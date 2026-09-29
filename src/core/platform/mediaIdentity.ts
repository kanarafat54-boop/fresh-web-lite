export type FreshMediaFormat = "short" | "video" | "post" | "news" | "podcast" | "ar" | "vr" | "image" | "audio" | "mixed";

export type FreshMediaIdentity = {
  contentId: string;
  format: FreshMediaFormat;
  sourceProjectId?: string;
  authorId?: string;
  title?: string;
  createdAt: string;
};

export function createMediaIdentity(format: FreshMediaFormat, input: Omit<FreshMediaIdentity, "contentId" | "format" | "createdAt"> = {}): FreshMediaIdentity {
  return { contentId: crypto.randomUUID(), format, createdAt: new Date().toISOString(), ...input };
}

export function isPublishableMediaIdentity(identity: FreshMediaIdentity): boolean {
  return Boolean(identity.contentId && identity.format);
}
