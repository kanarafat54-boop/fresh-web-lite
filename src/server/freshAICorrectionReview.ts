import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { hasStaffAccess } from "./adminAccess.js";
import { screenSubmission } from "../core/fresh-ai/FreshAICorrectionScreening.js";

/**
 * Owner review of user-shared corrections (the approval step of the Fresh AI learning loop).
 *
 * Served through /api/ai/feedback?__fresh_corrections=1 (see vercel.json) so it does not add a
 * serverless function. Administrator only, using the same check as /api/admin/users. Nothing here
 * calls an outside AI model, and the submitter's identity is never returned to the reviewer.
 */
type Status = "pending" | "approved" | "rejected";
type Admin = { admin: SupabaseClient; userId: string };

const STATUSES: Status[] = ["pending", "approved", "rejected"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

function clients() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anonKey || !serviceKey) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return { auth: createClient(url, anonKey, options), admin: createClient(url, serviceKey, options) };
}

async function requireAdmin(req: Request): Promise<Admin | Response> {
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!token) return json({ error: "Authentication required" }, 401);
  const c = clients();
  if (!c) return json({ error: "Correction review is not configured" }, 503);
  const { data, error } = await c.auth.auth.getUser(token);
  if (error || !data.user) return json({ error: "Invalid authentication session" }, 401);
  const actor = await c.admin.from("users").select("id, role").eq("id", data.user.id).maybeSingle();
  if (actor.error) return json({ error: "Unable to verify administrator access" }, 500);
  if (!actor.data || !hasStaffAccess(actor.data.role)) return json({ error: "Administrator access required" }, 403);
  return { admin: c.admin, userId: data.user.id };
}

const clip = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** GET: corrections waiting for review (or already reviewed), with screening flags for each. */
export async function listCorrections(req: Request): Promise<Response> {
  try {
    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const url = new URL(req.url);
    const requested = url.searchParams.get("status") ?? "pending";
    if (!STATUSES.includes(requested as Status)) return json({ error: "status must be pending, approved or rejected" }, 400);
    const limit = Math.min(Math.max(Number.parseInt(url.searchParams.get("limit") ?? "25", 10) || 25, 1), 50);
    const rows = await gate.admin
      .from("fresh_ai_preference_pairs")
      .select("id, created_at, prompt, preferred_output, rejected_output, review_status, review_note, reviewed_at, knowledge_id")
      .eq("review_status", requested)
      .order("created_at", { ascending: requested === "pending" })
      .limit(limit);
    if (rows.error) {
      const notInstalled = rows.error.message.includes("review_status");
      return json({ error: notInstalled ? "Correction review migration has not been applied" : "Unable to load corrections" }, notInstalled ? 503 : 500);
    }
    const items = (rows.data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      question: row.prompt,
      answerGiven: row.rejected_output,
      proposedCorrection: row.preferred_output,
      reviewStatus: row.review_status,
      reviewNote: row.review_note,
      reviewedAt: row.reviewed_at,
      knowledgeId: row.knowledge_id,
      screening: screenSubmission(String(row.prompt ?? ""), String(row.preferred_output ?? "")),
    }));
    return json({ ok: true, status: requested, count: items.length, items });
  } catch {
    return json({ error: "Correction list failed" }, 500);
  }
}

type ReviewBody = { id?: unknown; decision?: unknown; note?: unknown; editedText?: unknown; acknowledgeFlags?: unknown };

/** POST: approve (optionally with edited wording) or reject one correction. */
export async function reviewCorrection(req: Request): Promise<Response> {
  try {
    const gate = await requireAdmin(req);
    if (gate instanceof Response) return gate;
    const body = (await req.json().catch(() => ({}))) as ReviewBody;
    const id = typeof body.id === "string" ? body.id.trim() : "";
    if (!UUID.test(id)) return json({ error: "A valid correction id is required" }, 400);
    if (body.decision !== "approve" && body.decision !== "reject") return json({ error: "decision must be approve or reject" }, 400);
    const note = clip(body.note, 500);
    const edited = clip(body.editedText, 2000);

    const pair = await gate.admin.from("fresh_ai_preference_pairs").select("id, prompt, preferred_output, review_status").eq("id", id).maybeSingle();
    if (pair.error) return json({ error: "Unable to load the correction" }, 500);
    if (!pair.data) return json({ error: "Correction not found" }, 404);
    if (pair.data.review_status !== "pending") return json({ error: `Correction was already reviewed (${pair.data.review_status})` }, 409);

    if (body.decision === "approve") {
      const finalText = edited || String(pair.data.preferred_output ?? "");
      const screening = screenSubmission(String(pair.data.prompt ?? ""), finalText);
      if (screening.hard.length) return json({ error: "This text cannot become shared knowledge as written. Edit it or reject it.", flags: screening }, 422);
      if (screening.soft.length && body.acknowledgeFlags !== true) return json({ error: "Review the flagged items, then approve again with acknowledgeFlags: true", flags: screening }, 409);
    }

    const result = await gate.admin.rpc("review_fresh_ai_correction", {
      p_pair_id: id,
      p_decision: body.decision,
      p_reviewer: gate.userId,
      p_note: note || null,
      p_final_text: body.decision === "approve" && edited ? edited : null,
    });
    if (result.error) {
      const code = result.error.code;
      if (code === "PGRST202") return json({ error: "Correction review migration has not been applied" }, 503);
      if (code === "P0002") return json({ error: "Correction not found" }, 404);
      if (code === "23505") return json({ error: "Correction was already reviewed" }, 409);
      if (code === "22023") return json({ error: result.error.message }, 422);
      return json({ error: "Unable to record the review" }, 500);
    }
    return json({ ok: true, id, decision: body.decision, knowledgeId: result.data ?? null });
  } catch {
    return json({ error: "Correction review failed" }, 500);
  }
}
