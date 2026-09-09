export type FreshAISurface =
  | "home"
  | "chat"
  | "workspace"
  | "design"
  | "code"
  | "media"
  | "learning"
  | "wallet"
  | "creator"
  | "profile"
  | "admin"
  | "research"
  | "communication"
  | "marketplace"
  | "automation"
  | "trust"
  | "live"
  | "social"
  | "other";

export type FreshAICapability =
  | "chat"
  | "understand"
  | "research"
  | "write"
  | "summarize"
  | "analyze"
  | "plan"
  | "code"
  | "design"
  | "image"
  | "video"
  | "audio"
  | "voice"
  | "translate"
  | "learn"
  | "organize"
  | "connect"
  | "search"
  | "automate"
  | "review"
  | "verify"
  | "act"
  | "publish"
  | "compare"
  | "moderate";

export type FreshAIModelDescriptor = {
  id: string;
  name: string;
  family: "orchestrator" | "text" | "voice" | "vision" | "embedding";
  capabilities: FreshAICapability[];
  available: boolean;
};

export type FreshAIWorkspaceContext = {
  surface: FreshAISurface;
  route: string;
  featureId?: string;
  featureName?: string;
  title?: string;
  objectType?: string;
  objectId?: string;
  selection?: string;
  capabilities: FreshAICapability[];
  toolNamespaces: string[];
  models: FreshAIModelDescriptor[];
  activeModelId: string;
  activeVoiceModelId: string;
  contextVersion: "1";
};

const BASE_MODELS: FreshAIModelDescriptor[] = [
  {
    id: "fresh-auto",
    name: "Fresh Auto",
    family: "orchestrator",
    capabilities: ["chat", "understand", "research", "analyze", "plan", "act"],
    available: true,
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    family: "text",
    capabilities: ["chat", "write", "summarize", "analyze", "code", "learn"],
    available: true,
  },
  {
    id: "browser-voice",
    name: "Device Voice",
    family: "voice",
    capabilities: ["voice", "audio"],
    available: typeof window !== "undefined" && "speechSynthesis" in window,
  },
];

const SURFACE_RULES: Array<{
  match: RegExp;
  surface: FreshAISurface;
  featureName: string;
  capabilities: FreshAICapability[];
  toolNamespaces: string[];
}> = [
  { match: /\/connect|communication/i, surface: "communication", featureName: "Fresh Connect", capabilities: ["chat", "connect", "search", "summarize", "write", "translate"], toolNamespaces: ["connections", "messaging", "profiles"] },
  { match: /\/learn|learning/i, surface: "learning", featureName: "Fresh Academy", capabilities: ["chat", "learn", "research", "summarize", "write", "translate", "verify"], toolNamespaces: ["learning", "research", "knowledge"] },
  { match: /\/software|code/i, surface: "code", featureName: "Software Studio", capabilities: ["chat", "code", "analyze", "review", "plan", "search", "automate"], toolNamespaces: ["code", "repository", "testing", "deployment"] },
  { match: /\/studio|\/creator|design/i, surface: "design", featureName: "Creator Studio", capabilities: ["chat", "design", "image", "video", "audio", "write", "review", "plan"], toolNamespaces: ["design", "assets", "media", "publishing"] },
  { match: /\/wallet|\/crypto/i, surface: "wallet", featureName: "Fresh Wallet", capabilities: ["chat", "analyze", "research", "verify", "plan", "act"], toolNamespaces: ["wallet", "market", "risk", "security"] },
  { match: /\/creator/i, surface: "creator", featureName: "Creator", capabilities: ["chat", "write", "image", "video", "audio", "research", "plan", "publish"], toolNamespaces: ["creator", "media", "publishing"] },
  { match: /\/profile/i, surface: "profile", featureName: "Fresh Profile", capabilities: ["chat", "write", "summarize", "organize", "connect", "search"], toolNamespaces: ["profile", "connections"] },
  { match: /\/admin/i, surface: "admin", featureName: "Fresh Admin", capabilities: ["chat", "analyze", "search", "review", "verify", "plan"], toolNamespaces: ["admin", "analytics", "audit"] },
  { match: /\/marketplace/i, surface: "marketplace", featureName: "Fresh Marketplace", capabilities: ["chat", "search", "analyze", "compare", "research", "act"], toolNamespaces: ["marketplace", "search", "orders"] },
  { match: /\/automation/i, surface: "automation", featureName: "Fresh Automation", capabilities: ["chat", "plan", "automate", "review", "act"], toolNamespaces: ["automation", "tools", "jobs"] },
  { match: /\/trust/i, surface: "trust", featureName: "Fresh Trust", capabilities: ["chat", "research", "verify", "analyze", "review"], toolNamespaces: ["trust", "security", "evidence"] },
  { match: /\/live|\/calls|\/stories|\/groups|\/communities/i, surface: "social", featureName: "Fresh Social", capabilities: ["chat", "write", "audio", "voice", "video", "connect", "search", "moderate"], toolNamespaces: ["social", "media", "communication"] },
  { match: /\/true-mode|\/media/i, surface: "media", featureName: "TrueMode", capabilities: ["chat", "video", "image", "audio", "voice", "write", "design", "review"], toolNamespaces: ["media", "generation", "editing", "publishing"] },
  { match: /\/research/i, surface: "research", featureName: "Fresh Research", capabilities: ["chat", "research", "search", "verify", "analyze", "summarize"], toolNamespaces: ["research", "evidence", "knowledge"] },
  { match: /\/ai/i, surface: "chat", featureName: "Fresh AI", capabilities: ["chat", "understand", "research", "write", "summarize", "analyze", "plan", "code", "design", "voice"], toolNamespaces: ["fresh-ai", "research", "memory", "tools"] },
];

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function createFreshAIWorkspaceContext(route = "/"): FreshAIWorkspaceContext {
  const rule = SURFACE_RULES.find((item) => item.match.test(route));
  const surface = rule?.surface ?? (route === "/" ? "home" : "workspace");
  const capabilities = unique(rule?.capabilities ?? ["chat", "understand", "search", "research", "write", "summarize", "analyze", "plan"]);
  const models = BASE_MODELS.map((model) => ({ ...model, capabilities: [...model.capabilities] }));
  return {
    surface,
    route,
    featureId: route.split("/").filter(Boolean)[0] ?? "feed",
    featureName: rule?.featureName ?? "Fresh Workspace",
    capabilities,
    toolNamespaces: unique(rule?.toolNamespaces ?? ["workspace", "search", "memory", "fresh-ai"]),
    models,
    activeModelId: "fresh-auto",
    activeVoiceModelId: "browser-voice",
    contextVersion: "1",
  };
}

export function mergeFreshAIWorkspaceContext(
  base: FreshAIWorkspaceContext,
  patch: Partial<FreshAIWorkspaceContext>,
): FreshAIWorkspaceContext {
  return {
    ...base,
    ...patch,
    capabilities: unique([...(base.capabilities ?? []), ...(patch.capabilities ?? [])]),
    toolNamespaces: unique([...(base.toolNamespaces ?? []), ...(patch.toolNamespaces ?? [])]),
    models: patch.models ?? base.models,
  };
}

export const FRESH_AI_MODEL_REGISTRY = BASE_MODELS;
