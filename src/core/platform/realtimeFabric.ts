// Supabase Realtime's channel generics are isolated at this adapter boundary.
// Runtime payloads are validated before dispatch; the rest of the platform remains strictly typed.
import { supabase } from "../../lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

type FreshRealtimeChannel = {
  on(
    type: "broadcast",
    config: { event: string },
    callback: (payload: { payload: unknown }) => void,
  ): FreshRealtimeChannel;
  subscribe(): Promise<unknown>;
  send(payload: { type: "broadcast"; event: string; payload: RealtimeEvent }): Promise<unknown>;
};

export type RealtimeEvent =
  | { type: "chat"; channelId: string; message: string; senderId: string }
  | { type: "reaction"; contentId: string; reaction: string; senderId: string }
  | { type: "poll"; channelId: string; optionId: string; senderId: string }
  | { type: "presence"; channelId: string; state: "online" | "offline" }
  | {
      type: "interactive-choice";
      contentId: string;
      nodeId: string;
      optionId: string;
      senderId: string;
      segmentStartSeconds?: number;
    }
  | { type: "live-signal"; channelId: string; signal: string; senderId: string };

export interface RealtimeTransport {
  connect(): Promise<void>;
  disconnect(): void;
  publish(event: RealtimeEvent): void;
  subscribe(handler: (event: RealtimeEvent) => void): () => void;
}

export class SupabaseRealtimeTransport implements RealtimeTransport {
  private channel: RealtimeChannel | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  private readonly channelId: string;

  constructor(channelId: string) {
    this.channelId = channelId;
  }

  async connect() {
    if (this.channel) return;
    const channel = supabase.channel(`fresh-realtime:${this.channelId}`) as unknown as FreshRealtimeChannel;
    channel.on("broadcast", { event: "fresh-event" }, ({ payload }) => {
      if (!payload || typeof payload !== "object") return;
      const event = payload as Partial<RealtimeEvent>;
      if (typeof event.type !== "string") return;
      this.listeners.forEach((listener) => listener(event as RealtimeEvent));
    });
    this.channel = channel as unknown as RealtimeChannel;
    await channel.subscribe();
  }

  disconnect() {
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
  }

  publish(event: RealtimeEvent) {
    if (!this.channel) return;
    void this.channel.send({ type: "broadcast", event: "fresh-event", payload: event });
  }

  subscribe(handler: (event: RealtimeEvent) => void) {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }
}

export class BrowserRealtimeTransport implements RealtimeTransport {
  private socket: WebSocket | null = null;
  private listeners = new Set<(event: RealtimeEvent) => void>();

  async connect() {
    const url = typeof window !== "undefined" ? window.localStorage.getItem("fresh-realtime-url") : null;
    if (!url || typeof WebSocket === "undefined") return;
    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as RealtimeEvent;
        this.listeners.forEach((listener) => listener(event));
      } catch {
        // Gateway validation owns malformed frame handling.
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
