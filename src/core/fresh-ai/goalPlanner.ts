export interface GoalPlanResult {
  found: boolean;
  capabilityId?: string;
}

class GoalPlanner {
  plan(goal: string): GoalPlanResult {
    if (!goal.trim()) {
      return { found: false };
    }
    return { found: true, capabilityId: goal.toLowerCase().replace(/\s+/g, "-") };
  }
}

export const goalPlanner = new GoalPlanner();
