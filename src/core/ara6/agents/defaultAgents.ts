import { agentRuntime } from "./agentRuntime";

agentRuntime.register({
  id: "fresh-ai",
  name: "Fresh AI",
  description: "Reasoning and intelligence",
  ecosystem: "ai",
  status: "idle",
  version: "1.0.0"
});

agentRuntime.register({
  id: "wallet",
  name: "Wallet Agent",
  description: "Finance operations",
  ecosystem: "finance",
  status: "idle",
  version: "1.0.0"
});

agentRuntime.register({
  id: "feed",
  name: "Feed Agent",
  description: "Social content",
  ecosystem: "social",
  status: "idle",
  version: "1.0.0"
});

agentRuntime.register({
  id: "security",
  name: "Security Agent",
  description: "Fresh Shield",
  ecosystem: "security",
  status: "idle",
  version: "1.0.0"
});
