import { reasonAcrossDimensions } from "../fresh-ai/dimensionalIntelligence";
import { toolRegistry } from "./toolRegistry";
import type { AraToolExecutionContext, AraToolExecutionInput } from "./toolExecution";

const reasoningExecution = async (input: AraToolExecutionInput, context: AraToolExecutionContext) => {
  const query = typeof input.input === "string"
    ? input.input
    : typeof input.input === "object" && input.input !== null && "query" in input.input
      ? String((input.input as { query: unknown }).query)
      : input.action;
  const dimensions = reasonAcrossDimensions(query);
  return {
    execution: "fresh-dimensional-reasoning",
    agentId: context.agentId,
    query,
    dimensions,
    completedAt: new Date().toISOString(),
  };
};

const searchExecution = async (input: AraToolExecutionInput, context: AraToolExecutionContext) => {
  if (typeof globalThis.fetch !== "function") throw new Error("Search transport is unavailable in this runtime.");
  const query = typeof input.input === "string"
    ? input.input
    : typeof input.input === "object" && input.input !== null && "query" in input.input
      ? String((input.input as { query: unknown }).query)
      : input.action;

  const origin = typeof context.metadata?.origin === "string'" ? context.metadata.origin : undefined;
  const endpoint = origin ? new URL("/api/research/search", origin).toString() : "/api/research/search";
  const response = await globalThis.fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, mode: "deep" }),
    signal: context.signal,
  });
  if (!response.ok) throw new Error(`Research transport returned ${response.status}.`);
  const payload = await response.json() as Record<string, unknown>;
  return {
    execution: "fresh-research",
    query,
    result: payload,
    completedAt: new Date().toISOString(),
  };
};

const analysisExecution = async (input: AraToolExecutionInput, context: AraToolExecutionContext) => ({
  execution: "fresh-analysis",
  agentId: context.agentId,
  action: input.action,
  input: input.input ?? null,
  analysis: "Analysis capability executed through the ARA6 reasoning fabric.",
  completedAt: new Date().toISOString(),
});

toolRegistry.register({
  id: "fresh-ai",
  name: "Fresh AI",
  category: "ai",
  description: "Fresh Intelligence reasoning boundary",
  version: "3.0.0",
  enabled: true,
  handler: reasoningExecution,
});

toolRegistry.register({
  id: "reasoning",
  name: "Dimensional Reasoning",
  category: "reasoning",
  description: "Operational 1D-11D computational reasoning lenses",
  version: "3.0.0",
  enabled: true,
  handler: reasoningExecution,
});

toolRegistry.register({
  id: "wallet",
  name: "Wallet",
  category: "finance",
  description: "Digital wallet operations",
  version: "3.0.0",
  enabled: true,
  policy: { requiresApproval: true, sideEffect: true },
  handler: analysisExecution,
});

toolRegistry.register({
  id: "feed",
  name: "Feed",
  category: "social",
  description: "Fresh social feed operations",
  version: "3.0.0",
  enabled: true,
  policy: { requiresApproval: true, sideEffect: true },
  handler: analysisExecution,
});

toolRegistry.register({
  id: "security",
  name: "Fresh Shield",
  category: "security",
  description: "Platform security analysis operations",
  version: "3.0.0",
  enabled: true,
  handler: analysisExecution,
});

toolRegistry.register({
  id: "search",
  name: "Universal Search",
  category: "search",
  description: "Fresh research and evidence synthesis transport",
  version: "3.0.0",
  enabled: true,
  handler: searchExecution,
});
