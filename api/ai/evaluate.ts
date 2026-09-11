import { createClient } from "@supabase/supabase-js";
import { assessSafety, buildImprovementProposal, evaluateResponse } from "../../src/core/fresh-ai/FreshAITrainingPipeline.js";

export const config = { maxDuration: 10 };
type EvaluationBody = { requestId?: string; request?: string; answer?: string; intent?: string; rating?: number; correct?: boolean; evidenceCount?: number; contradictionCount?: number; latencyMs?: number; route?: string; provider?: string };
function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "cache-control": "no-store" } }); }

async function userFromRequest(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await client.auth.getUser(token);
  return data.user ?? null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await userFromRequest(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const body = await req.json() as EvaluationBody;
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const request = typeof body.request === "string" ? body.request.trim().slice(0, 8000) : "";
    const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 12000) : "";
    if (!/^[0-9a-f-]{36}$/i.test(requestId) || !request || !answer) return json({ error: "requestId, request and answer are required" }, 400);
    if (body.rating !== undefined && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) return json({ error: "rating must be an integer from 1 to 5" }, 400);

    const safety = assessSafety({ request, intent: body.intent });
    const scores = evaluateResponse({ answer, evidenceCount: Math.max(0, body.evidenceCount ?? 0), contradictionCount: Math.max(0, body.contradictionCount ?? (body.correct === false ? 1 : 0)), userRating: body.rating, safety });
    const client = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false, autoRefreshToken: false } });
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Evaluation storage is not configured" }, 503);

    const evaluationRows = scores.map(score => ({ request_id: requestId, user_id: user.id, evaluator: "fresh-evaluation-harness", metric: score.metric, score: score.score, expected: score.expected ?? 0.7, feedback: null, evidence: score.evidence ?? {} }));
    const { error } = await client.from("fresh_ai_evaluations").insert(evaluationRows);
    if (error) return json({ error: "Unable to persist evaluation" }, 500);
    await client.from("fresh_ai_safety_events").insert({ request_id: requestId, user_id: user.id, decision: safety.decision, reasons: safety.reasons, policy_version: safety.policyVersion, human_review_required: safety.requiresHumanReview });
    if (body.latencyMs !== undefined || body.route) await client.from("fresh_ai_serving_metrics").insert({ request_id: requestId, user_id: user.id, route: body.route ?? "unknown", latency_ms: Math.max(0, Math.round(body.latencyMs ?? 0)), fallback_used: body.provider === "fallback", provider: body.provider ?? null, success: true, metadata: { intent: body.intent ?? null } });

    const proposal = buildImprovementProposal(scores, body.correct === false ? "User marked the response incorrect." : undefined);
    if (proposal) await client.from("fresh_ai_improvement_proposals").insert({ ...proposal, created_by: user.id });
    return json({ ok: true, requestId, safety, scores, improvementProposalCreated: Boolean(proposal) });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Evaluation failed" }, 500); }
}
