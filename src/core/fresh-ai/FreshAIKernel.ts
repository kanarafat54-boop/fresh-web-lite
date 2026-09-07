import type {
  Evidence,
  FreshIntent,
  FreshReasoningRequest,
  FreshReasoningResult,
  FreshSkill,
  FreshIntelligenceEngine,
  FreshPlanStep,
} from "./FreshAIArchitecture.js";
import { SemanticTruthEngine } from "./semanticTruthEngine.js";
import { reasonAcrossDimensions } from "./dimensionalIntelligence.js";
import { executeFreshPlanThroughAra6 } from "./FreshARA6Bridge.js";

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

export type FreshExecutionContext = {
  approve?: boolean;
  requestId?: string;
  origin?: string;
  userId?: string | null;
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
    const capabilities = inferCapabilities(request.input, request.intent);
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
        description: `Apply ${skill.name} to fulfill: ${request.input.slice(0, 500)}`,
        skills: [skill.id],
        agent: agents[index] ?? inferAgent(skill.id),
        requiresApproval: skill.id === "wallet" || skill.id === "feed",
      })),
      actions: [],
      unknowns: evidence.length ? [] : ["No external or persistent evidence was supplied to the native truth layer."],
      explanation: `Fresh AI selected ${selectedSkills.length} skill(s) and used ${dimensionalReasoning.length} dimensional reasoning lens(es).`,
      dimensionalReasoning,
    };
  }

  async plan(_request: FreshReasoningRequest, result: FreshReasoningResult): Promise<FreshPlanStep[]> {
    return result.plan;
  }

  async verify(result: FreshReasoningResult) {
    const contradictions = result.claims.filter((claim) => claim.truth === "CONTRADICTED");
    return {
      ...result,
      unknowns: contradictions.length
        ? [...new Set([...result.unknowns, `${contradictions.length} contradiction(s) require resolution before a definitive answer.`])]
        : result.unknowns,
    };
  }

  async execute(plan: FreshPlanStep[], context: FreshExecutionContext = {}) {
    const executions = await executeFreshPlanThroughAra6(plan, Boolean(context.approve), {
      requestId: context.requestId,
      origin: context.origin,
      userId: context.userId,
    });
    return executions.map((execution) => ({
      stepId: execution.stepId,
      agent: execution.agent ?? null,
      accepted: execution.accepted,
      status: execution.status,
      detail: execution.detail,
    }));
  }
}

function inferIntent(input: string): FreshIntent {
  const value = input.toLowerCase();
  if (/research|investigate|sources|evidence|verify|fact.?check/.test(value)) return "research";
  if (/build|code|debug|program|implement|fix|refactor/.test(value)) return "code";
  if (/design|ui|ux|interface|layout/.test(value)) return "design";
  if (/plan|roadmap|strategy|steps|how should/.test(value)) return "plan";
  if (/analy[sz]e|compare|why|how|explain|difference/.test(value)) return "analyze";
  if (/send|post|publish|buy|pay|delete|change|update|book|schedule|execute|run/.test(value)) return "act";
  if (/learn|teach|study|lesson|practice/.test(value)) return "learn";
  if (/find|discover|recommend|show me|where/.test(value)) return "discover";
  if (/create|write|make|generate|draft/.test(value)) return "create";
  return "answer";
}

function inferCapabilities(input: string, intent?: FreshIntent): string[] {
  const value = input.toLowerCase();
  const capabilities = ["general-reasoning"];
  if (intent === "research" || /research|evidence|source|verify|fact.?check/.test(value)) capabilities.push("research", "evidence-analysis");
  if (intent === "code" || /code|debug|build|program|implement|fix|refactor/.test(value)) capabilities.push("code-generation", "code-review", "testing", "architecture");
  if (intent === "security" || /security|vulnerability|threat|privacy/.test(value)) capabilities.push("security");
  if (/math|equation|calculate|proof|statistics/.test(value)) capabilities.push("mathematics");
  if (intent === "design" || /design|ui|ux|interface|layout/.test(value)) capabilities.push("ui-ux-design", "design-systems");
  if (intent === "learn" || /learn|teach|study|lesson|practice/.test(value)) capabilities.push("learning");
  if (intent === "act" || /send|post|publish|buy|pay|delete|change|update|book|schedule|execute|run/.test(value)) capabilities.push("automation");
  return capabilities;
}

function inferAgent(skillId: string) {
  if (skillId === "research") return "research" as const;
  if (skillId === "security") return "security" as const;
  if (skillId === "engineering") return "backend" as const;
  if (skillId === "design") return "frontend" as const;
  if (skillId === "mathematics") return "learning" as const;
  if (skillId === "reasoning") return undefined;
  return undefined;
}

function buildGroundedAnswer(input: string, evidence: Evidence[], dimensions: ReturnType<typeof reasonAcrossDimensions>): string {
  const dimensionalSummary = dimensions.length ? ` across ${dimensions.length} dimensional reasoning layers` : "";
  if (!evidence.length) return `Fresh AI analyzed “${input}”${dimensionalSummary}, while preserving uncertainty where evidence is missing.`;
  return `Fresh AI evaluated ${evidence.length} evidence item(s) for “${input}”${dimensionalSummary}.`;
}
