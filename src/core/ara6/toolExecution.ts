export type AraToolExecutionStatus = "completed" | "rejected" | "unavailable" | "failed";

export interface AraToolExecutionContext {
  agentId: string;
  taskId?: string;
  requestId?: string;
  approved?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
}

export interface AraToolExecutionInput {
  action: string;
  input?: unknown;
}

export interface AraToolExecutionResult {
  status: AraToolExecutionStatus;
  toolId: string;
  agentId: string;
  output?: unknown;
  error?: string;
  startedAt: string;
  completedAt: string;
  evidence?: Array<{
    id: string;
    kind: string;
    summary: string;
    confidence?: number;
  }>;
}

export type AraToolHandler = (
  input: AraToolExecutionInput,
  context: AraToolExecutionContext,
) => Promise<unknown> | unknown;

export interface AraToolPolicy {
  requiresApproval?: boolean;
  sideEffect?: boolean;
}
