import { intentAnalyzer } from "./intentAnalyzer";
import { goalPlanner } from "./goalPlanner";
import { contextReader } from "./contextReader";
import { memoryReader } from "./memoryReader";

export interface ReasoningResult {

  input: string;

  goal: string;

  confidence: number;

  hasContext: boolean;

  memories: number;

  capabilityFound: boolean;

  capabilityId?: string;

}

class ReasoningEngine {

  reason(input: string, userId: string): ReasoningResult {

    const intent =
      intentAnalyzer.analyze(input);

    const plan =
      goalPlanner.plan(intent.goal);

    const context =
      contextReader.read();

    const memories =
      memoryReader.read(userId);

    return {

      input,

      goal: intent.goal,

      confidence: intent.confidence,

      hasContext: context !== null,

      memories: memories.length,

      capabilityFound: plan.found,

      capabilityId: plan.capabilityId

    };

  }

}

export const reasoningEngine =
new ReasoningEngine();
