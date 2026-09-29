import type { FreshConversationTurn, FreshGoalInterpretation } from "./FreshAIArchitecture.js";
import type { FreshAIRequest, FreshAIResponse, FreshAIIntelligenceGatewayDependencies } from "./FreshAIIntelligenceGateway.js";
import { createFreshAIIntelligenceGateway } from "./FreshAIIntelligenceGateway.js";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "./FreshAIWorkspaceContext.js";
import { understandFreshGoal } from "./FreshGoalUnderstanding.js";
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshAIPlatformStep = {
  id: number;
  key: string;
  label: string;
  boundary: string;
  status: "wired" | "contracted";
};

export const FRESH_AI_PLATFORM_20: readonly FreshAIPlatformStep[] = [
  { id: 1, key: "core", label: "Fresh AI Core", boundary: "FreshAIIntelligenceGateway + FreshAIKernel", status: "wired" },
  { id: 2, key: "identity-context", label: "AI Identity & Context", boundary: "Fresh Unified model + workspace context", status: "wired" },
  { id: 3, key: "intelligence", label: "Fresh Intelligence Layer", boundary: "goal, reasoning, truth and verification", status: "wired" },
  { id: 4, key: "universal-search", label: "Universal AI Search", boundary: "research/evidence retrieval boundary", status: "wired" },
  { id: 5, key: "goal-engine", label: "Goal Engine", boundary: "FreshGoalUnderstanding", status: "wired" },
  { id: 6, key: "universal-agents", label: "Universal Agent System", boundary: "governed Fresh agents and Ara6 bridge", status: "wired" },
  { id: 7, key: "digital-os", label: "Personal Digital OS", boundary: "workspace + project/tool context", status: "wired" },
  { id: 8, key: "cross-app-memory", label: "Cross-app Memory", boundary: "Fresh AI memory store", status: "wired" },
  { id: 9, key: "context-switching", label: "Context Switching Intelligence", boundary: "surface-aware workspace context", status: "wired" },
  { id: 10, key: "skills-marketplace", label: "AI Skills Marketplace", boundary: "Fresh skill registry/runtime", status: "wired" },
  { id: 11, key: "engineering-workspace", label: "Autonomous Engineering Workspace", boundary: "proposal/approval/execution boundary", status: "wired" },
  { id: 12, key: "knowledge-network", label: "Fresh Knowledge Network", boundary: "evidence, provenance and knowledge graph contracts", status: "wired" },
  { id: 13, key: "recommendation", label: "Recommendation Intelligence", boundary: "shared recommendation/reranking engine", status: "wired" },
  { id: 14, key: "media-intelligence", label: "AI Media Intelligence", boundary: "media runtime and pipeline adapters", status: "wired" },
  { id: 15, key: "trust", label: "Trust Layer", boundary: "truth decisions, permissions and verification", status: "wired" },
  { id: 16, key: "observability", label: "AI Observability", boundary: "observable pipeline stages and persistence", status: "wired" },
  { id: 17, key: "api-boundary", label: "Secure AI API Boundary", boundary: "server-side privileged execution", status: "wired" },
  { id: 18, key: "fallbacks", label: "Provider/Runtime Fallbacks", boundary: "native reasoning first; external answer provider opt-in", status: "wired" },
  { id: 19, key: "universal-ui", label: "Universal AI UI", boundary: "workspace-aware Fresh AI entry points", status: "wired" },
  { id: 20, key: "certification", label: "Fresh AI Certification", boundary: "contract verification + fail-closed runtime", status: "wired" },
] as const;

export type FreshAIPlatformRuntime = {
  modelId: typeof FRESH_UNIFIED_MODEL.id;
  steps: typeof FRESH_AI_PLATFORM_20;
  workspace: (route?: string, patch?: Partial<FreshAIWorkspaceContext>) => FreshAIWorkspaceContext;
  interpret: (input: string, conversation?: FreshConversationTurn[]) => FreshGoalInterpretation;
  handle: (request: Omit<FreshAIRequest, "requestId"> & { requestId?: string }) => Promise<FreshAIResponse>;
  execute: (request: Omit<FreshAIRequest, "requestId" | "execute"> & { requestId?: string; execute?: boolean }) => Promise<FreshAIResponse>;
};

export function createFreshAIPlatformRuntime(
  dependencies: FreshAIIntelligenceGatewayDependencies,
): FreshAIPlatformRuntime {
  const gateway = createFreshAIIntelligenceGateway(dependencies);

  const workspace = (route = "/", patch: Partial<FreshAIWorkspaceContext> = {}) =>
    ({ ...createFreshAIWorkspaceContext(route), ...patch }) as FreshAIWorkspaceContext;

  const handle = async (
    request: Omit<FreshAIRequest, "requestId"> & { requestId?: string },
  ): Promise<FreshAIResponse> =>
    gateway.handle({
      ...request,
      requestId: request.requestId ?? crypto.randomUUID(),
      route: request.route ?? "/",
      context: {
        ...(request.context ?? {}),
        workspace: request.context?.workspace ?? workspace(request.route ?? "/"),
        modelId: FRESH_UNIFIED_MODEL.id,
      },
    });

  return {
    modelId: FRESH_UNIFIED_MODEL.id,
    steps: FRESH_AI_PLATFORM_20,
    workspace,
    interpret: (input, conversation = []) => {
      const text = input.trim();
      if (!text) throw new Error("Fresh AI requires a non-empty goal");
      return understandFreshGoal(text, conversation);
    },
    handle,
    execute: (request) => handle({ ...request, execute: request.execute ?? true }),
  };
}
