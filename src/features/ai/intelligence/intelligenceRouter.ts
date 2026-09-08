import {
  type IntelligenceRequest,
  type IntelligenceResponse,
  type IntelligenceTask,
  type ResearchMode,
} from "./intelligenceConnectors";
import { runCanonicalAI } from "./canonicalAiBackend";

export type RoutingDecision = {
  connectorId: string;
  reason: string;
  task: IntelligenceTask;
  researchMode?: ResearchMode;
};

const TASK_KEYWORDS: Readonly<Record<IntelligenceTask, readonly string[]>> = {
  answer: ["what", "why", "how", "explain"],
  research: ["research", "latest", "sources", "search", "investigate", "find"],
  coding: ["code", "bug", "typescript", "javascript", "program", "repository"],
  design: ["design", "ui", "ux", "prototype", "interface"],
  science: ["physics", "chemistry", "science", "equation"],
  biology: ["biology", "protein", "gene", "cell", "medicine"],
  robotics: ["robot", "robotics", "simulation", "motion control"],
  optimization: ["optimize", "optimization", "algorithm", "efficiency"],
  planning: ["plan", "strategy", "roadmap", "architecture"],
  orchestration: ["agent", "workflow", "orchestrate", "automate"],
};

function inferTask(request: IntelligenceRequest): IntelligenceTask {
  if (request.task) return request.task;

  const text = `${request.prompt} ${request.query ?? ""}`.toLowerCase();
  let best: IntelligenceTask = "answer";
  let score = 0;

  for (const [task, keywords] of Object.entries(TASK_KEYWORDS) as Array<
    [IntelligenceTask, readonly string[]]
  >) {
    const candidateScore = keywords.reduce(
      (total, keyword) => total + (text.includes(keyword) ? 1 : 0),
      0,
    );
    if (candidateScore > score) {
      best = task;
      score = candidateScore;
    }
  }

  return best;
}

function inferResearchMode(request: IntelligenceRequest): ResearchMode | undefined {
  if (request.researchMode) return request.researchMode;

  const text = `${request.prompt} ${request.query ?? ""}`.toLowerCase();
  if (/(live|today|latest|breaking|news|current)/.test(text)) return "live";
  if (/(academic|paper|study|scientific|research paper)/.test(text)) return "academic";
  if (/(company|market|business|startup|stock|supplier)/.test(text)) return "business";
  if (/(who is|biography|person|people|founder)/.test(text)) return "people";
  if (/(near me|nearby|kampala|uganda|local)/.test(text)) return "local";
  if (/(deep|investigate|comprehensive|thorough)/.test(text)) return "deep";
  return "global";
}

/**
 * Compatibility router: task classification remains here, but execution is
 * intentionally owned by the canonical Fresh AI backend.
 */
export function routeIntelligence(request: IntelligenceRequest): RoutingDecision {
  const task = inferTask(request);
  const researchMode =
    task === "research" || request.researchMode
      ? inferResearchMode(request)
      : undefined;

  return {
    connectorId: "fresh-ai-canonical",
    task,
    researchMode,
    reason: `Fresh AI canonical backend selected for ${task}${
      researchMode ? ` in ${researchMode} research mode` : ""
    }.`,
  };
}

/**
 * Legacy callers keep the same API while all execution converges on /api/ai/ask.
 */
export async function runIntelligence(
  request: IntelligenceRequest,
): Promise<IntelligenceResponse> {
  return runCanonicalAI(request);
}
