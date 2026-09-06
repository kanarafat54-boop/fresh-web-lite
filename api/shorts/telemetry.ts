type TelemetryEvent = {
  event?: string;
  sessionId?: string;
  shortId?: string;
  index?: number;
  durationMs?: number;
  value?: number;
  connection?: string;
  online?: boolean;
  timestamp?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

const ALLOWED_EVENTS = new Set([
  "feed_load",
  "playback_start",
  "first_frame",
  "buffer_start",
  "buffer_end",
  "playback_error",
  "retry",
  "immersive_enter",
  "feed_error",
]);

const MAX_EVENTS = 20;
const MAX_BODY_BYTES = 32_000;

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "cache-control": "no-store" } });
}

function validEvent(event: TelemetryEvent): boolean {
  return typeof event.event === "string" && ALLOWED_EVENTS.has(event.event) &&
    (event.shortId === undefined || (typeof event.shortId === "string" && event.shortId.length <= 128)) &&
    (event.durationMs === undefined || (typeof event.durationMs === "number" && Number.isFinite(event.durationMs) && event.durationMs >= 0 && event.durationMs <= 86_400_000)) &&
    (event.value === undefined || (typeof event.value === "number" && Number.isFinite(event.value))) &&
    (event.index === undefined || (Number.isInteger(event.index) && event.index >= 0 && event.index <= 1_000_000));
}

export async function POST(req: Request): Promise<Response> {
  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return json({ error: "Telemetry payload too large" }, 413);

  let body: { events?: TelemetryEvent[] };
  try {
    body = (await req.json()) as { events?: TelemetryEvent[] };
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.events) || body.events.length < 1 || body.events.length > MAX_EVENTS) {
    return json({ error: "events must contain between 1 and 20 items" }, 400);
  }

  const events = body.events.filter(validEvent);
  if (!events.length) return json({ error: "No valid telemetry events" }, 400);

  // Operational telemetry is intentionally privacy-minimal: no account IDs,
  // IPs, titles, captions, or user-entered text are accepted here.
  console.info("FRESH_SHORTS_TELEMETRY", {
    receivedAt: new Date().toISOString(),
    count: events.length,
    events: events.map(({ metadata, ...event }) => ({
      ...event,
      metadata: metadata && Object.keys(metadata).slice(0, 8).reduce<Record<string, string | number | boolean | null>>((result, key) => {
        const value = metadata[key];
        if (typeof value === "string" && value.length > 128) return result;
        result[key] = value;
        return result;
      }, {}),
    })),
  });

  return json({ accepted: events.length });
}
