import { agentRuntime } from "./agentRuntime";
import "../defaultTools";

const DEFAULT_AGENTS = [
  { id: "fresh-ai", name: "Fresh AI", description: "Reasoning and intelligence", ecosystem: "ai", tools: ["fresh-ai"] },
  { id: "wallet", name: "Wallet Agent", description: "Finance operations", ecosystem: "finance", tools: ["wallet"] },
  { id: "feed", name: "Feed Agent", description: "Social content", ecosystem: "social", tools: ["feed"] },
  { id: "security", name: "Security Agent", description: "Fresh Shield", ecosystem: "security", tools: ["security"] },
  { id: "research", name: "Research Agent", description: "Evidence research and synthesis", ecosystem: "research", tools: ["search"] },
  { id: "architecture", name: "Architecture Agent", description: "System architecture reasoning", ecosystem: "engineering", tools: ["fresh-ai"] },
  { id: "backend", name: "Backend Agent", description: "Backend implementation workflows", ecosystem: "developer", tools: ["fresh-ai"] },
  { id: "frontend", name: "Frontend Agent", description: "Frontend implementation workflows", ecosystem: "developer", tools: ["fresh-ai"] },
  { id: "testing", name: "Testing Agent", description: "Verification and test workflows", ecosystem: "developer", tools: ["fresh-ai"] },
  { id: "documentation", name: "Documentation Agent", description: "Documentation workflows", ecosystem: "knowledge", tools: ["fresh-ai"] },
  { id: "deployment", name: "Deployment Agent", description: "Deployment workflows", ecosystem: "developer", tools: ["fresh-ai"] },
  { id: "media", name: "Media Agent", description: "Media understanding workflows", ecosystem: "media", tools: ["search"] },
  { id: "learning", name: "Learning Agent", description: "Learning and education workflows", ecosystem: "learning", tools: ["search"] },
] as const;

for (const agent of DEFAULT_AGENTS) {
  agentRuntime.register({
    ...agent,
    status: "idle",
    version: "2.0.0",
    active: true,
  });
}
