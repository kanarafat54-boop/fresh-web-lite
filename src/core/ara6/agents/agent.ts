import type { AraToolExecutionContext, AraToolExecutionResult } from "../toolExecution";

export interface AraAgent {
  id: string;
  name: string;
  description: string;
  ecosystem: string;
  status: "idle" | "working";
  version: string;
  role?: string;
  active?: boolean;
  capabilities?: readonly string[];
  tools?: readonly string[];
}

export interface AgentTask {
  action: string;
  toolId?: string;
  input?: unknown;
  taskId?: string;
  requestId?: string;
  approved?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  accepted: boolean;
  result?: AraToolExecutionResult;
  error?: string;
}

export type AgentExecutionContext = AraToolExecutionContext;
