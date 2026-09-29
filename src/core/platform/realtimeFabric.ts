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

export class BrowserRealtimeTransport implements RealtimeTransport {
  private socket: WebSocket | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  async connect() {
    // Production deployments provide the realtime endpoint through configuration.
    const url = typeof window !== "undefined" ? window.localStorage.getItem("fresh-realtime-url") : null;
    if (!url || typeof WebSocket === "undefined") return;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RealtimeEvent;
        this.listeners.forEach((listener) => listener(event));
      } catch {
        // Ignore malformed transport frames; protocol validation belongs at the gateway.
      }
    };
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }

  publish(event: RealtimeEvent) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(event));
  }

  subscribe(handler: (event: RealtimeEvent) => void) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}
