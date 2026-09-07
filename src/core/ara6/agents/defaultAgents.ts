import { agentRuntime } from "./agentRuntime";

const DEFAULT_AGENTS = [
  { id: "fresh-ai", name: "Fresh AI", description: "Reasoning and intelligence", ecosystem: "ai" },
  { id: "wallet", name: "Wallet Agent", description: "Finance operations", ecosystem: "finance" },
  { id: "feed", name: "Feed Agent", description: "Social content", ecosystem: "social" },
  { id: "security", name: "Security Agent", description: "Fresh Shield", ecosystem: "security" },
  { id: "research", name: "Research Agent", description: "Evidence research and synthesis", ecosystem: "research" },
  { id: "architecture", name: "Architecture Agent", description: "System architecture reasoning", ecosystem: "engineering" },
  { id: "backend", name: "Backend Agent", description: "Backend implementation workflows", ecosystem: "developer" },
  { id: "frontend", name: "Frontend Agent", description: "Frontend implementation workflows", ecosystem: "developer" },
  { id: "testing", name: "Testing Agent", description: "Verification and test workflows", ecosystem: "developer" },
  { id: "documentation", name: "Documentation Agent", description: "Documentation workflows", ecosystem: "knowledge" },
  { id: "deployment", name: "Deployment Agent", description: "Deployment workflows", ecosystem: "developer" },
  { id: "media", name: "Media Agent", description: "Media understanding workflows", ecosystem: "media" },
  { id: "learning", name: "Learning Agent", description: "Learning and education workflows", ecosystem: "learning" },
] as const;

for (const agent of DEFAULT_AGENTS) {
  agentRuntime.register({
    ...agent,
    status: "idle",
    version: "1.0.0",
  });
}
