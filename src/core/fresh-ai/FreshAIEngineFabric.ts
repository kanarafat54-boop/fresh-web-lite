/**
 * Shared execution contract for Fresh-owned specialist engines.
 *
 * Registry readiness is descriptive, not proof of a live engine. Dispatch is
 * possible only when a concrete adapter is explicitly supplied and the engine
 * is verified for the requested environment. No provider fallback is allowed.
 */
export type FreshAIEngineId =
  | "fresh-unified"
  | "image-generation"
  | "audio"
  | "video-generation"
  | "media-processing"
  | "spatial-3d"
  | "simulation"
  | "agents"
  | "robotics";

export type FreshAIEngineState =
  | "available"
  | "configuration-required"
  | "configured-not-verified"
  | "training-required"
  | "evaluation-required"
  | "simulation-only"
  | "blocked";

export type FreshAIEngineDescriptor = {
  readonly id: FreshAIEngineId;
  readonly name: string;
  readonly purpose: "inference" | "generation" | "processing" | "simulation" | "actuation";
  readonly state: FreshAIEngineState;
  readonly owner: "Fresh AI";
  readonly modelId: "fresh-unified-1";
  readonly executable: boolean;
  readonly physicalActuation: false;
  readonly reason: string;
};

export type FreshAIEngineConfiguration = Partial<Record<
  | "FRESH_UNIFIED_CHECKPOINT_ID"
  | "FRESH_UNIFIED_INFERENCE_URL"
  | "FRESH_UNIFIED_INFERENCE_TOKEN"
  | "FRESH_AI_IMAGE_ENGINE_URL"
  | "FRESH_AI_IMAGE_ENGINE_TOKEN"
  | "FRESH_AI_AUDIO_ENGINE_URL"
  | "FRESH_AI_AUDIO_ENGINE_TOKEN"
  | "FRESH_AI_VIDEO_ENGINE_URL"
  | "FRESH_AI_VIDEO_ENGINE_TOKEN"
  | "FRESH_AI_SPATIAL_ENGINE_URL"
  | "FRESH_AI_SPATIAL_ENGINE_TOKEN"
  | "FRESH_MEDIA_WORKER_URL"
  | "FRESH_MEDIA_WORKER_API_TOKEN",
  string | undefined
>>;

const descriptor = (
  id: FreshAIEngineId,
  name: string,
  purpose: FreshAIEngineDescriptor["purpose"],
  state: FreshAIEngineState,
  reason: string,
): FreshAIEngineDescriptor => ({
  id, name, purpose, state, owner: "Fresh AI", modelId: "fresh-unified-1",
  executable: state === "available" || state === "simulation-only",
  physicalActuation: false,
  reason,
});

/** A configured URL/token pair is never promoted to available automatically. */
export function getFreshAIEngineInventory(config: FreshAIEngineConfiguration = {}): FreshAIEngineDescriptor[] {
  const configured = (url?: string, token?: string) => Boolean(url?.trim() && token?.trim());
  const unifiedConfigured = configured(config.FRESH_UNIFIED_INFERENCE_URL, config.FRESH_UNIFIED_INFERENCE_TOKEN)
    && Boolean(config.FRESH_UNIFIED_CHECKPOINT_ID?.trim());
  const imageConfigured = configured(config.FRESH_AI_IMAGE_ENGINE_URL, config.FRESH_AI_IMAGE_ENGINE_TOKEN);
  const audioConfigured = configured(config.FRESH_AI_AUDIO_ENGINE_URL, config.FRESH_AI_AUDIO_ENGINE_TOKEN);
  const videoConfigured = configured(config.FRESH_AI_VIDEO_ENGINE_URL, config.FRESH_AI_VIDEO_ENGINE_TOKEN);
  const spatialConfigured = configured(config.FRESH_AI_SPATIAL_ENGINE_URL, config.FRESH_AI_SPATIAL_ENGINE_TOKEN);
  const mediaConfigured = configured(config.FRESH_MEDIA_WORKER_URL, config.FRESH_MEDIA_WORKER_API_TOKEN);

  return [
    descriptor("fresh-unified", "Fresh Unified Neural Engine", "inference",
      unifiedConfigured ? "configured-not-verified" : "evaluation-required",
      unifiedConfigured
        ? "The existing trained checkpoint and endpoint are configured, but live inference, checkpoint identity, grounding and safety evaluation have not been verified."
        : "Fresh Unified Run 3 training is completed and preserved; checkpoint promotion, evaluation and a verified serving endpoint remain outstanding."),
    descriptor("image-generation", "Fresh Image Generation Engine", "generation",
      imageConfigured ? "configured-not-verified" : "configuration-required",
      imageConfigured ? "Image engine configuration exists; authenticated generation and output persistence still require live verification." : "No complete Fresh-owned image generation worker is configured."),
    descriptor("audio", "Fresh Audio Engine", "generation",
      audioConfigured ? "configured-not-verified" : "configuration-required",
      audioConfigured ? "Audio engine configuration exists but has not passed inference and output validation." : "No verified Fresh-owned audio inference or generation worker is configured."),
    descriptor("video-generation", "Fresh Video Generation Engine", "generation",
      videoConfigured ? "configured-not-verified" : "configuration-required",
      videoConfigured ? "Video generation endpoint is configured but has not passed real generation, decoding and artifact validation." : "No verified Fresh-owned text/image-to-video generation worker is configured."),
    descriptor("media-processing", "Fresh Media Processing Engine", "processing",
      mediaConfigured ? "configured-not-verified" : "configuration-required",
      mediaConfigured ? "The FFmpeg worker can process media after a live job test; it does not generate videos from prompts." : "Media processing worker is not configured."),
    descriptor("spatial-3d", "Fresh Spatial and 3D Engine", "generation",
      spatialConfigured ? "configured-not-verified" : "configuration-required",
      spatialConfigured ? "Spatial engine configuration exists but geometry generation and validation are not verified." : "No verified Fresh-owned spatial or 3D inference worker is configured."),
    descriptor("simulation", "Astra Software-in-the-Loop", "simulation", "simulation-only",
      "Deterministic grid simulation is available for bounded software tests; it is not a validated physics engine or digital twin."),
    descriptor("agents", "Fresh Agent Execution Runtime", "processing", "configuration-required",
      "Agent planning contracts exist; a durable, permissioned and audited execution worker is not yet registered here."),
    descriptor("robotics", "Fresh Robotics Gateway", "actuation", "blocked",
      "Physical actuation is disabled. Simulation, hardware-in-loop validation and an independently reviewed safety case are required."),
  ];
}

export type FreshAIEngineJob = {
  readonly jobId: string;
  readonly requestId: string;
  readonly idempotencyKey: string;
  readonly userId: string;
  readonly engineId: FreshAIEngineId;
  readonly environment: "evaluation" | "simulation" | "production";
  readonly consentGranted: boolean;
  readonly input: {
    readonly text?: string;
    readonly assetRef?: string;
    readonly parameters?: Readonly<Record<string, string | number | boolean>>;
  };
};

export type FreshAIEngineArtifact = {
  readonly ref: string;
  readonly mimeType: string;
  readonly sha256: string;
};

export type FreshAIEngineExecutionResult = {
  readonly jobId: string;
  readonly engineId: FreshAIEngineId;
  readonly modelId: "fresh-unified-1";
  readonly status: "completed";
  readonly artifacts: readonly FreshAIEngineArtifact[];
  readonly metadata: Readonly<Record<string, string | number | boolean>>;
};

export type FreshAIEngineAdapter = (job: FreshAIEngineJob) => Promise<FreshAIEngineExecutionResult>;

/**
 * Executes only a verified, registered adapter. This function intentionally
 * has no default adapter and never routes work to a third-party model.
 */
export async function executeFreshAIEngineJob(
  job: FreshAIEngineJob,
  inventory: readonly FreshAIEngineDescriptor[],
  adapters: Partial<Record<FreshAIEngineId, FreshAIEngineAdapter>>,
): Promise<FreshAIEngineExecutionResult> {
  if (!job || typeof job !== "object") throw new Error("A Fresh AI engine job is required.");
  if (!job.jobId.trim() || !job.requestId.trim() || !job.idempotencyKey.trim()) throw new Error("Job, request and idempotency identifiers are required.");
  if (!job.userId.trim()) throw new Error("An authenticated Fresh ID is required.");
  if (job.consentGranted !== true) throw new Error("Explicit user consent is required before engine execution.");
  if (!job.input || typeof job.input !== "object") throw new Error("A valid engine input is required.");
  if (job.input.text !== undefined && (typeof job.input.text !== "string" || job.input.text.length > 32_000)) throw new Error("Engine text input must not exceed 32,000 characters.");
  if (job.input.assetRef !== undefined && !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(job.input.assetRef)) throw new Error("Engine asset references must be opaque storage references.");
  if (job.engineId === "robotics") throw new Error("Physical robotics execution is blocked by Fresh AI policy.");
  if (job.environment === "production" && job.engineId === "simulation") throw new Error("The simulation engine cannot be represented as a production physical-world engine.");

  const engine = inventory.find((item) => item.id === job.engineId);
  if (!engine) throw new Error(`Fresh AI engine is not registered: ${job.engineId}`);
  if (engine.state !== "available" && !(engine.state === "simulation-only" && job.environment === "simulation")) {
    throw new Error(`Fresh AI engine is not executable: ${engine.reason}`);
  }
  const adapter = adapters[job.engineId];
  if (typeof adapter !== "function") throw new Error(`Fresh AI engine has no registered execution adapter: ${job.engineId}`);

  const result = await adapter(job);
  if (!result || result.status !== "completed" || result.jobId !== job.jobId
    || result.engineId !== job.engineId || result.modelId !== "fresh-unified-1"
    || !Array.isArray(result.artifacts) || !result.metadata || typeof result.metadata !== "object") {
    throw new Error("Fresh AI engine returned an invalid or mismatched execution result.");
  }
  for (const artifact of result.artifacts) {
    if (!artifact.ref || !/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/.test(artifact.ref)
      || !artifact.mimeType || !/^[a-f0-9]{64}$/i.test(artifact.sha256)) {
      throw new Error("Fresh AI engine returned an invalid artifact reference, MIME type or SHA-256 digest.");
    }
  }
  return result;
}
