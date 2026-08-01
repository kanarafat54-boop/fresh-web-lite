import type { AraAgent } from "../agents/agent";

class AgentTeam {
  private agents: AraAgent[] = [];

  register(agent: AraAgent) {
    this.agents.push(agent);
  }

  getAll() {
    return this.agents;
  }

  getActive() {
    return this.agents.filter((agent) => agent.status === "working");
  }
}

export const agentTeam = new AgentTeam();
