import type { FreshAgent, FreshPlanStep } from "./FreshAIArchitecture";
import { agentRuntime } from "../ara6/agents/agentRuntime";
import type { AgentTask } from "../ara6/agents/agent";

/**
 * Fresh AI -> ARA6 operational bridge.
 * Fresh AI chooses what should happen; ARA6 performs the operational step.
 * This bridge deliberately returns execution facts instead of pretending
 * that an agent exists merely because it is named in a plan.
 */
export type FreshARA6Execution = {
  stepId: string;
  agent?: FreshAgent;
  accepted: boolean;
  status: "executed" | "approval-required" | "unavailable";
  detail: string;
};

const AGENT_ALIASES: Record<string, string> = {
  research: "research",
  media: "media",
  learning: "learning",
  architecture: "architecture",
  backend: "backend",
  frontend: "frontend",
  testing: "testing",
  documentation: "documentation",
  deployment: "deployment",
  wallet: "wallet",
  feed: "feed",
  security: "security",
};

export function executeFreshPlanThroughAra6(plan: FreshPlanStep[], approve = false): FreshARA6Execution[] {
  return plan.map((step) => {
    if (step.requiresApproval && !approve) {
      return { stepId: step.id, agent: step.agent, accepted: false, status: "approval-required", detail: "Execution requires explicit approval." };
    }

    if (!step.agent) {
      return { stepId: step.id, accepted: false, status: "unavailable", detail: "No ARA6 operational agent was selected." };
    }

    const agentId = AGENT_ALIASES[step.agent];
    if (!agentId || !agentRuntime.get(agentId)) {
      return { stepId: step.id, agent: step.agent, accepted: false, status: "unavailable", detail: `ARA6 agent “${step.agent}” is not registered in this runtime.` };
    }

    const task: AgentTask = { action: step.description };
    const accepted = agentRuntime.execute(agentId, task);
    return {
      stepId: step.id,
      agent: step.agent,
      accepted,
      status: accepted ? "executed" : "unavailable",
      detail: accepted ? `ARA6 accepted the task through ${agentId}.` : `ARA6 rejected the task for ${agentId}.`,
    };
  });
}
