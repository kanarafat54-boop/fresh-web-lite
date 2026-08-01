export type DecisionResult =
  | "allow"
  | "approval_required"
  | "deny";

export interface DecisionRequest {
  action: string;
  ecosystem: string;
  requiresSecurity: boolean;
  requiresAI: boolean;
}

class DecisionEngine {

  decide(request: DecisionRequest): DecisionResult {

    if (request.requiresSecurity) {
      return "approval_required";
    }

    if (request.requiresAI) {
      return "allow";
    }

    return "allow";
  }

}

export const decisionEngine = new DecisionEngine();
