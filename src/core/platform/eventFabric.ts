export type EventPriority = "critical" | "high" | "normal" | "low";

export type EventEnvelope<T = unknown> = {
  id: string;
  topic: string;
  partitionKey: string;
  occurredAt: string;
  producer: string;
  schemaVersion: number;
  priority: EventPriority;
  payload: T;
  idempotencyKey?: string;
};

export type EventSubscription = {
  topic: string;
  consumer: string;
  handler: (event: EventEnvelope) => void | Promise<void>;
};

export interface EventFabric {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
  subscribe(subscription: EventSubscription): () => void;
}

export function createEventEnvelope<T>(
  input: Omit<EventEnvelope<T>, "id" | "occurredAt" | "schemaVersion"> & { schemaVersion?: number },
): EventEnvelope<T> {
  return {
    ...input,
    id: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    schemaVersion: input.schemaVersion ?? 1,
  };
}

/**
 * Client-side event fabric for local development and browser features.
 * Production adapters can map the same contract to Kafka, Redis Streams,
 * NATS, or another durable stream without changing feature code.
 */
export class LocalEventFabric implements EventFabric {
  private readonly subscribers = new Map<string, Set<EventSubscription["handler"]>>();

  async publish<T>(event: EventEnvelope<T>) {
    const handlers = this.subscribers.get(event.topic);
    if (!handlers) return;

    await Promise.allSettled([...handlers].map((handler) => Promise.resolve(handler(event))));
  }

  subscribe(subscription: EventSubscription) {
    const handlers = this.subscribers.get(subscription.topic) ?? new Set<EventSubscription["handler"]>();
    handlers.add(subscription.handler);
    this.subscribers.set(subscription.topic, handlers);

    return () => {
      handlers.delete(subscription.handler);
      if (handlers.size === 0) this.subscribers.delete(subscription.topic);
    };
  }
}
