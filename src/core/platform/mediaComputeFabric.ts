export type MediaComputeClass = "interactive" | "realtime" | "batch" | "gpu-batch";

export type MediaComputeStage =
  | "ingest"
  | "probe"
  | "transcode"
  | "transcribe"
  | "separate-audio"
  | "detect-subjects"
  | "repurpose"
  | "translate"
  | "synthesize"
  | "package"
  | "publish";

export type MediaComputeJob = {
  id: string;
  assetId: string;
  stages: MediaComputeStage[];
  computeClass: MediaComputeClass;
  maxAttempts: number;
  attempt: number;
  status: "queued" | "running" | "succeeded" | "failed";
};

export type MediaWorkerResult = {
  stage: MediaComputeStage;
  status: "succeeded" | "retryable" | "failed";
  outputIds?: string[];
  error?: string;
};

export interface MediaComputeWorker {
  supports(stage: MediaComputeStage): boolean;
  execute(job: MediaComputeJob, stage: MediaComputeStage): Promise<MediaWorkerResult>;
}

export const DEFAULT_MEDIA_COMPUTE_STAGES: MediaComputeStage[] = [
  "ingest",
  "probe",
  "transcode",
  "transcribe",
  "separate-audio",
  "detect-subjects",
  "repurpose",
  "translate",
  "synthesize",
  "package",
  "publish",
];

export function createMediaComputeJob(
  assetId: string,
  input: Partial<Pick<MediaComputeJob, "stages" | "computeClass" | "maxAttempts">> = {},
): MediaComputeJob {
  return {
    id: crypto.randomUUID(),
    assetId,
    stages: input.stages ?? DEFAULT_MEDIA_COMPUTE_STAGES,
    computeClass: input.computeClass ?? "batch",
    maxAttempts: input.maxAttempts ?? 3,
    attempt: 0,
    status: "queued",
  };
}

export function nextRetryDelayMs(attempt: number, baseMs = 500): number {
  const exponent = Math.max(0, attempt - 1);
  return Math.min(baseMs * 2 ** exponent, 30_000);
}

export function canRetry(job: MediaComputeJob): boolean {
  return job.attempt < job.maxAttempts;
}
