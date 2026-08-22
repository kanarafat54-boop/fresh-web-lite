import type {
  Evidence,
  FreshIntent,
  FreshReasoningRequest,
  FreshReasoningResult,
  FreshSkill,
  FreshIntelligenceEngine,
} from "./FreshAIArchitecture";

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

/**
 * Provider-free orchestration kernel. This is deliberately a deterministic
 * shell around pluggable native reasoning, memory, truth and skill services.
 * No API key is read or required by the kernel.
 */
export class FreshAIKernel implements FreshIntelligenceEngine {
  private readonly skills: FreshSkillRegistry;
  private readonly memory: FreshMemoryStore;
  private readonly truth: FreshTruthEngine;

  constructor(skills: FreshSkillRegistry, memory: FreshMemoryStore, truth: FreshTruthEngine) {
    this.skills = skills;
    this.memory = memory;
    this.truth = truth;
  }

  async understand(request: FreshReasoningRequest) {
    const intent: FreshIntent = request.intent ?? inferIntent(request.input);
    const memories = await this.memory.search(request.input);
    return {
      intent,
      context: { ...(request.context ?? {}), memories },
    };
  }

  async retrieve(request: FreshReasoningRequest): Promise<Evidence[]> {
    const evidence = request.evidence ?? [];
    return this.truth.evaluate(evidence);
  }

  async reason(request: FreshReasoningRequest, evidence: Evidence[]): Promise<FreshReasoningResult> {
    const capabilities = inferCapabilities(request.input);
    const selectedSkills = this.skills.find(capabilities);
    return {
      answer: buildGroundedAnswer(request.input, evidence),
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
      })),
      actions: [],
      unknowns: evidence.length ? [] : ["No evidence was supplied to the native truth layer."],
      explanation: evidence.length
        ? "Fresh AI separated available evidence from inference and preserved confidence."
        : "Fresh AI has insufficient evidence and will not fabricate certainty.",
    };
  }

  async plan(_request: FreshReasoningRequest, result: FreshReasoningResult) {
    return result.plan;
  }

  async verify(result: FreshReasoningResult) {
    return result;
  }

  async execute(plan: FreshReasoningResult["plan"]) {
    // Execution is intentionally not performed by the kernel. Operational
    // agents own side effects and must enforce their own authorization gates.
    return plan.filter((step) => step.requiresApproval === false).map((step) => step.description);
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

function buildGroundedAnswer(input: string, evidence: Evidence[]): string {
  if (!evidence.length) return `Fresh AI received: ${input}`;
  return `Fresh AI evaluated ${evidence.length} evidence item(s) for: ${input}`;
}
