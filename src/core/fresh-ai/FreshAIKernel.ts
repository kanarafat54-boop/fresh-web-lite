import type {
  Evidence,
  FreshIntent,
  FreshReasoningRequest,
  FreshReasoningResult,
  FreshSkill,
  FreshIntelligenceEngine,
} from "./FreshAIArchitecture";
import { SemanticTruthEngine } from "./semanticTruthEngine";
import { reasonAcrossDimensions } from "./dimensionalIntelligence";
import { executeFreshPlanThroughAra6 } from "./FreshARA6Bridge";

export type FreshMemoryRecord = {
  id: string;
  content: string;
  scope: "user" | "project" | "platform" | "session";
  createdAt: string;
  source?: string;
};

export type FreshSkillRegistry = {
  register(skill: FreshSkill): void;
  find(capabilities: string[]): FreshSkill[];
};

export type FreshMemoryStore = {
  search(query: string, scope?: FreshMemoryRecord["scope"]): Promise<FreshMemoryRecord[]>;
  remember(record: FreshMemoryRecord): Promise<void>;
};

export type FreshTruthEngine = {
  evaluate(evidence: Evidence[]): Promise<Evidence[]>;
};

export class FreshAIKernel implements FreshIntelligenceEngine {
  private readonly skills: FreshSkillRegistry;
  private readonly memory: FreshMemoryStore;
  private readonly truth: FreshTruthEngine;

  constructor(skills: FreshSkillRegistry, memory: FreshMemoryStore, truth: FreshTruthEngine = new SemanticTruthEngine()) {
    this.skills = skills;
    this.memory = memory;
    this.truth = truth;
  }

  async understand(request: FreshReasoningRequest) {
    const intent: FreshIntent = request.intent ?? inferIntent(request.input);
    const memories = await this.memory.search(request.input);
    return { intent, context: { ...(request.context ?? {}), memories } };
  }

  async retrieve(request: FreshReasoningRequest): Promise<Evidence[]> {
    return this.truth.evaluate(request.evidence ?? []);
  }

  async reason(request: FreshReasoningRequest, evidence: Evidence[]): Promise<FreshReasoningResult> {
    const capabilities = inferCapabilities(request.input);
    const selectedSkills = this.skills.find(capabilities);
    const dimensionalReasoning = reasonAcrossDimensions(request.input, request.dimensions);
    const agents = request.requestedAgents ?? [];

    return {
      answer: buildGroundedAnswer(request.input, evidence, dimensionalReasoning),
      claims: evidence.map((item) => ({
        statement: item.claim,
        truth: item.confidence >= 0.9 ? "KNOWN" : item.confidence >= 0.6 ? "PROBABLE" : "UNCERTAIN",
        confidence: item.confidence,
        evidence: [item],
      })),
      plan: selectedSkills.map((skill, index) => ({
        id: `step-${index + 1}`,
        description: `Apply ${skill.name}`,
        skills: [skill.id],
        agent: agents[index] ?? inferAgent(skill.id),
        requiresApproval: false,
      })),
      actions: [],
      unknowns: evidence.length ? [] : ["No external or persistent evidence was supplied to the native truth layer."],
      explanation: `Fresh AI used the native truth layer plus ${dimensionalReasoning.length} dimensional reasoning lens(es).`,
      dimensionalReasoning,
    };
  }

  async plan(_request: FreshReasoningRequest, result: FreshReasoningResult) {
    return result.plan;
  }

  async verify(result: FreshReasoningResult) {
    return result;
  }

  async execute(plan: FreshReasoningResult["plan"]) {
    return executeFreshPlanThroughAra6(plan)
      .filter((result) => result.accepted)
      .map((result) => result.detail);
  }
}

function inferIntent(input: string): FreshIntent {
  const value = input.toLowerCase();
  if (/research|investigate|sources|evidence/.test(value)) return "research";
  if (/build|code|debug|program|implement/.test(value)) return "code";
  if (/design|ui|ux|interface/.test(value)) return "design";
  if (/plan|roadmap/.test(value)) return "plan";
  if (/analy[sz]e|compare|why|how/.test(value)) return "analyze";
  if (/create|write|make/.test(value)) return "create";
  return "answer";
}

function inferCapabilities(input: string): string[] {
  const value = input.toLowerCase();
  const capabilities = ["general-reasoning"];
  if (/research|evidence|source/.test(value)) capabilities.push("research", "evidence-analysis");
  if (/code|debug|build|program/.test(value)) capabilities.push("code-generation", "code-review", "testing");
  if (/security|vulnerability|threat/.test(value)) capabilities.push("security");
  if (/math|equation|calculate|proof/.test(value)) capabilities.push("mathematics");
  if (/design|ui|ux/.test(value)) capabilities.push("ui-ux-design", "design-systems");
  return capabilities;
}

function inferAgent(skillId: string) {
  if (skillId === "research") return "research" as const;
  if (skillId === "security") return "security" as const;
  if (skillId === "engineering") return "backend" as const;
  if (skillId === "design") return "frontend" as const;
  if (skillId === "mathematics") return "learning" as const;
  return undefined;
}

function buildGroundedAnswer(input: string, evidence: Evidence[], dimensions: ReturnType<typeof reasonAcrossDimensions>): string {
  const dimensionalSummary = dimensions.length ? ` across ${dimensions.length} dimensional reasoning layers` : "";
  if (!evidence.length) return `Fresh AI analyzed “${input}”${dimensionalSummary}, while preserving uncertainty where evidence is missing.`;
  return `Fresh AI evaluated ${evidence.length} evidence item(s) for “${input}”${dimensionalSummary}.`;
}
