export type MediaPipelineStage =
  | "ingest"
  | "transcribe"
  | "separate-audio"
  | "detect-subjects"
  | "repurpose"
  | "translate"
  | "synthesize"
  | "package"
  | "publish";

export type MediaPipelineJob = {
  id: string;
  inputId: string;
  stages: MediaPipelineStage[];
  status: "queued" | "running" | "complete" | "failed";
};

export const DEFAULT_MEDIA_PIPELINE: MediaPipelineStage[] = [
  "ingest",
  "transcribe",
  "separate-audio",
  "detect-subjects",
  "repurpose",
  "translate",
  "synthesize",
  "package",
  "publish",
];

export function createMediaPipelineJob(inputId: string, stages = DEFAULT_MEDIA_PIPELINE): MediaPipelineJob {
  return { id: crypto.randomUUID(), inputId, stages, status: "queued" };
}
