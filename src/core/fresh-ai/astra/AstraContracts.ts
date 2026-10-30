/**
 * Astra is Fresh AI's multimodal perception and embodied-interaction subsystem.
 * These contracts describe safe orchestration boundaries; they do not claim
 * that a camera/audio/video model or physical device gateway is deployed.
 */
export type AstraModality = "text" | "image" | "audio" | "video" | "spatial" | "sensor";
export type AstraMode = "perceive" | "understand" | "plan" | "act";
export type AstraRisk = "read-only" | "low" | "medium" | "high" | "critical";
export type AstraDecision = "allow" | "approval-required" | "blocked";

export interface AstraObservation {
  readonly id: string;
  readonly modality: AstraModality;
  readonly capturedAt: string;
  readonly source: "user-upload" | "user-camera" | "user-microphone" | "paired-device" | "simulation";
  readonly consentGranted: boolean;
  readonly description?: string;
  readonly payloadRef?: string;
  readonly confidence?: number;
}

export interface AstraWorldState {
  readonly observedAt: string;
  readonly observations: readonly AstraObservation[];
  readonly entities: readonly { id: string; label: string; confidence: number }[];
  readonly uncertainty: readonly string[];
}

export interface AstraActionProposal {
  readonly id: string;
  readonly deviceId?: string;
  readonly action: string;
  readonly parameters: Readonly<Record<string, string | number | boolean>>;
  readonly risk: AstraRisk;
  readonly expiresAt: string;
  readonly idempotencyKey: string;
  readonly requestedBy: string;
}

export interface AstraPolicyContext {
  readonly environment: "simulation" | "physical";
  readonly userAuthenticated: boolean;
  readonly consentGranted: boolean;
  readonly devicePaired: boolean;
  readonly deviceCapabilityGranted: boolean;
  readonly humanApproved: boolean;
  readonly safetyInterlocksVerified: boolean;
  readonly emergencyStopAvailable: boolean;
  readonly now?: string;
}

export interface AstraPolicyResult {
  readonly decision: AstraDecision;
  readonly reasons: readonly string[];
  readonly executable: false;
}

/** Rejects unconsented, malformed or implausibly future observations. */
export function validateAstraObservation(
  observation: AstraObservation,
  options?: { now?: string },
): string[] {
  const errors: string[] = [];
  if (!observation || typeof observation !== "object") return ["A valid observation object is required."];
  if (typeof observation.id !== "string" || !observation.id.trim() || observation.id.length > 128) {
    errors.push("Observation ID must contain 1–128 characters.");
  }
  if (!["text", "image", "audio", "video", "spatial", "sensor"].includes(observation.modality)) {
    errors.push("Observation modality is unsupported.");
  }
  if (!["user-upload", "user-camera", "user-microphone", "paired-device", "simulation"].includes(observation.source)) {
    errors.push("Observation source is unsupported.");
  }
  if (observation.consentGranted !== true) errors.push("User consent is required before processing this observation.");
  const capturedAt = Date.parse(observation.capturedAt);
  const now = Date.parse(options?.now ?? new Date().toISOString());
  if (!Number.isFinite(capturedAt)) errors.push("Observation timestamp is invalid.");
  else if (Number.isFinite(now) && capturedAt > now + 5 * 60 * 1000) errors.push("Observation timestamp is too far in the future.");
  if (observation.confidence !== undefined && (!Number.isFinite(observation.confidence) || observation.confidence < 0 || observation.confidence > 1)) {
    errors.push("Observation confidence must be a finite number between 0 and 1.");
  }
  if (observation.description !== undefined && (typeof observation.description !== "string" || observation.description.length > 2000)) {
    errors.push("Observation description must not exceed 2,000 characters.");
  }
  if (observation.payloadRef !== undefined && (typeof observation.payloadRef !== "string" || !/^[A-Za-z0-9/_-]{1,512}$/.test(observation.payloadRef))) {
    errors.push("Payload reference must be an opaque storage reference, not a URL or arbitrary path.");
  }
  if (observation.modality !== "text" && !observation.payloadRef) {
    errors.push("Non-text observations require a stored payload reference.");
  }
  if (observation.source === "user-camera" && observation.modality !== "image" && observation.modality !== "video") {
    errors.push("Camera observations must use image or video modality.");
  }
  if (observation.source === "user-microphone" && observation.modality !== "audio") {
    errors.push("Microphone observations must use audio modality.");
  }
  return errors;
}

/**
 * Fail-closed action policy. This layer never dispatches commands. Physical
 * execution remains blocked until a separately reviewed device gateway exists.
 */
export function evaluateAstraAction(
  proposal: AstraActionProposal,
  context: AstraPolicyContext,
): AstraPolicyResult {
  const reasons: string[] = [];
  const now = Date.parse(context.now ?? new Date().toISOString());
  const expiry = Date.parse(proposal.expiresAt);
  if (!proposal.id.trim() || !proposal.action.trim() || !proposal.requestedBy.trim()) reasons.push("Action identity and requester are required.");
  if (!proposal.idempotencyKey.trim()) reasons.push("An idempotency key is required.");
  if (!Number.isFinite(expiry) || expiry <= now) reasons.push("Action proposal is expired or has an invalid expiry.");
  if (!context.userAuthenticated) reasons.push("An authenticated user session is required.");
  if (!context.consentGranted) reasons.push("Explicit user consent is required.");
  if (context.environment === "physical") reasons.push("Physical actuation is disabled: no verified Fresh device gateway and hardware safety case is registered.");
  if (proposal.risk === "critical") reasons.push("Critical-risk actions are not executable through Astra.");
  if (proposal.deviceId && (!context.devicePaired || !context.deviceCapabilityGranted)) {
    reasons.push("The target device is not paired or the requested capability is not granted.");
  }
  if (context.environment === "physical" && (!context.safetyInterlocksVerified || !context.emergencyStopAvailable)) {
    reasons.push("Verified hardware interlocks and an independent emergency stop are mandatory.");
  }
  if (reasons.length) return { decision: "blocked", reasons, executable: false };
  if (proposal.risk === "read-only" || proposal.risk === "low") {
    return { decision: "allow", reasons: ["Policy checks passed; dispatch still requires a registered executor."], executable: false };
  }
  if (!context.humanApproved) {
    return { decision: "approval-required", reasons: ["Human approval is required for this action risk."], executable: false };
  }
  return { decision: "allow", reasons: ["Human approval and policy checks passed; dispatch still requires a registered executor."], executable: false };
}
