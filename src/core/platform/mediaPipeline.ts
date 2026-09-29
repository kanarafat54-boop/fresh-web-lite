export type MediaPipelineStage =
  | "ingest" | "transcribe" | "separate-audio" | "detect-subjects"
  | "repurpose" | "translate" | "synthesize" | "package" | "publish";

export type MediaPipelineJob = {
  id: string;
  inputId: string;
  stages: MediaPipelineStage[];
  status: "queued" | "running" | "complete" | "failed";
  completedStages?: MediaPipelineStage[];
  currentStage?: MediaPipelineStage;
  error?: string;
  updatedAt?: string;
};

export const DEFAULT_MEDIA_PIPELINE: MediaPipelineStage[] = [
  "ingest", "transcribe", "separate-audio", "detect-subjects",
  "repurpose", "translate", "synthesize", "package", "publish",
];

export function createMediaPipelineJob(inputId: string, stages = DEFAULT_MEDIA_PIPELINE): MediaPipelineJob {
  return { id: crypto.randomUUID(), inputId, stages: [...stages], status: "queued", completedStages: [], updatedAt: new Date().toISOString() };
}

export type MediaPipelineStageRunner = (job: MediaPipelineJob, stage: MediaPipelineStage) => Promise<void>;

export async function runMediaPipeline(
  job: MediaPipelineJob,
  runner: MediaPipelineStageRunner,
): Promise<MediaPipelineJob> {
  const completed = new Set(job.completedStages ?? []);
  const next: MediaPipelineJob = { ...job, status: "running", completedStages: [...completed], updatedAt: new Date().toISOString() };
  try {
    for (const stage of next.stages) {
      if (completed.has(stage)) continue;
      next.currentStage = stage;
      await runner(next, stage);
      completed.add(stage);
      next.completedStages = [...completed];
      next.updatedAt = new Date().toISOString();
    }
    return { ...next, status: "complete", currentStage: undefined, error: undefined };
  } catch (error) {
    return {
      ...next,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
