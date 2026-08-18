export type FreshConfidence = "KNOWN" | "SUPPORTED" | "PROBABLE" | "UNCERTAIN" | "CONTRADICTED" | "UNKNOWN" | "BLOCKED";

export type FreshAIRequest = {
  goal: string;
  context?: Record<string, unknown>;
  capabilities?: string[];
  requireVerification?: boolean;
};

export type FreshAIResult = {
  answer?: string;
  confidence: FreshConfidence;
  evidence: Array<{ source: string; claim?: string; confidence?: FreshConfidence }>;
  actions: Array<{ name: string; status: "planned" | "completed" | "blocked"; result?: unknown }>;
  explanation: string;
};

export type FreshCapability = {
  id: string;
  description: string;
  run: (request: FreshAIRequest) => Promise<Partial<FreshAIResult>>;
};

/**
 * Provider-neutral Fresh AI contract. Product code depends on this interface,
 * never on a ChatGPT/Gemini/Claude SDK. A capability can be implemented by a
 * native algorithm, local engine, indexed knowledge system, or an approved
 * computation adapter while preserving the same Fresh-owned contract.
 */
export class FreshAI {
  private readonly capabilities = new Map<string, FreshCapability>();

  registerCapability(capability: FreshCapability) {
    this.capabilities.set(capability.id, capability);
  }

  async reason(request: FreshAIRequest): Promise<FreshAIResult> {
    if (!request.goal.trim()) {
      return {
        confidence: "BLOCKED",
        evidence: [],
        actions: [],
        explanation: "A goal is required before Fresh AI can reason about a task.",
      };
    }

    const selected = (request.capabilities ?? [])
      .map((id) => this.capabilities.get(id))
      .filter((capability): capability is FreshCapability => Boolean(capability));

    const results = await Promise.all(selected.map((capability) => capability.run(request)));
    const merged = results.reduce<Partial<FreshAIResult>>((acc, result) => ({
      ...acc,
      ...result,
      evidence: [...(acc.evidence ?? []), ...(result.evidence ?? [])],
      actions: [...(acc.actions ?? []), ...(result.actions ?? [])],
    }), {});

    return {
      confidence: merged.confidence ?? (selected.length ? "SUPPORTED" : "UNKNOWN"),
      answer: merged.answer,
      evidence: merged.evidence ?? [],
      actions: merged.actions ?? [],
      explanation: merged.explanation ?? "Fresh AI completed the available reasoning steps.",
    };
  }
}

export const freshAI = new FreshAI();
