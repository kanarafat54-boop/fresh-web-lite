import type {
  AraToolHandler,
  AraToolPolicy,
  AraToolExecutionContext,
  AraToolExecutionInput,
  AraToolExecutionResult,
} from "./toolExecution";

export interface AraTool {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  enabled: boolean;
  policy?: AraToolPolicy;
  handler?: AraToolHandler;
}

const sleep = (ms: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) return reject(new Error("Execution cancelled."));
  const timer = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Execution cancelled.")); }, { once: true });
});

class ToolRegistry {
  private tools: AraTool[] = [];
  private completedIdempotency = new Map<string, AraToolExecutionResult>();

  register(tool: AraTool) {
    const exists = this.tools.find((t) => t.id === tool.id);
    if (exists) return;
    this.tools.push(tool);
  }

  unregister(id: string) { this.tools = this.tools.filter((tool) => tool.id !== id); }
  get(id: string) { return this.tools.find((tool) => tool.id === id); }
  getByCategory(category: string) { return this.tools.filter((tool) => tool.category === category); }
  list() { return this.tools; }

  async execute(toolId: string, input: AraToolExecutionInput, context: AraToolExecutionContext): Promise<AraToolExecutionResult> {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    const tool = this.get(toolId);
    const finish = (result: Omit<AraToolExecutionResult, "startedAt" | "completedAt" | "durationMs">): AraToolExecutionResult => ({
      ...result, startedAt, completedAt: new Date().toISOString(), durationMs: Date.now() - started,
    });

    if (!tool || !tool.enabled) return finish({ status: "unavailable", toolId, agentId: context.agentId, error: "Tool is not registered or enabled.", retryable: false });
    if (tool.policy?.requiresApproval && !context.approved) return finish({ status: "rejected", toolId, agentId: context.agentId, error: "Tool execution requires explicit approval.", retryable: false });
    if (!tool.handler) return finish({ status: "unavailable", toolId, agentId: context.agentId, error: "Tool is registered but has no execution handler.", retryable: false });

    const key = context.idempotencyKey;
    if (key && this.completedIdempotency.has(key)) return this.completedIdempotency.get(key)!;

    const timeoutMs = Math.max(1, context.timeoutMs ?? tool.policy?.timeoutMs ?? 30_000);
    const maxRetries = Math.max(0, Math.min(3, tool.policy?.maxRetries ?? 0));
    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const controller = new AbortController();
        const forwardAbort = () => controller.abort();
        context.signal?.addEventListener("abort", forwardAbort, { once: true });
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const output = await Promise.race([
            Promise.resolve(tool.handler(input, { ...context, signal: controller.signal })),
            new Promise<never>((_, reject) => controller.signal.addEventListener("abort", () => reject(new Error("Tool execution timed out or was cancelled.")), { once: true })),
          ]);
          const result = finish({ status: "completed", toolId, agentId: context.agentId, output, retryable: false });
          if (key) this.completedIdempotency.set(key, result);
          return result;
        } finally {
          clearTimeout(timeout);
          context.signal?.removeEventListener("abort", forwardAbort);
        }
      } catch (error) {
        lastError = error;
        if (context.signal?.aborted) return finish({ status: "failed", toolId, agentId: context.agentId, error: "Execution cancelled.", retryable: false });
        if (attempt < maxRetries) await sleep(Math.min(1000 * 2 ** attempt, 4000), context.signal);
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Tool execution failed.";
    const timedOut = /timed out/i.test(message);
    return finish({ status: timedOut ? "timed-out" : "failed", toolId, agentId: context.agentId, error: message, retryable: !timedOut && maxRetries > 0 });
  }
}

export const toolRegistry = new ToolRegistry();
