export interface AraAgent {
  id: string;
  name: string;
  description: string;
  ecosystem: string;
  status: "idle" | "working";
  version: string;

  role?: string;
  active?: boolean;
}

export interface AgentTask {
  action: string;
}
