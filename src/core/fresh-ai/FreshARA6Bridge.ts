import type { FreshAgent, FreshPlanStep } from "./FreshAIArchitecture.js";
import { agentRuntime } from "../ara6/agents/agentRuntime.js";
import type { AgentTask } from "../ara6/agents/agent.js";
import "../ara6/agents/defaultAgents.js";

export type FreshARA6Execution = {
  stepId: string;
  agent?: FreshAgent;
  accepted: boolean;
  status: "executed" | "approval-required" | "unavailable" | "failed";
  detail: string;
};

type FreshARA6Context = {
  requestId?: string;
  origin?: string;
  userId?: string | null;
};

const AGENT_ALIASES: Record<string, string> = {
  research: "research", media: "media", learning: "learning",
  architecture: "architecture", backend: "backend", frontend: "frontend",
  testing: "testing", documentation: "documentation", deployment: "deployment",
  wallet: "wallet", feed: "feed", security: "security",
};

export async function executeFreshPlanThroughAra6(
  plan: FreshPlanStep[],
  approve = false,
  context: FreshARA6Context = {},
): Promise<FreshARA6Execution[]> {
  return Promise.all(plan.map(async (step) => {
    if (step.requiresApproval && !approve) {
      return { stepId: step.id, agent: step.agent, accepted: false, status: "approval-required" as const, detail: "Execution requires explicit approval." };
    }

    if (!step.agent) {
      return { stepId: step.id, accepted: false, status: "unavailable" as const, detail: "No ARA6 operational agent was selected." };
    }

    const agentId = AGENT_ALIASES[step.agent];
    if (!agentId || !agentRuntime.get(agentId)) {
      return { stepId: step.id, agent: step.agent, accepted: false, status: "unavailable" as const, detail: `ARA6 agent “${step.agent}” is not registered in this runtime.` };
    }

    const task: AgentTask = {
      action: step.description,
      taskId: step.id,
      requestId: context.requestId,
      approved: approve,
      metadata: {
        origin: context.origin,
        userId: context.userId,
        freshAi: true,
      },
    };
    const execution = await agentRuntime.execute(agentId, task);
    const result = execution.result;
    const status = result?.status === "failed" || result?.status === "timed-out" ? "failed" : execution.accepted ? "executed" : "unavailable";

    return {
      stepId: step.id,
      agent: step.agent,
      accepted: execution.accepted,
      status,
      detail: result?.error ?? (execution.accepted
        ? `ARA6 executed the task through ${agentId} using tool ${result?.toolId ?? "unknown"}.`
        : execution.error ?? `ARA6 could not execute the task through ${agentId}.`),
    };
  }));
}
