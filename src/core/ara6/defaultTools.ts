import { toolRegistry } from "./toolRegistry";

const echoExecution = async (input: { action: string; input?: unknown }) => ({
  accepted: true,
  action: input.action,
  input: input.input ?? null,
  execution: "core-tool",
  completedAt: new Date().toISOString(),
});

const searchExecution = async (input: { action: string; input?: unknown }) => {
  if (typeof globalThis.fetch !== "function") {
    throw new Error("Search transport is unavailable in this runtime.");
  }

  const query =
    typeof input.input === "string"
      ? input.input
      : typeof input.input === "object" && input.input !== null && "query" in input.input
        ? String((input.input as { query: unknown }).query)
        : input.action;

  const response = await globalThis.fetch("/api/research/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, mode: "deep" }),
  });

  if (!response.ok) {
    throw new Error(`Research transport returned ${response.status}.`);
  }

  return response.json();
};

toolRegistry.register({
  id: "fresh-ai",
  name: "Fresh AI",
  category: "ai",
  description: "Fresh Intelligence reasoning boundary",
  version: "2.0.0",
  enabled: true,
  handler: echoExecution,
});

toolRegistry.register({
  id: "wallet",
  name: "Wallet",
  category: "finance",
  description: "Digital wallet operations",
  version: "2.0.0",
  enabled: true,
  policy: { requiresApproval: true, sideEffect: true },
  handler: echoExecution,
});

toolRegistry.register({
  id: "feed",
  name: "Feed",
  category: "social",
  description: "Fresh social feed operations",
  version: "2.0.0",
  enabled: true,
  policy: { requiresApproval: true, sideEffect: true },
  handler: echoExecution,
});

toolRegistry.register({
  id: "security",
  name: "Fresh Shield",
  category: "security",
  description: "Platform security operations",
  version: "2.0.0",
  enabled: true,
  handler: echoExecution,
});

toolRegistry.register({
  id: "search",
  name: "Universal Search",
  category: "search",
  description: "Fresh research and search transport",
  version: "2.0.0",
  enabled: true,
  handler: searchExecution,
});
