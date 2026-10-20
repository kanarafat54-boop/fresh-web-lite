import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { createClient } from "@supabase/supabase-js";
import { createFreshAIServerSupabase } from "../../src/core/fresh-ai/FreshAIServerServices.js";

export const config = { maxDuration: 10 };

type TrainingFeedbackBody = {
  requestId?: string;
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

export async function GET(): Promise<Response> {
  return json({ error: "Method not allowed." }, 405);
}

export async function POST(req: Request): Promise<Response> {
  try {
    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return json({ error: "Send training feedback as JSON." }, 415);
    }
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MAX_BODY_BYTES) return json({ error: "Training feedback is too large." }, 413);
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "Training feedback is too large." }, 413);

    let body: TrainingFeedbackBody;
    try {
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid body");
      body = value as TrainingFeedbackBody;
    } catch {
      return json({ error: "Invalid JSON training feedback." }, 400);
    }

    if (body.trainingConsent !== CONSENT || body.consentVersion !== CONSENT_VERSION) {
      return json({ error: "Explicit, versioned training consent is required. Nothing was saved." }, 400);
    }
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json({ error: "A valid Fresh AI request ID is required." }, 400);
    }
    const clip = (value: unknown, limit: number) => typeof value === "string" ? value.trim() : "";
    const question = clip(body.question, 4000);
    const answer = clip(body.answer, 8000);
    const correction = clip(body.correction, 8000);
    if (!question || question.length > 4000 || !answer || answer.length > 8000 || !correction || correction.length > 8000) {
      return json({ error: "Question, original answer, and correction are required and must stay within their size limits." }, 400);
    }

    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Sign in with a valid Fresh ID session before sharing training feedback." }, 401);

    const db = createFreshAIServerSupabase();
    if (!db) return json({ error: "Private Fresh AI feedback storage is not configured." }, 503);
    const authorizationId = crypto.randomUUID();
    const saved = await db.from("fresh_ai_feedback").insert({
      request_id: requestId,
      user_id: user.id,
      feedback_kind: "correction",
      correction,
      training_opt_in: true,
      consent_version: CONSENT_VERSION,
      authorization_id: authorizationId,
      review_status: "pending",
      reviewed_at: null,
      reviewed_by: null,
      comment: "User explicitly opted in to training review.",
    }).select("id").single();

    if (saved.error || !saved.data) {
      return json({ error: "Feedback was not saved. Confirm the Fresh AI consent migration is deployed." }, 503);
    }

    const pair = await db.from("fresh_ai_preference_pairs").insert({
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
      // Keep the consent ledger row, but report the partial write rather than claiming a usable candidate exists.
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
  } catch {
    return json({ error: "Training feedback could not be processed. Please try again." }, 500);
  }
}

export default createVercelNodeHandler({ GET, POST });
