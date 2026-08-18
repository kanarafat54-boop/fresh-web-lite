import { freshAI } from "./FreshAI";
import { freshReasoningEngine } from "./FreshReasoningEngine";

export function registerFreshNativeCapabilities() {
  freshAI.registerCapability({
    id: "reasoning",
    description: "Native goal decomposition, assumptions, unknowns and bounded reasoning.",
    run: async (request) => {
      const result = freshReasoningEngine.reason(request.goal, request.context);
      return {
        answer: result.conclusion,
        confidence: result.confidence >= 0.9 ? "SUPPORTED" : "UNCERTAIN",
        evidence: [],
        actions: [],
        explanation: result.steps.map((step) => step.statement).join(" "),
      };
    },
  });

  return freshAI;
}

export const nativeFreshAI = registerFreshNativeCapabilities();
