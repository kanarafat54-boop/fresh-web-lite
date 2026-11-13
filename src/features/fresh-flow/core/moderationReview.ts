// Reviewer queue and appeals for Fresh Shorts (spec 10.2, 10.3). Pure logic, no network.

export type ReviewTarget = "short" | "short_comment";
export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";
export type AppealStatus = "open" | "upheld" | "overturned";
export type ReportDecision = "hidden" | "removed" | "dismissed";

export type QueueItem = {
  reportId: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  details: string | null;
  status: ReportStatus;
  createdAt: string;
  reportCount: number;
  targetAuthorId: string | null;
  preview: string;
  targetState: string | null;
};

export type AppealItem = {
  appealId: string;
  targetType: ReviewTarget;
  targetId: string;
  message: string;
  status: AppealStatus;
  createdAt: string;
  decision: string;
  decisionReason: string | null;
  preview: string;
};

export const MIN_REASON = 3;
export const MAX_REASON = 500;
export const MIN_APPEAL = 10;
export const MAX_APPEAL = 1000;

const REPORT_STATUSES: ReadonlySet<string> = new Set(["open", "reviewing", "actioned", "dismissed"]);
const APPEAL_STATUSES: ReadonlySet<string> = new Set(["open", "upheld", "overturned"]);

const str = (value: unknown): string | null => (typeof value === "string" ? value : null);

export function queueFromRows(rows: unknown): QueueItem[] {
  if (!Array.isArray(rows)) return [];
  const out: QueueItem[] = [];
  for (const row of rows as Array<Record<string, unknown> | null>) {
    if (!row || typeof row !== "object") continue;
    const reportId = str(row.report_id);
    const targetId = str(row.target_id);
    const status = str(row.status);
    const createdAt = str(row.created_at);
    if (!reportId || !targetId || !status || !REPORT_STATUSES.has(status) || !createdAt || !Number.isFinite(Date.parse(createdAt))) continue;
    out.push({
      reportId, targetId, createdAt,
      targetType: str(row.target_type) ?? "unknown",
      reason: str(row.reason),
      details: str(row.details),
      status: status as ReportStatus,
      reportCount: Math.max(1, Number(row.report_count) || 1),
      targetAuthorId: str(row.target_author_id),
      preview: str(row.preview) ?? "",
      targetState: str(row.target_state),
    });
  }
  return out;
}

export function appealsFromRows(rows: unknown): AppealItem[] {
  if (!Array.isArray(rows)) return [];
  const out: AppealItem[] = [];
  for (const row of rows as Array<Record<string, unknown> | null>) {
    if (!row || typeof row !== "object") continue;
    const appealId = str(row.appeal_id);
    const targetId = str(row.target_id);
    const targetType = str(row.target_type);
    const status = str(row.status);
    const createdAt = str(row.created_at);
    if (!appealId || !targetId || (targetType !== "short" && targetType !== "short_comment") || !status || !APPEAL_STATUSES.has(status) || !createdAt || !Number.isFinite(Date.parse(createdAt))) continue;
    out.push({ appealId, targetId, targetType, createdAt, status: status as AppealStatus, message: str(row.message) ?? "", decision: str(row.decision) ?? "", decisionReason: str(row.decision_reason), preview: str(row.preview) ?? "" });
  }
  return out;
}

/** The decisions a reviewer may take for a report. Only Shorts and comments can be hidden or removed; Shorts are hidden, never deleted. */
export function decisionsFor(targetType: string): Array<{ id: ReportDecision; label: string; needsReason: boolean }> {
  const base: Array<{ id: ReportDecision; label: string; needsReason: boolean }> = [{ id: "dismissed", label: "Dismiss report", needsReason: false }];
  if (targetType === "short") return [{ id: "hidden", label: "Hide this Short", needsReason: true }, ...base];
  if (targetType === "short_comment") return [{ id: "hidden", label: "Hide comment", needsReason: true }, { id: "removed", label: "Remove comment", needsReason: true }, ...base];
  return base;
}

export function targetLabel(targetType: string): string {
  switch (targetType) {
    case "short": return "Short";
    case "short_comment": return "Comment";
    case "post_comment": return "Post comment";
    case "post": return "Post";
    case "profile": return "Profile";
    case "sound": return "Sound";
    default: return "Item";
  }
}

export function validateReason(text: string, min = MIN_REASON, max = MAX_REASON): { ok: true; value: string } | { ok: false; error: string } {
  const value = text.trim();
  if (value.length < min) return { ok: false, error: `Write at least ${min} characters.` };
  if (value.length > max) return { ok: false, error: `Keep it under ${max} characters.` };
  return { ok: true, value };
}

export function validateAppeal(text: string) { return validateReason(text, MIN_APPEAL, MAX_APPEAL); }

/** Plain-language form of a database refusal. */
export function explainModerationError(message: string | undefined): string {
  if (!message) return "Fresh could not do that. Try again.";
  if (/only reviewers/i.test(message)) return "Only reviewers can do this.";
  if (/already appealed/i.test(message)) return "You already appealed this decision.";
  if (/no decision to appeal/i.test(message)) return "There is no decision to appeal.";
  if (/only appeal decisions about your own/i.test(message)) return "You can only appeal decisions about your own content.";
  if (/already decided/i.test(message)) return "This appeal was already decided.";
  if (/no longer exists/i.test(message)) return "The reported content no longer exists.";
  if (/Give a (reason|note)|Explain your appeal/i.test(message)) return message;
  return "Fresh could not do that. Try again.";
}

/** True when a database error means the moderation update is not installed yet. */
export function isModerationUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42883" || error.code === "PGRST202" || error.code === "42P01" || error.code === "PGRST205" || /review_queue|decide_report|submit_appeal|appeal_queue|decide_appeal|schema cache/i.test(error.message ?? "");
}

export function isReviewer(role: string | null | undefined): boolean {
  return role === "admin" || role === "owner";
}
