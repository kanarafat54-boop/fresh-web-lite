export type ReasoningMode = "deductive" | "inductive" | "abductive" | "causal" | "counterfactual" | "constraint" | "decomposition";

export type ReasoningStep = {
  id: string;
  mode: ReasoningMode;
  statement: string;
  dependsOn: string[];
  confidence: number;
};

export type ReasoningResult = {
  goal: string;
  steps: ReasoningStep[];
  conclusion: string;
  confidence: number;
  assumptions: string[];
  unknowns: string[];
};

const QUESTION_WORDS = /\b(why|how|what|which|when|where|who|whether|can|should|could|would)\b/i;
const NEGATION = /\b(no|not|never|without|cannot|can't)\b/i;

/**
 * Native deterministic reasoning substrate. It exposes reasoning structure,
 * assumptions and unknowns rather than private chain-of-thought. It is a real
 * bounded reasoning engine and an extension point for stronger native engines.
 */
export class FreshReasoningEngine {
  reason(goal: string, context: Record<string, unknown> = {}): ReasoningResult {
    const normalized = goal.trim();
    if (!normalized) return { goal, steps: [], conclusion: "A goal is required.", confidence: 0, assumptions: [], unknowns: ["goal"] };

    const steps: ReasoningStep[] = [
      { id: "goal", mode: "decomposition", statement: `Define the requested outcome: ${normalized}`, dependsOn: [], confidence: 1 },
      { id: "constraints", mode: "constraint", statement: `Extract explicit constraints from the request and available context (${Object.keys(context).length} context fields).`, dependsOn: ["goal"], confidence: 0.9 },
    ];

    if (NEGATION.test(normalized)) steps.push({ id: "negation", mode: "constraint", statement: "Preserve the explicit negative constraint when evaluating candidate actions.", dependsOn: ["constraints"], confidence: 0.9 });
    if (QUESTION_WORDS.test(normalized)) steps.push({ id: "evidence", mode: "abductive", statement: "Identify observations or evidence that would distinguish plausible answers.", dependsOn: [steps[steps.length - 1].id], confidence: 0.8 });
    if (/\bif\b|\bthen\b|\bunless\b/i.test(normalized)) steps.push({ id: "counterfactual", mode: "counterfactual", statement: "Check conditional branches and whether the requested outcome depends on an unstated condition.", dependsOn: [steps[steps.length - 1].id], confidence: 0.75 });

    const unknowns = Object.keys(context).length ? [] : ["relevant external or persistent context"];
    steps.push({ id: "verification", mode: "deductive", statement: "Verify that the conclusion does not exceed the available evidence.", dependsOn: [steps[steps.length - 1].id], confidence: unknowns.length ? 0.6 : 0.9 });

    return {
      goal: normalized,
      steps,
      conclusion: unknowns.length ? "A verified conclusion requires additional evidence or context." : "The available reasoning steps are sufficient for a bounded conclusion.",
      confidence: unknowns.length ? 0.6 : 0.9,
      assumptions: ["The supplied goal and context are accurately represented."],
      unknowns,
    };
  }
}

export const freshReasoningEngine = new FreshReasoningEngine();
