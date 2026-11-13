import { supabase } from "../../../lib/supabase";
import { appealsFromRows, explainModerationError, isModerationUnavailable, queueFromRows, type AppealItem, type AppealStatus, type QueueItem, type ReportDecision, type ReportStatus, type ReviewTarget } from "./moderationReview";

export type Outcome = { ok: true } | { ok: false; unavailable: boolean; message: string };

function failure(error: { code?: string; message?: string }): Outcome {
  return { ok: false, unavailable: isModerationUnavailable(error), message: isModerationUnavailable(error) ? "Moderation review is not available yet." : explainModerationError(error.message) };
}

export async function loadReviewQueue(status: ReportStatus = "open"): Promise<{ items: QueueItem[]; unavailable: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("review_queue", { p_status: status, p_limit: 100 });
  if (error) { const f = failure(error); return { items: [], unavailable: !f.ok && f.unavailable, message: f.ok ? undefined : f.message }; }
  return { items: queueFromRows(data), unavailable: false };
}

export async function decideReport(reportId: string, decision: ReportDecision, reason: string): Promise<Outcome> {
  const { error } = await supabase.rpc("decide_report", { p_report_id: reportId, p_decision: decision, p_reason: reason });
  return error ? failure(error) : { ok: true };
}

export async function loadAppealQueue(status: AppealStatus = "open"): Promise<{ items: AppealItem[]; unavailable: boolean; message?: string }> {
  const { data, error } = await supabase.rpc("appeal_queue", { p_status: status, p_limit: 100 });
  if (error) { const f = failure(error); return { items: [], unavailable: !f.ok && f.unavailable, message: f.ok ? undefined : f.message }; }
  return { items: appealsFromRows(data), unavailable: false };
}

export async function decideAppeal(appealId: string, overturn: boolean, note: string): Promise<Outcome> {
  const { error } = await supabase.rpc("decide_appeal", { p_appeal_id: appealId, p_overturn: overturn, p_note: note });
  return error ? failure(error) : { ok: true };
}

export async function submitAppeal(targetType: ReviewTarget, targetId: string, message: string): Promise<Outcome> {
  const { error } = await supabase.rpc("submit_appeal", { p_target_type: targetType, p_target_id: targetId, p_message: message });
  return error ? failure(error) : { ok: true };
}
