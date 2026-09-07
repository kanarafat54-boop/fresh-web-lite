import type {
  AraToolHandler,
  AraToolPolicy,
  AraToolExecutionContext,
  AraToolExecutionInput,
  AraToolExecutionResult,
} from "./toolExecution";

export interface AraTool {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  enabled: boolean;
  policy?: AraToolPolicy;
  handler?: AraToolHandler;
}

class ToolRegistry {
  private tools: AraTool[] = [];

  register(tool: AraTool) {
    const exists = this.tools.find((t) => t.id === tool.id);
    if (exists) return;
    this.tools.push(tool);
  }

  unregister(id: string) {
    this.tools = this.tools.filter((tool) => tool.id !== id);
  }

  get(id: string) {
    return this.tools.find((tool) => tool.id === id);
  }

  getByCategory(category: string) {
    return this.tools.filter((tool) => tool.category === category);
  }

  list() {
    return this.tools;
  }

  async execute(
    toolId: string,
    input: AraToolExecutionInput,
    context: AraToolExecutionContext,
  ): Promise<AraToolExecutionResult> {
    const startedAt = new Date().toISOString();
    const tool = this.get(toolId);

    if (!tool || !tool.enabled) {
      return {
        status: "unavailable",
        toolId,
        agentId: context.agentId,
        error: "Tool is not registered or enabled.",
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }

    if (tool.policy?.requiresApproval && !context.approved) {
      return {
        status: "rejected",
        toolId,
        agentId: context.agentId,
        error: "Tool execution requires explicit approval.",
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }

    if (!tool.handler) {
      return {
        status: "unavailable",
        toolId,
        agentId: context.agentId,
        error: "Tool is registered but has no execution handler.",
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }

    try {
      const output = await tool.handler(input, context);
      return {
        status: "completed",
        toolId,
        agentId: context.agentId,
        output,
        startedAt,
        completedAt: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "failed",
        toolId,
        agentId: context.agentId,
        error: error instanceof Error ? error.message : "Tool execution failed.",
        startedAt,
        completedAt: new Date().toISOString(),
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
