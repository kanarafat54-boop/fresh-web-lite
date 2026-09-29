import { createMediaIdentity, type FreshMediaIdentity } from "./mediaIdentity";

export type StudioFlowHandoff = FreshMediaIdentity & {
  sourceUrl: string;
  caption: string;
  visibility: "public" | "followers" | "private";
};

export function createStudioFlowHandoff(input: {
  sourceUrl: string;
  caption?: string;
  visibility?: StudioFlowHandoff["visibility"];
  format?: FreshMediaIdentity["format"];
  sourceProjectId?: string;
  authorId?: string;
}): StudioFlowHandoff {
  if (!input.sourceUrl.trim()) throw new Error("A media source is required.");
  return {
    ...createMediaIdentity(input.format ?? "video", {
      sourceProjectId: input.sourceProjectId,
      authorId: input.authorId,
    }),
    sourceUrl: input.sourceUrl.trim(),
    caption: input.caption?.trim() ?? "",
    visibility: input.visibility ?? "private",
  };
}
