export type FreshAgentTask = {
  id: string;
  agent: string;
  goal: string;
  dependsOn?: string[];
  priority?: number;
};

export type FreshAgentResult = {
  taskId: string;
  agent: string;
  status: "completed" | "blocked" | "failed";
  result?: unknown;
};

/**
 * Dependency-aware scheduler for Fresh agents. Agents remain operational
 * managers; the scheduler does not grant permissions or bypass safety rules.
 */
export class FreshSwarmScheduler {
  async run(tasks: FreshAgentTask[], execute: (task: FreshAgentTask) => Promise<unknown>): Promise<FreshAgentResult[]> {
    const pending = new Map(tasks.map((task) => [task.id, task]));
    const results = new Map<string, FreshAgentResult>();

    while (pending.size) {
      const ready = [...pending.values()]
        .filter((task) => (task.dependsOn ?? []).every((id) => results.get(id)?.status === "completed"))
        .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

      if (!ready.length) {
        for (const task of pending.values()) {
          results.set(task.id, { taskId: task.id, agent: task.agent, status: "blocked" });
        }
        break;
      }

      const batch = await Promise.all(ready.map(async (task) => {
        try {
          const result = await execute(task);
          return { taskId: task.id, agent: task.agent, status: "completed" as const, result };
        } catch (error) {
          return { taskId: task.id, agent: task.agent, status: "failed" as const, result: error instanceof Error ? error.message : error };
        }
      }));

      batch.forEach((result) => {
        results.set(result.taskId, result);
        pending.delete(result.taskId);
      });
    }

    return [...results.values()];
  }
}

export const freshSwarmScheduler = new FreshSwarmScheduler();
