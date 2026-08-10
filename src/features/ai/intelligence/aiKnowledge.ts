/**
 * Fresh Intelligence capability catalog.
 *
 * This is deliberately a capability registry, not a claim that Fresh AI
 * secretly contains or owns another company's model. External systems are
 * represented as routing targets/integrations that require their official
 * APIs or authorized connectors before they can execute.
 */
export type AIKnowledgeDomain =
  | "general-reasoning"
  | "coding"
  | "design"
  | "science"
  | "biology"
  | "robotics"
  | "optimization"
  | "orchestration"
  | "research";

export type AIKnowledgeEntry = {
  id: string;
  name: string;
  organization: string;
  domains: AIKnowledgeDomain[];
  capabilities: string[];
  integrationMode: "provider-api" | "authorized-connector" | "research-adapter";
  availability: "catalogued" | "connected";
};

export const FRESH_AI_KNOWLEDGE: readonly AIKnowledgeEntry[] = [
  {
    id: "openai",
    name: "OpenAI",
    organization: "OpenAI",
    domains: ["general-reasoning", "coding", "research", "orchestration"],
    capabilities: ["reasoning", "coding", "tool use", "multimodal understanding"],
    integrationMode: "provider-api",
    availability: "catalogued",
  },
  {
    id: "anthropic-claude",
    name: "Claude",
    organization: "Anthropic",
    domains: ["general-reasoning", "coding", "research"],
    capabilities: ["long-context reasoning", "coding", "analysis"],
    integrationMode: "provider-api",
    availability: "catalogued",
  },
  {
    id: "google-gemini",
    name: "Gemini",
    organization: "Google",
    domains: ["general-reasoning", "coding", "research", "science"],
    capabilities: ["multimodal reasoning", "coding", "research"],
    integrationMode: "provider-api",
    availability: "connected",
  },
  {
    id: "meta-ai",
    name: "Meta AI",
    organization: "Meta",
    domains: ["general-reasoning", "research", "coding"],
    capabilities: ["assistant reasoning", "multimodal AI", "open-model ecosystem awareness"],
    integrationMode: "provider-api",
    availability: "catalogued",
  },
  {
    id: "cursor",
    name: "Cursor",
    organization: "Anysphere",
    domains: ["coding"],
    capabilities: ["AI-assisted software development", "codebase editing", "agentic coding"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    organization: "Codeium",
    domains: ["coding"],
    capabilities: ["agentic coding", "codebase workflows", "developer assistance"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    organization: "Anthropic",
    domains: ["coding"],
    capabilities: ["repository reasoning", "terminal workflows", "software engineering"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    organization: "GitHub",
    domains: ["coding"],
    capabilities: ["code completion", "coding assistance", "developer workflows"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "gemini-code-assist",
    name: "Gemini Code Assist",
    organization: "Google",
    domains: ["coding"],
    capabilities: ["code assistance", "developer workflows", "Google ecosystem integration"],
    integrationMode: "provider-api",
    availability: "catalogued",
  },
  {
    id: "v0",
    name: "v0",
    organization: "Vercel",
    domains: ["design", "coding"],
    capabilities: ["UI generation", "frontend prototyping", "web development"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "alphafold",
    name: "AlphaFold",
    organization: "Google DeepMind",
    domains: ["biology", "science"],
    capabilities: ["protein structure prediction", "structural biology research"],
    integrationMode: "research-adapter",
    availability: "catalogued",
  },
  {
    id: "esmfold",
    name: "ESMFold",
    organization: "Meta",
    domains: ["biology", "science"],
    capabilities: ["protein structure prediction", "protein language modeling"],
    integrationMode: "research-adapter",
    availability: "catalogued",
  },
  {
    id: "deepmind",
    name: "DeepMind research systems",
    organization: "Google DeepMind",
    domains: ["science", "research", "optimization", "robotics"],
    capabilities: ["scientific discovery", "reinforcement learning", "advanced AI research"],
    integrationMode: "research-adapter",
    availability: "catalogued",
  },
  {
    id: "alphadev",
    name: "AlphaDev",
    organization: "Google DeepMind",
    domains: ["optimization", "coding", "research"],
    capabilities: ["algorithm discovery", "optimization", "computer science research"],
    integrationMode: "research-adapter",
    availability: "catalogued",
  },
  {
    id: "alphatensor",
    name: "AlphaTensor",
    organization: "Google DeepMind",
    domains: ["optimization", "research"],
    capabilities: ["algorithm discovery", "matrix multiplication optimization"],
    integrationMode: "research-adapter",
    availability: "catalogued",
  },
  {
    id: "nvidia-isaac",
    name: "NVIDIA Isaac",
    organization: "NVIDIA",
    domains: ["robotics", "research"],
    capabilities: ["robotics simulation", "robot learning", "synthetic environments"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "nvidia-omniverse",
    name: "NVIDIA Omniverse",
    organization: "NVIDIA",
    domains: ["robotics", "design", "research"],
    capabilities: ["3D simulation", "digital twins", "collaborative simulation"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "crewai",
    name: "CrewAI",
    organization: "CrewAI",
    domains: ["orchestration", "coding", "research"],
    capabilities: ["multi-agent workflows", "task delegation", "agent orchestration"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "autogen",
    name: "AutoGen",
    organization: "Microsoft Research / community ecosystem",
    domains: ["orchestration", "coding", "research"],
    capabilities: ["multi-agent conversations", "agent workflows", "automation"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
  {
    id: "langgraph",
    name: "LangGraph",
    organization: "LangChain",
    domains: ["orchestration", "coding", "research"],
    capabilities: ["stateful agent graphs", "durable workflows", "agent orchestration"],
    integrationMode: "authorized-connector",
    availability: "catalogued",
  },
];

export function findAIKnowledge(query: string): AIKnowledgeEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [...FRESH_AI_KNOWLEDGE];

  return FRESH_AI_KNOWLEDGE.filter((entry) => {
    const searchable = [
      entry.id,
      entry.name,
      entry.organization,
      ...entry.domains,
      ...entry.capabilities,
    ]
      .join(" ")
      .toLowerCase();

    return normalized
      .split(/\s+/)
      .filter(Boolean)
      .some((term) => searchable.includes(term));
  });
}

export function getAIKnowledgeSummary(): string {
  return FRESH_AI_KNOWLEDGE.map(
    (entry) => `${entry.name}: ${entry.capabilities.join(", ")}`,
  ).join("\n");
}
