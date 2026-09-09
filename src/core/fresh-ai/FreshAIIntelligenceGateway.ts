/**
 * #TRUEMODE — Fresh AI Intelligence Gateway
 *
 * Canonical runtime boundary for Fresh AI. The gateway owns request lifecycle
 * orchestration while the kernel owns intelligence decisions. Providers and
 * route handlers must not become a second intelligence brain.
 */

import { FreshAIKernel, type FreshExecutionContext, type FreshMemoryStore, type FreshSkillRegistry, type FreshTruthEngine } from "./FreshAIKernel.js";
import type {
  Evidence,
  FreshConversationTurn,
  FreshExecutionResult,
  FreshFeedback,
  FreshIntent,
  FreshPipelineEvent,
  FreshReasoningResult,
  FreshReasoningRequest,
  FreshGoalInterpretation,
} from "./FreshAIArchitecture.js";

export type FreshAIRequest = {
  requestId: string;
  input: string;
  intent?: FreshIntent;
  route?: string;
  userId?: string | null;
  conversation?: FreshConversationTurn[];
  context?: Record<string, unknown>;
  evidence?: Evidence[];
  requestedAgents?: FreshReasoningRequest["requestedAgents"];
  dimensions?: FreshReasoningRequest["dimensions"];
  approve?: boolean;
  execute?: boolean;
};

export type FreshAIResponse = {
  requestId: string;
  interpretation: FreshGoalInterpretation;
  result: FreshReasoningResult;
  executions: FreshExecutionResult[];
  pipeline: FreshPipelineEvent[];
  status: "completed" | "approval-required" | "failed";
  error?: string;
};

export type FreshAIIntelligenceGatewayDependencies = {
  skills: FreshSkillRegistry;
  memory: FreshMemoryStore;
  truth?: FreshTruthEngine;
};

export class FreshAIIntelligenceGateway {
  private readonly kernel: FreshAIKernel;

  constructor(dependencies: FreshAIIntelligenceGatewayDependencies) {
    this.kernel = new FreshAIKernel(dependencies.skills, dependencies.memory, dependencies.truth);
  }

  async handle(request: FreshAIRequest): Promise<FreshAIResponse> {
    const conversation = Array.isArray(request.conversation) ? request.conversation.slice(-8) : [];
    const baseContext: Record<string, unknown> = {
      ...(request.context ?? {}),
      route: request.route ?? "/",
      userId: request.userId ?? null,
      conversation,
    };

    try {
      const understood = await this.kernel.understand({
        input: request.input,
        intent: request.intent,
        context: baseContext,
        evidence: request.evidence,
        requestedAgents: request.requestedAgents,
        dimensions: request.dimensions,
        conversation,
      });

      const interpretedContext = { ...understood.context, interpretation: understood.interpretation };
      const retrievalRequest: FreshReasoningRequest = {
        input: request.input,
        intent: understood.intent,
        context: interpretedContext,
        evidence: request.evidence,
        requestedAgents: request.requestedAgents,
        dimensions: request.dimensions,
        conversation,
      };
      const evidence = await this.kernel.retrieve(retrievalRequest);
      const reasoning = await this.kernel.reason(retrievalRequest, evidence);
      const plan = await this.kernel.plan(retrievalRequest, reasoning);
      const verified = await this.kernel.verify({ ...reasoning, plan });

      let executions: FreshExecutionResult[] = [];
      if (request.execute === true && plan.length > 0) {
        const executionContext: FreshExecutionContext = {
          approve: request.approve,
          requestId: request.requestId,
          origin: request.route,
          userId: request.userId,
        };
        executions = await this.kernel.execute(plan, executionContext);
      }

      const pipeline = Array.isArray(verified.pipeline) ? verified.pipeline : [];
      const approvalRequired = executions.some(item => item.status === "approval-required");
      const failed = executions.some(item => item.status === "failed");

      return {
        requestId: request.requestId,
        interpretation: understood.interpretation,
        result: verified,
        executions,
        pipeline,
        status: failed ? "failed" : approvalRequired ? "approval-required" : "completed",
      };
    } catch (error) {
      return {
        requestId: request.requestId,
        interpretation: this.fallbackInterpretation(request.input, request.intent),
        result: this.failureResult(request.input, error),
        executions: [],
        pipeline: [],
        status: "failed",
        error: error instanceof Error ? error.message : "Fresh AI gateway failed",
      };
    }
  }

  private fallbackInterpretation(input: string, intent?: FreshIntent): FreshGoalInterpretation {
    return {
      intent: intent ?? "answer",
      objective: input,
      desiredOutcome: "Return a safe response without inventing unavailable results.",
      outputMode: intent === "chat" ? "conversation" : "answer",
      needsEvidence: false,
      needsAction: intent === "act",
      needsClarification: false,
      constraints: [],
      entities: [],
      contextDependency: "none",
    };
  }

  private failureResult(input: string, error: unknown): FreshReasoningResult {
    const detail = error instanceof Error ? error.message : "Unknown gateway failure";
    return {
      answer: `Fresh AI could not complete this request safely: ${detail}`,
      claims: [],
      plan: [],
      actions: [],
      unknowns: [`Gateway failure while processing: ${input}`],
      explanation: "The gateway failed closed and did not claim an action or result that it could not verify.",
      pipeline: [],
    };
  }
}

export function createFreshAIIntelligenceGateway(dependencies: FreshAIIntelligenceGatewayDependencies): FreshAIIntelligenceGateway {
  return new FreshAIIntelligenceGateway(dependencies);
}

export type { FreshFeedback };
