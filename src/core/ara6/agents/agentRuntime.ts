import type { AraAgent, AgentExecutionResult, AgentTask } from "./agent";
import { toolRegistry } from "../toolRegistry";

class AgentRuntime {
  private agents: AraAgent[] = [];

  register(agent: AraAgent) {
    const exists = this.get(agent.id);
    if (exists) return;
    this.agents.push(agent);
  }

  list() {
    return this.agents;
  }

  get(id: string) {
    return this.agents.find((agent) => agent.id === id);
  }

  async execute(agentId: string, task: AgentTask): Promise<AgentExecutionResult> {
    const agent = this.get(agentId);
    if (!agent) {
      return { accepted: false, error: `Agent '${agentId}' is not registered.` };
    }

    const toolId = task.toolId ?? this.resolveTool(agent, task.action);
    if (!toolId) {
      return {
        accepted: false,
        error: `No executable tool is mapped to agent '${agentId}'.`,
      };
    }

    agent.status = "working";
    try {
      const result = await toolRegistry.execute(
        toolId,
        { action: task.action, input: task.input },
        {
          agentId,
          taskId: task.taskId,
          requestId: task.requestId,
          approved: task.approved,
          metadata: task.metadata,
        },
      );
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
    const candidates = toolRegistry.list().filter((tool) => tool.enabled);
    return candidates.find(
      (tool) =>
        normalized.includes(tool.id) ||
        normalized.includes(tool.category) ||
        normalized.includes(tool.name.toLowerCase()),
    )?.id;
  }
}

export const agentRuntime = new AgentRuntime();
