export type RealtimeEvent =
  | { type: "chat"; channelId: string; message: string; senderId: string }
  | { type: "reaction"; contentId: string; reaction: string; senderId: string }
  | { type: "poll"; channelId: string; optionId: string; senderId: string }
  | { type: "presence"; channelId: string; state: "online" | "offline" };

export interface RealtimeTransport {
  connect(): Promise<void>;
  disconnect(): void;
  publish(event: RealtimeEvent): void;
  subscribe(handler: (event: RealtimeEvent) => void): () => void;
}

type BroadcastChannel = {
  on(type: "broadcast", config: { event: string }, callback: (frame: { payload: unknown }) => void): BroadcastChannel;
  subscribe(): Promise<unknown>;
  send(message: { type: "broadcast"; event: string; payload: RealtimeEvent }): Promise<unknown>;
};

function isRealtimeEvent(value: unknown): value is RealtimeEvent {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.type === "chat" || candidate.type === "reaction" || candidate.type === "poll" || candidate.type === "presence";
}

export class SupabaseRealtimeTransport implements RealtimeTransport {
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  constructor(private readonly channelId: string) {}

  async connect(): Promise<void> {
    if (this.channel) return;
    const { supabase } = await import("../../lib/supabase");
    const channel = supabase.channel("fresh-realtime:" + this.channelId) as unknown as BroadcastChannel;
    channel.on("broadcast", { event: "fresh-event" }, ({ payload }) => {
      if (!isRealtimeEvent(payload)) return;
      this.listeners.forEach((listener) => listener(payload));
    });
    this.channel = channel;
    await channel.subscribe();
  }

  disconnect(): void {
    if (this.channel) void this.channel;
    this.channel = null;
  }

  publish(event: RealtimeEvent): void {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "fresh-event", payload: event });
  }

  subscribe(handler: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}

export class BrowserRealtimeTransport implements RealtimeTransport {
  private socket: WebSocket | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  async connect(): Promise<void> {
    const url = typeof window !== "undefined" ? window.localStorage.getItem("fresh-realtime-url") : null;
    if (!url || typeof WebSocket === "undefined") return;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      try {
        const event: unknown = JSON.parse(message.data);
        if (!isRealtimeEvent(event)) return;
        this.listeners.forEach((listener) => listener(event));
      } catch {
        // Gateway validation owns malformed frame handling.
      }
    };
  }

  disconnect(): void { this.socket?.close(); this.socket = null; }

  publish(event: RealtimeEvent): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  subscribe(handler: (event: RealtimeEvent) => void): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}