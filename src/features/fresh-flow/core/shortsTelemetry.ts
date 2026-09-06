export type FreshShortsTelemetryEvent =
  | "feed_load"
  | "playback_start"
  | "first_frame"
  | "buffer_start"
  | "buffer_end"
  | "playback_error"
  | "retry"
  | "immersive_enter"
  | "feed_error";

type TelemetryPayload = {
  event: FreshShortsTelemetryEvent;
  shortId?: string;
  index?: number;
  durationMs?: number;
  value?: number;
  connection?: string;
  online?: boolean;
  metadata?: Record<string, string | number | boolean | null>;
};

const SESSION_KEY = "fresh-flow-shorts-telemetry-session";
const ENDPOINT = "/api/shorts/telemetry";
const MAX_BATCH = 10;
let queue: Array<TelemetryPayload & { sessionId: string; timestamp: string }> = [];
let flushTimer: number | null = null;

function getSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "ephemeral";
  }
}

function flush(): void {
  if (!queue.length || typeof navigator === "undefined") return;
  const batch = queue.splice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });
  const blob = new Blob([body], { type: "application/json" });

  if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, blob)) return;

  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

function scheduleFlush(): void {
  if (flushTimer !== null || typeof window === "undefined") return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    flush();
    if (queue.length) scheduleFlush();
  }, 1500);
}

export function recordFreshShortsTelemetry(payload: TelemetryPayload): void {
  if (typeof window === "undefined") return;
  queue.push({
    ...payload,
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
  });
  if (queue.length >= MAX_BATCH) flush();
  else scheduleFlush();
}

export function flushFreshShortsTelemetry(): void {
  if (flushTimer !== null && typeof window !== "undefined") {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }
  flush();
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushFreshShortsTelemetry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushFreshShortsTelemetry();
  });
}
