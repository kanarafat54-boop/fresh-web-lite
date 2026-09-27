import type { AraAgent, AgentExecutionResult, AgentTask } from "./agent.js";
import { toolRegistry } from "../toolRegistry.js";

class AgentRuntime {
  private agents: AraAgent[] = [];

  register(agent: AraAgent): void {
    if (this.get(agent.id)) return;
    this.agents.push(agent);
  }

  list(): AraAgent[] { return this.agents; }
  get(id: string): AraAgent | undefined { return this.agents.find((agent) => agent.id === id); }

  async execute(agentId: string, task: AgentTask): Promise<AgentExecutionResult> {
    const agent = this.get(agentId);
    if (!agent) return { accepted: false, error: `Agent '${agentId}' is not registered.` };

    const freshAi = task.metadata?.freshAi === true;
    if (freshAi) {
      const decisions = Array.isArray(task.metadata?.truthDecisions) ? task.metadata.truthDecisions as Array<{ claimId:string; decision:string; actionable:boolean }> : [];
      if (!decisions.length) return { accepted: false, error: "TRUEMODE decision evidence is required before ARA6 tool execution." };
      if (decisions.some((decision) => decision.decision === "BLOCK_ACTION" || decision.actionable !== true)) {
        return { accepted: false, error: `TRUEMODE blocked ARA6 tool execution for ${decisions.filter((decision) => decision.decision === "BLOCK_ACTION" || decision.actionable !== true).map((decision) => decision.claimId).join(", ")}.` };
      }
    }
    const toolId = task.toolId ?? this.resolveTool(agent, task.action);
    if (!toolId) return { accepted: false, error: `No executable tool is mapped to agent '${agentId}'.` };

    agent.status = "working";
    try {
      const result = await toolRegistry.execute(toolId, { action: task.action, input: task.input }, {
        agentId,
        taskId: task.taskId,
        requestId: task.requestId,
        approved: task.approved,
        metadata: task.metadata,
      });
      return { accepted: result.status === "completed", result };
    } finally {
      agent.status = "idle";
    }
  }

  private resolveTool(agent: AraAgent, action: string): string | undefined {
    if (agent.tools?.length) {
      const enabled = agent.tools.find((id) => toolRegistry.get(id)?.enabled);
      if (enabled) return enabled;
    }
    const normalized = action.toLowerCase();
    return toolRegistry.list().filter((tool) => tool.enabled).find((tool) =>
      normalized.includes(tool.id) || normalized.includes(tool.category) || normalized.includes(tool.name.toLowerCase()),
    )?.id;
  }
}

export const agentRuntime = new AgentRuntime();
