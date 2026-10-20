import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient } from "@supabase/supabase-js";
import { createFreshAIServerSupabase } from "../../src/core/fresh-ai/FreshAIServerServices.js";

export const config = { maxDuration: 10 };

type FeedbackBody = {
  requestId?: string;
  rating?: number;
  correct?: boolean;
  comment?: string;
  share?: boolean;
  question?: string;
  answer?: string;
  correction?: string;
  trainingConsent?: string;
  consentVersion?: string;
};

const CONSENT = "explicit-training-opt-in";
const CONSENT_VERSION = "fresh-ai-feedback-consent-v1";
const MAX_BODY_BYTES = 16 * 1024;
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" } });

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user ?? null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return json({ error: "Send feedback as JSON." }, 415);
    }
    const declaredLength = Number(req.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_BODY_BYTES) return json({ error: "Feedback request is too large." }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Feedback request is too large." }, 413);
    let body: FeedbackBody;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
      body = parsed as FeedbackBody;
    } catch {
      return json({ error: "Invalid JSON feedback request." }, 400);
    }

    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json({ error: "A valid requestId is required" }, 400);
    }
    const client = createFreshAIServerSupabase();
    if (!client) return json({ error: "Feedback storage is not configured" }, 503);

    // A correction is stored only when the user explicitly opts into the versioned training-review consent.
    if (body.trainingConsent !== undefined) {
      if (body.trainingConsent !== CONSENT || body.consentVersion !== CONSENT_VERSION) {
        return json({ error: "Explicit, versioned training consent is required. Nothing was saved for training." }, 400);
      }
      const clip = (value: unknown, limit: number) => typeof value === "string" ? value.trim() : "";
      const question = clip(body.question, 4000);
      const answer = clip(body.answer, 8000);
      const correction = clip(body.correction, 8000);
      if (!question || question.length > 4000 || !answer || answer.length > 8000 || !correction || correction.length > 8000) {
        return json({ error: "Question, original answer, and correction are required and must stay within their size limits." }, 400);
      }

      const authorizationId = crypto.randomUUID();
      const saved = await client.from("fresh_ai_feedback").insert({
        request_id: requestId,
        user_id: user.id,
        rating: null,
        correct: null,
        comment: "User explicitly opted in to training review.",
        feedback_kind: "correction",
        correction,
        training_opt_in: true,
        consent_version: CONSENT_VERSION,
        authorization_id: authorizationId,
        review_status: "pending",
        reviewed_at: null,
        reviewed_by: null,
      }).select("id").single();
      if (saved.error || !saved.data) {
        return json({ error: "Feedback was not saved. Confirm the Fresh AI consent migration is deployed." }, 503);
      }

      const pair = await client.from("fresh_ai_preference_pairs").insert({
        user_id: user.id,
        request_id: requestId,
        prompt: question,
        preferred_output: correction,
        rejected_output: answer,
        rationale: "Explicitly consented user correction; pending human review",
        label: "better",
        safety_checked: false,
      }).select("id").single();
      if (pair.error || !pair.data) {
        return json({ ok: false, feedbackId: saved.data.id, error: "Consent was recorded, but the preference pair could not be saved. It is not ready for training." }, 503);
      }
      return json({
        ok: true,
        feedbackId: saved.data.id,
        candidateId: pair.data.id,
        reviewStatus: "pending",
        training: "not-trained",
        message: "Your opted-in correction is awaiting human review. It has not changed Fresh AI model weights.",
      }, 201);
    }

    if (body.rating !== undefined && (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)) {
      return json({ error: "rating must be an integer from 1 to 5" }, 400);
    }
    const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 4000) : null;
    const rating = body.rating ?? null;
    const { error } = await client.from("fresh_ai_feedback").insert({
      request_id: requestId,
      user_id: user.id,
      rating,
      correct: typeof body.correct === "boolean" ? body.correct : null,
      comment,
    });
    if (error) return json({ error: "Unable to persist feedback" }, 500);

    if (rating !== null) await client.from("fresh_ai_evaluations").insert({
      request_id: requestId,
      user_id: user.id,
      evaluator: "user-feedback",
      metric: "user_rating",
      score: rating / 5,
      expected: 0.8,
      feedback: comment,
      evidence: { rating, correct: typeof body.correct === "boolean" ? body.correct : null },
    });

    let shared = false;
    if (body.share === true && rating !== null && rating <= 2) {
      const clip = (value: unknown) => (typeof value === "string" ? value.trim().slice(0, 2000) : "");
      const question = clip(body.question), answer = clip(body.answer), correction = clip(body.correction);
      if (question && answer && correction) {
        const existing = await client.from("fresh_ai_preference_pairs").select("id").eq("request_id", requestId).eq("user_id", user.id).limit(1);
        if (!existing.error && (existing.data ?? []).length === 0) {
          const stored = await client.from("fresh_ai_preference_pairs").insert({
            user_id: user.id, request_id: requestId, prompt: question,
            preferred_output: correction, rejected_output: answer,
            rationale: "User correction shared with consent; pending owner review",
            label: "better", safety_checked: false,
          });
          shared = !stored.error;
        }
      }
    }
    return json({ ok: true, requestId, evaluated: rating !== null, shared });
  } catch {
    return json({ error: "Feedback request failed" }, 500);
  }
}

export default createVercelNodeHandler({ POST });
