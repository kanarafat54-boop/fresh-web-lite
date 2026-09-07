export type AraToolExecutionStatus = "completed" | "rejected" | "unavailable" | "failed" | "timed-out";

export interface AraToolExecutionContext {
  agentId: string;
  taskId?: string;
  requestId?: string;
  traceId?: string;
  approved?: boolean;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  timeoutMs?: number;
  idempotencyKey?: string;
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
  retryable?: boolean;
  startedAt: string;
  completedAt: string;
  durationMs?: number;
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
  timeoutMs?: number;
  maxRetries?: number;
}
