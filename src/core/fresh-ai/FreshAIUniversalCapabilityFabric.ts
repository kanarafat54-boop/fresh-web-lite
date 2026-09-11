/**
 * Fresh AI Universal Capability Fabric
 *
 * The single vocabulary used to describe what Fresh AI can do. Surface-specific
 * registries may expose narrower views, but they resolve back to this contract.
 */
export const FRESH_AI_CAPABILITIES = [
  "understand", "chat", "voice", "search", "research", "knowledge", "analyze",
  "reason", "create", "write", "image", "video", "audio", "translate", "summarize",
  "plan", "remember", "learn", "code", "design", "automate", "verify", "act", "publish",
  "connect", "organize", "review", "compare", "moderate", "teach", "generate", "edit",
] as const;

export type FreshAIUniversalCapability = (typeof FRESH_AI_CAPABILITIES)[number];

export type FreshAIModelFamily = "orchestrator" | "text" | "voice" | "vision" | "image" | "video" | "audio" | "embedding";

export type FreshAIModelIdentity = {
  id: string;
  name: string;
  family: FreshAIModelFamily;
  capabilities: readonly FreshAIUniversalCapability[];
  available: boolean;
};

export type FreshAIUniversalContext = {
  surface: string;
  route: string;
  featureId?: string;
  featureName?: string;
  objectType?: string;
  objectId?: string;
  selection?: string;
  capabilities: readonly FreshAIUniversalCapability[];
  toolNamespaces: readonly string[];
  models: readonly FreshAIModelIdentity[];
  activeModelId: string;
  activeVoiceModelId: string;
  contextVersion: "1";
};

const ALIASES: Record<string, FreshAIUniversalCapability> = {
  understanding: "understand", intelligence: "reason", reasoning: "reason",
  conversation: "chat", conversations: "chat", speak: "voice", speech: "voice",
  web: "search", browsing: "search", knowledge: "knowledge", investigate: "research",
  coding: "code", engineering: "code", creative: "create", creation: "create",
  writing: "write", drafting: "write", images: "image", image_generation: "image",
  video_generation: "video", audio_generation: "audio", memory: "remember",
  tutoring: "teach", teaching: "teach", automation: "automate", actions: "act",
  execution: "act", safety: "verify", truth: "verify", verification: "verify",
  communication: "connect", messaging: "connect", publishing: "publish", editing: "edit",
};

export function normalizeFreshAICapability(value: string): FreshAIUniversalCapability | undefined {
  const key = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((FRESH_AI_CAPABILITIES as readonly string[]).includes(key)) return key as FreshAIUniversalCapability;
  return ALIASES[key];
}

export function normalizeFreshAICapabilities(values: readonly string[]): FreshAIUniversalCapability[] {
  return [...new Set(values.map(normalizeFreshAICapability).filter((x): x is FreshAIUniversalCapability => Boolean(x)))];
}

export const FRESH_AI_MODEL_IDENTITIES: readonly FreshAIModelIdentity[] = [
  { id: "fresh-auto", name: "Fresh Auto", family: "orchestrator", capabilities: ["understand", "chat", "research", "reason", "plan", "verify", "act"], available: true },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", family: "text", capabilities: ["chat", "write", "summarize", "analyze", "code", "learn"], available: true },
  { id: "device-voice", name: "Device Voice", family: "voice", capabilities: ["voice", "audio", "chat"], available: typeof window !== "undefined" && ("speechSynthesis" in window || "SpeechRecognition" in window || "webkitSpeechRecognition" in window), },
];

export const FRESH_AI_SURFACE_DEFAULTS: Record<string, readonly FreshAIUniversalCapability[]> = {
  home: ["chat", "search", "create", "voice", "act"],
  chat: ["chat", "voice", "translate", "summarize", "remember", "search", "create"],
  workspace: ["chat", "search", "research", "analyze", "create", "code", "plan", "automate", "act", "verify"],
  design: ["chat", "design", "image", "video", "audio", "create", "edit", "review"],
  code: ["chat", "code", "analyze", "review", "plan", "search", "automate", "verify"],
  media: ["chat", "image", "video", "audio", "voice", "analyze", "create", "edit", "publish"],
  learning: ["chat", "voice", "search", "research", "learn", "teach", "summarize", "translate", "verify"],
  communication: ["chat", "voice", "translate", "summarize", "create", "connect", "search", "moderate"],
  creator: ["chat", "create", "image", "video", "audio", "design", "research", "publish", "automate"],
  wallet: ["chat", "analyze", "research", "verify", "plan", "act"],
  research: ["chat", "search", "research", "knowledge", "analyze", "verify", "summarize"],
  social: ["chat", "voice", "video", "audio", "create", "connect", "search", "moderate"],
  marketplace: ["chat", "search", "research", "analyze", "compare", "plan", "act"],
  automation: ["chat", "plan", "automate", "review", "act", "verify"],
  trust: ["chat", "research", "knowledge", "verify", "analyze", "review"],
  admin: ["chat", "search", "analyze", "review", "verify", "plan"],
};

export function resolveFreshAIUniversalContext(input: {
  surface: string;
  route: string;
  featureId?: string;
  featureName?: string;
  capabilities?: readonly string[];
  toolNamespaces?: readonly string[];
  models?: readonly FreshAIModelIdentity[];
  activeModelId?: string;
  activeVoiceModelId?: string;
  objectType?: string;
  objectId?: string;
  selection?: string;
}): FreshAIUniversalContext {
  const defaults = FRESH_AI_SURFACE_DEFAULTS[input.surface] ?? FRESH_AI_SURFACE_DEFAULTS.workspace;
  return {
    surface: input.surface,
    route: input.route,
    featureId: input.featureId,
    featureName: input.featureName,
    objectType: input.objectType,
    objectId: input.objectId,
    selection: input.selection,
    capabilities: normalizeFreshAICapabilities([...(defaults ?? []), ...(input.capabilities ?? [])]),
    toolNamespaces: [...new Set(input.toolNamespaces ?? ["fresh-ai", "memory", "search", "workspace"])],
    models: input.models ?? FRESH_AI_MODEL_IDENTITIES,
    activeModelId: input.activeModelId ?? "fresh-auto",
    activeVoiceModelId: input.activeVoiceModelId ?? "device-voice",
    contextVersion: "1",
  };
}
