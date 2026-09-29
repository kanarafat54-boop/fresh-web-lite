export type FreshFlowMediaJobKind =
  | "ingest" | "transcode" | "thumbnail" | "captions" | "audio-separation"
  | "dubbing" | "repurpose" | "moderation" | "publish";

export type FreshFlowMediaJob = {
  id: string;
  kind: FreshFlowMediaJobKind;
  assetId: string;
  status: "queued" | "running" | "complete" | "failed" | "cancelled";
  inputRef: string;
  outputRefs: string[];
  createdAt: string;
};

export const FRESH_FLOW_MEDIA_JOB_ORDER: FreshFlowMediaJobKind[] = [
  "ingest", "moderation", "transcode", "thumbnail", "captions",
  "audio-separation", "dubbing", "repurpose", "publish",
];

export function canAdvanceMediaJob(job: FreshFlowMediaJob, next: FreshFlowMediaJobKind): boolean {
  if (job.status !== "complete") return false;
  const current = FRESH_FLOW_MEDIA_JOB_ORDER.indexOf(job.kind);
  const target = FRESH_FLOW_MEDIA_JOB_ORDER.indexOf(next);
  return current >= 0 && target === current + 1;
}

export function mediaReferenceIsSafe(ref: string): boolean {
  if (!ref.trim()) return false;
  try {
    const url = new URL(ref);
    return url.protocol === "https:" || url.protocol === "blob:";
  } catch {
    return ref.startsWith("storage://");
  }
}
