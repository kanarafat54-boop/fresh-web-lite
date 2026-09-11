/**
 * Canonical Fresh AI capability registry.
 *
 * This registry describes product capabilities and their entry points. It does
 * not imply that every capability is already backed by trained foundation
 * model weights; unsupported execution must fail truthfully at its boundary.
 */

export type FreshAICapabilityId =
  | "conversation" | "voice" | "vision" | "search" | "research"
  | "creation" | "files" | "data" | "code" | "projects" | "knowledge"
  | "memory" | "skills" | "apps" | "work" | "tasks" | "library"
  | "automation" | "media-3d" | "trust" | "safety";

export type FreshAIEntryPoint =
  | "ask" | "voice" | "search" | "create" | "research" | "work"
  | "files" | "camera" | "more" | "settings" | "contextual";

export type FreshAICapabilityStatus = "contracted" | "implemented" | "training-required";

export interface FreshAICapabilityContract {
  readonly id: FreshAICapabilityId;
  readonly label: string;
  readonly entryPoints: readonly FreshAIEntryPoint[];
  readonly status: FreshAICapabilityStatus;
  readonly requiresApproval: boolean;
  readonly requiresVerification: boolean;
}

export const FRESH_AI_CAPABILITIES: readonly FreshAICapabilityContract[] = [
  ["conversation", "Conversation", ["ask"], "implemented", false, true],
  ["voice", "Voice", ["voice"], "contracted", false, true],
  ["vision", "Vision", ["files", "camera"], "contracted", false, true],
  ["search", "Search", ["search"], "implemented", false, true],
  ["research", "Research", ["research"], "implemented", false, true],
  ["creation", "Create", ["create"], "implemented", false, true],
  ["files", "Files", ["files"], "implemented", false, true],
  ["data", "Data", ["more"], "contracted", false, true],
  ["code", "Code", ["more"], "contracted", false, true],
  ["projects", "Projects", ["more"], "contracted", false, true],
  ["knowledge", "Knowledge", ["more"], "contracted", false, true],
  ["memory", "Memory", ["more", "settings"], "implemented", false, true],
  ["skills", "Skills", ["more"], "contracted", false, true],
  ["apps", "Apps", ["more"], "contracted", true, true],
  ["work", "Work", ["work"], "contracted", true, true],
  ["tasks", "Tasks", ["more"], "contracted", true, true],
  ["library", "Library", ["more"], "contracted", false, true],
  ["automation", "Automations", ["more"], "contracted", true, true],
  ["media-3d", "3D / Media", ["create", "more"], "contracted", false, true],
  ["trust", "Trust", ["contextual"], "implemented", false, true],
  ["safety", "Safety", ["settings"], "implemented", true, true],
].map(([id, label, entryPoints, status, requiresApproval, requiresVerification]) => ({
  id: id as FreshAICapabilityId,
  label: label as string,
  entryPoints: entryPoints as FreshAIEntryPoint[],
  status: status as FreshAICapabilityStatus,
  requiresApproval: requiresApproval as boolean,
  requiresVerification: requiresVerification as boolean,
}));

const VALID_ENTRY_POINTS = new Set<FreshAIEntryPoint>([
  "ask", "voice", "search", "create", "research", "work", "files", "camera", "more", "settings", "contextual",
]);

export function getFreshAICapability(id: FreshAICapabilityId): FreshAICapabilityContract {
  const capability = FRESH_AI_CAPABILITIES.find((item) => item.id === id);
  if (!capability) throw new Error(`Unknown Fresh AI capability: ${id}`);
  return capability;
}

export function assertFreshAICapabilityRegistryIntegrity(): void {
  const ids = FRESH_AI_CAPABILITIES.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Fresh AI capability registry contains duplicate IDs");
  for (const capability of FRESH_AI_CAPABILITIES) {
    if (!capability.entryPoints.length) throw new Error(`Fresh AI capability has no entry point: ${capability.id}`);
    if (!capability.entryPoints.every((entry) => VALID_ENTRY_POINTS.has(entry))) {
      throw new Error(`Fresh AI capability has an invalid entry point: ${capability.id}`);
    }
    if (!capability.label.trim()) throw new Error(`Fresh AI capability has no label: ${capability.id}`);
    if (!capability.requiresVerification) throw new Error(`Fresh AI capability bypasses verification: ${capability.id}`);
    if (capability.status === "training-required" && capability.requiresApproval) {
      throw new Error(`Training-required capability cannot imply executable approval flow: ${capability.id}`);
    }
  }
}
