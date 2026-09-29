export type FreshAITraceEvent = {
  requestId: string;
  stage: string;
  status: "started" | "completed" | "failed";
  at: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

export type FreshAITraceSink = {
  record(event: FreshAITraceEvent): Promise<void> | void;
};

export class InMemoryFreshAITraceSink implements FreshAITraceSink {
  private readonly events: FreshAITraceEvent[] = [];
  constructor(private readonly maxEvents = 500) {}
  record(event: FreshAITraceEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
  }
  list(requestId?: string): FreshAITraceEvent[] {
    return (requestId ? this.events.filter((event) => event.requestId === requestId) : [...this.events]).map((event) => ({ ...event }));
  }
}

export async function traceFreshAIStage<T>(
  sink: FreshAITraceSink,
  requestId: string,
  stage: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  await sink.record({ requestId, stage, status: "started", at: new Date().toISOString(), metadata });
  try {
    const result = await operation();
    await sink.record({ requestId, stage, status: "completed", at: new Date().toISOString(), durationMs: Date.now() - started, metadata });
    return result;
  } catch (error) {
    await sink.record({
      requestId, stage, status: "failed", at: new Date().toISOString(), durationMs: Date.now() - started,
      metadata: { ...metadata, error: error instanceof Error ? error.message : "Unknown error" },
    });
    throw error;
  }
}
