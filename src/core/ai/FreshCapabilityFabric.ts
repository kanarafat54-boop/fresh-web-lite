import { freshAI, type FreshAIRequest, type FreshAIResult, type FreshCapability } from "./FreshAI";

export type FreshPlanStep = {
  id: string;
  capability: string;
  goal: string;
  dependsOn: string[];
  status: "pending" | "running" | "completed" | "blocked";
};

export type FreshPlan = {
  goal: string;
  steps: FreshPlanStep[];
};

const CAPABILITY_ALIASES: Record<string, string[]> = {
  reasoning: ["reasoning"],
  math: ["mathematics", "math"],
  code: ["code", "engineering"],
  research: ["research", "evidence"],
  security: ["security"],
  design: ["design", "ui"],
  media: ["media"],
  data: ["data", "analysis"],
};

export class FreshCapabilityFabric {
  register(capability: FreshCapability) {
    freshAI.registerCapability(capability);
    return this;
  }

  discover(requested: string[] = []) {
    const ids = requested.flatMap((name) => CAPABILITY_ALIASES[name.toLowerCase()] ?? [name]);
    return [...new Set(ids)];
  }

  plan(goal: string, requestedCapabilities: string[] = []): FreshPlan {
    const capabilities = this.discover(requestedCapabilities);
    const steps: FreshPlanStep[] = capabilities.map((capability, index) => ({
      id: `step-${index + 1}`,
      capability,
      goal,
      dependsOn: index === 0 ? [] : [`step-${index}`],
      status: "pending",
    }));
    return { goal, steps };
  }

  async execute(request: FreshAIRequest): Promise<FreshAIResult> {
    const capabilities = this.discover(request.capabilities);
    return freshAI.reason({ ...request, capabilities });
  }
}

export const freshCapabilityFabric = new FreshCapabilityFabric();
