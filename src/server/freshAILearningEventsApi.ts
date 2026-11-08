import { createFreshAIServerSupabase } from "../core/fresh-ai/FreshAIServerServices.js";
import { createSupabaseFreshLearningEventRepository } from "./freshAILearningSupabase.js";
import type { FreshLearningEvent } from "../core/fresh-ai/FreshAutonomousLearningCore.js";

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });
const MAX_BODY_BYTES = 16 * 1024;

export async function handleFreshLearningEvents(req: Request, ownerId: string): Promise<Response> {
  const client = createFreshAIServerSupabase();
  if (!client) return json({ error: "Fresh AI learning persistence is not configured." }, 503);
  const repository = createSupabaseFreshLearningEventRepository(client);

  if (req.method === "GET") {
    const eventId = new URL(req.url).searchParams.get("id") ?? "";
    if (!eventId) return json({ error: "A learning event id is required." }, 400);
    const event = await repository.getById(ownerId, eventId);
    return event ? json({ ok: true, event }) : json({ error: "Learning event not found." }, 404);
  }

  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ error: "Send learning event metadata as JSON." }, 415);
  }
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Learning event request is too large." }, 413);
  const raw = await req.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return json({ error: "Learning event request is too large." }, 413);

  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return json({ error: "Invalid JSON learning event." }, 400);
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return json({ error: "A learning event object is required." }, 400);
  }

  // Never trust an owner id supplied by the client; bind the event to the verified session.
  const event = { ...(input as Record<string, unknown>), ownerId } as FreshLearningEvent;
  try {
    const outcome = await repository.append(event);
    return json({
      ok: true,
      eventId: event.id,
      persistence: outcome,
      training: "not-trained",
      reviewStatus: event.reviewStatus,
    }, outcome === "inserted" ? 201 : 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Learning event rejected.";
    const invalid = /required|must|consent|private|owner|queue|timestamp|sha-256|UUID/i.test(message);
    return json({ error: message }, invalid ? 400 : 503);
  }
}
