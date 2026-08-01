import type { AraAgent, AgentTask } from "./agent";

class AgentRuntime {

  private agents: AraAgent[] = [];

  register(agent: AraAgent) {
    this.agents.push(agent);
  }

  list() {
    return this.agents;
  }

  get(id: string) {
    return this.agents.find(agent => agent.id === id);
  }

  execute(agentId: string, task: AgentTask) {

    const agent = this.get(agentId);

    if (!agent) {
      return false;
    }

    agent.status = "working";

    console.log(
      "[" + agent.name + "]",
      "Executing:",
      task.action
    );

    agent.status = "idle";

    return true;
  }

}

export const agentRuntime =
new AgentRuntime();
