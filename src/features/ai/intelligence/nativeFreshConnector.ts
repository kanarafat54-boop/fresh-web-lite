import { freshReasoningEngine } from "../../../core/ai/FreshReasoningEngine";
import type {
  IntelligenceConnector,
  IntelligenceRequest,
  IntelligenceResponse,
} from "./intelligenceConnectors";

/**
 * Native Fresh intelligence path.
 *
 * This connector deliberately exposes only capabilities the current native
 * reasoning substrate can perform without pretending to be a hosted model.
 * External providers remain optional routing targets.
 */
export const nativeFreshConnector: IntelligenceConnector = {
  id: "fresh-native-reasoning",
  name: "Fresh Native Reasoning",
  tasks: ["planning", "orchestration"],
  isAvailable: () => true,
  async run(request: IntelligenceRequest): Promise<IntelligenceResponse> {
    const context = Object.fromEntries(
      (request.context ?? []).map((value, index) => [`context_${index + 1}`, value]),
    );
    const result = freshReasoningEngine.reason(request.prompt, context);

    const steps = result.steps
      .map((step, index) => `${index + 1}. [${step.mode}] ${step.statement}`)
      .join("\n");
    const unknowns = result.unknowns.length
      ? `\n\nUnknowns:\n- ${result.unknowns.join("\n- ")}`
      : "";

    return {
      provider: this.name,
      text: `${result.conclusion}\n\nReasoning structure:\n${steps}${unknowns}`,
      confidence: result.confidence >= 0.8 ? "high" : result.confidence >= 0.6 ? "medium" : "low",
    };
  },
};
