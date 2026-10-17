import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient } from "@supabase/supabase-js";
import { createFreshAIServerSupabase } from "../../src/core/fresh-ai/FreshAIServerServices.js";

export const config = { maxDuration: 10 };
type FeedbackBody = { requestId?: string; rating?: number; correct?: boolean; comment?: string; share?: boolean; question?: string; answer?: string; correction?: string };
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });
async function authenticatedUser(req: Request) { const url = process.env.VITE_SUPABASE_URL, key = process.env.VITE_SUPABASE_ANON_KEY, authorization = req.headers.get("authorization") ?? "", token = authorization.startsWith("Bearer ") ? authorization.slice(7) : ""; if (!url || !key || !token) return null; const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }); const { data } = await client.auth.getUser(token); return data.user ?? null; }
export async function POST(req: Request): Promise<Response> { try { const user = await authenticatedUser(req); if (!user) return json({ error: "Authentication required" }, 401); const body = await req.json() as FeedbackBody, requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""; if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "A valid requestId is required" }, 400); if (body.rating !== undefined && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) return json({ error: "rating must be an integer from 1 to 5" }, 400); const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 4000) : null, client = createFreshAIServerSupabase(); if (!client) return json({ error: "Feedback storage is not configured" }, 503); const rating = body.rating ?? null; const { error } = await client.from("fresh_ai_feedback").insert({ request_id: requestId, user_id: user.id, rating, correct: typeof body.correct === "boolean" ? body.correct : null, comment }); if (error) return json({ error: "Unable to persist feedback" }, 500);
    if (rating !== null) await client.from("fresh_ai_evaluations").insert({ request_id: requestId, user_id: user.id, evaluator: "user-feedback", metric: "user_rating", score: rating / 5, expected: 0.8, feedback: comment, evidence: { rating, correct: typeof body.correct === "boolean" ? body.correct : null } });
    let shared = false;
    if (body.share === true && rating !== null && rating <= 2) {
      const clip = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 2000) : "");
      const question = clip(body.question), answer = clip(body.answer), correction = clip(body.correction);
      if (question && answer && correction) {
        const existing = await client.from("fresh_ai_preference_pairs").select("id").eq("request_id", requestId).eq("user_id", user.id).limit(1);
        if (!existing.error && (existing.data ?? []).length === 0) {
          const stored = await client.from("fresh_ai_preference_pairs").insert({ user_id: user.id, request_id: requestId, prompt: question, preferred_output: correction, rejected_output: answer, rationale: "User correction shared with consent; pending owner review", label: "better", safety_checked: false });
          shared = !stored.error;
        }
      }
    }
    return json({ ok: true, requestId, evaluated: rating !== null, shared });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Feedback request failed" }, 500); } }

export default createVercelNodeHandler({ POST });
