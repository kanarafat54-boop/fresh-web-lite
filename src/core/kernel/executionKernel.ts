import { planningEngine } from "../fresh-ai/planningEngine";
import { decisionEngine } from "../ara6/decisionEngine";

export interface KernelRequest {

  userId: string;

  input: string;

}

export interface KernelResponse {

  accepted: boolean;

  plan?: ReturnType<typeof planningEngine.createPlan>;

  decision: "allow" | "approval_required" | "deny";

}

class ExecutionKernel {

  execute(request: KernelRequest): KernelResponse {

    const plan =
      planningEngine.createPlan(
        request.input,
        request.userId
      );

    const decision =
      decisionEngine.decide({

        action: request.input,

        ecosystem: "general",

        requiresSecurity: false,

        requiresAI: true

      });

    if (decision === "deny") {

      return {

        accepted: false,

        decision

      };

    }

    return {

      accepted: true,

      decision,

      plan

    };

  }

}

export const executionKernel =
new ExecutionKernel();
