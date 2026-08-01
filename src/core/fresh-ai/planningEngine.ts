import { reasoningEngine } from "./reasoningEngine";

export interface PlanStep {
  id: string;
  title: string;
  ecosystem: string;
  requiresApproval: boolean;
  completed: boolean;
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  createdAt: string;
  steps: PlanStep[];
}

class PlanningEngine {

  createPlan(input: string, userId: string): ExecutionPlan {

    const result = reasoningEngine.reason(input, userId);

    const steps: PlanStep[] = [];

    if (result.capabilityFound) {

      steps.push({
        id: "analyze",
        title: "Analyze Goal",
        ecosystem: "Fresh AI",
        requiresApproval: false,
        completed: false
      });

      steps.push({
        id: "security",
        title: "Security Verification",
        ecosystem: "Fresh Shield",
        requiresApproval: true,
        completed: false
      });

      steps.push({
        id: "execute",
        title: "Execute Workflow",
        ecosystem: "Ara6",
        requiresApproval: false,
        completed: false
      });

    }

    return {

      id: crypto.randomUUID(),

      goal: result.goal,

      createdAt: new Date().toISOString(),

      steps

    };

  }

}

export const planningEngine =
new PlanningEngine();
