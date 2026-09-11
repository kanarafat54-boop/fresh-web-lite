/**
 * Canonical runtime boundary for Fresh AI capabilities.
 *
 * Product contracts are never treated as implemented merely because they are
 * registered. A capability becomes executable only when this layer exposes a
 * concrete Fresh-owned runtime boundary.
 */
import {
  FRESH_AI_CAPABILITIES,
  getFreshAICapability,
  type FreshAICapabilityId,
  type FreshAICapabilityStatus,
} from "./FreshAICapabilityRegistry.js";
import { persistFreshAIMedia } from "./FreshAIServerServices.js";

export type FreshAICapabilityRuntimeStatus =
  | "available"
  | "contracted"
  | "training-required"
  | "approval-required"
  | "unknown";

export type FreshAICapabilityRuntimeResolution = {
  id: FreshAICapabilityId;
  label: string;
  registryStatus: FreshAICapabilityStatus;
  status: FreshAICapabilityRuntimeStatus;
  executable: boolean;
  requiresApproval: boolean;
  requiresVerification: boolean;
  reason: string;
};

const UNIVERSAL_TO_PRODUCT: Record<string, FreshAICapabilityId> = {
  chat: "conversation", voice: "voice", search: "search", research: "research",
  analyze: "vision", create: "creation", image: "creation", video: "media-3d",
  audio: "voice", translate: "conversation", summarize: "conversation", plan: "work",
  remember: "memory", learn: "knowledge", code: "code", design: "creation",
  automate: "automation", verify: "trust", act: "work", publish: "apps", connect: "apps",
  organize: "projects", review: "trust", compare: "data", moderate: "safety",
  teach: "knowledge", generate: "creation", edit: "creation", files: "files",
};

function statusFor(contract: ReturnType<typeof getFreshAICapability>, approve: boolean): FreshAICapabilityRuntimeStatus {
  if (contract.status === "training-required") return "training-required";
  if (contract.status === "implemented" && contract.requiresApproval && !approve) return "approval-required";
  if (contract.status === "implemented") return "available";
  return "contracted";
}

export function resolveFreshAICapabilityRuntime(universalCapability: string, approve = false): FreshAICapabilityRuntimeResolution {
  const id = UNIVERSAL_TO_PRODUCT[universalCapability.trim().toLowerCase()];
  if (!id) return {
    id: "conversation", label: universalCapability, registryStatus: "contracted", status: "unknown",
    executable: false, requiresApproval: false, requiresVerification: true,
    reason: `Fresh AI has no canonical runtime mapping for capability: ${universalCapability}`,
  };
  const contract = getFreshAICapability(id);
  const status = statusFor(contract, approve);
  return {
    id, label: contract.label, registryStatus: contract.status, status,
    executable: status === "available", requiresApproval: contract.requiresApproval,
    requiresVerification: contract.requiresVerification,
    reason: status === "available"
      ? "Capability has an implemented Fresh runtime boundary."
      : contract.status === "contracted"
        ? "Capability is contracted but has no implemented execution boundary yet."
        : status === "approval-required"
          ? "Capability requires explicit approval before execution."
          : `Capability status is ${status}.`,
  };
}

export function resolveFreshAICapabilityRuntimeSet(capabilities: readonly string[], approve = false): FreshAICapabilityRuntimeResolution[] {
  return [...new Set(capabilities.map((capability) => capability.trim().toLowerCase()).filter(Boolean))]
    .map((capability) => resolveFreshAICapabilityRuntime(capability, approve));
}

/**
 * Files runtime boundary. It deliberately accepts bytes supplied by an already
 * authenticated request and delegates persistence to the existing Fresh-owned
 * Supabase media boundary. It never accepts a provider/model instruction.
 */
export async function executeFreshFileUpload(input: {
  userId: string | null;
  requestId: string;
  b64: string;
  mimeType: string;
  conversationId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; bucket: string; path: string; signedUrl: string }> {
  if (!input.userId) throw new Error("Fresh Files requires an authenticated user");
  if (!input.requestId.trim()) throw new Error("Fresh Files requires a request ID");
  if (!input.mimeType.trim()) throw new Error("Fresh Files requires a MIME type");
  if (!input.b64.trim()) throw new Error("Fresh Files requires file bytes");
  return persistFreshAIMedia({
    userId: input.userId,
    requestId: input.requestId,
    conversationId: input.conversationId,
    kind: "file",
    b64: input.b64,
    mimeType: input.mimeType,
    modelId: "fresh-unified-1",
    metadata: { ...input.metadata, capability: "files" },
  });
}

export function assertFreshAICapabilityRuntimeIntegrity(): void {
  const ids = new Set(FRESH_AI_CAPABILITIES.map((capability) => capability.id));
  for (const id of Object.values(UNIVERSAL_TO_PRODUCT)) {
    if (!ids.has(id)) throw new Error(`Fresh AI runtime maps to an unregistered capability: ${id}`);
  }
  const files = getFreshAICapability("files");
  if (files.status === "implemented" && typeof executeFreshFileUpload !== "function") {
    throw new Error("Fresh Files is marked implemented without an executable runtime");
  }
}
