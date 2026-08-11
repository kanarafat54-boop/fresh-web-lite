/** Fresh Intelligence connector contracts. */
export type IntelligenceTask = "answer" | "research" | "coding" | "design" | "science" | "biology" | "robotics" | "optimization" | "planning" | "orchestration";
export type ResearchMode = "quick" | "deep" | "global" | "live" | "academic" | "business" | "people" | "local";
export type IntelligenceRequest = { prompt: string; task?: IntelligenceTask; query?: string; context?: readonly string[]; maxSources?: number; researchMode?: ResearchMode };
export type IntelligenceSource = { title: string; url: string; snippet?: string; publishedAt?: string; provider: string };
export type ResearchVerification = { passes: number; uniqueSources: number; uniqueDomains: number; sourceDiversity: "low" | "medium" | "high"; confidence: "low" | "medium" | "high" };
export type IntelligenceResponse = { text: string; provider: string; sources?: readonly IntelligenceSource[]; confidence?: "low" | "medium" | "high"; verification?: ResearchVerification; researchMode?: ResearchMode; searchedAt?: string };
export interface IntelligenceConnector { readonly id: string; readonly name: string; readonly tasks: readonly IntelligenceTask[]; isAvailable(): boolean; run(request: IntelligenceRequest): Promise<IntelligenceResponse> }
export type ConnectorHealth = { id: string; name: string; available: boolean; tasks: readonly IntelligenceTask[] };
export class ConnectorRegistry {
  private readonly connectors = new Map<string, IntelligenceConnector>();
  register(connector: IntelligenceConnector): void { this.connectors.set(connector.id, connector); }
  get(id: string): IntelligenceConnector | undefined { return this.connectors.get(id); }
  all(): readonly IntelligenceConnector[] { return Array.from(this.connectors.values()); }
  health(): readonly ConnectorHealth[] { return this.all().map((connector) => ({ id: connector.id, name: connector.name, available: connector.isAvailable(), tasks: connector.tasks })); }
}
export const intelligenceConnectors = new ConnectorRegistry();
export function createUnavailableConnector(id: string, name: string, tasks: readonly IntelligenceTask[]): IntelligenceConnector {
  return { id, name, tasks, isAvailable: () => false, async run(): Promise<IntelligenceResponse> { throw new Error(`${name} connector is not configured or authorized.`); } };
}
