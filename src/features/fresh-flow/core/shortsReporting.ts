/**
 * Reporting for Fresh Shorts (spec 10.2 and 10.3): Shorts, comments (including replies and audio or video
 * comments), profiles and sounds, with categories and an optional explanation.
 *
 * A report is a record for review. It does not remove anything by itself and Fresh does not promise an outcome.
 * Automated detection is not infallible, so nothing here claims a decision was made.
 */
export type ReportTargetType = "short" | "short_comment" | "profile" | "sound";

export type ReportCategoryId = "spam" | "harassment" | "dangerous" | "sexual" | "unauthorized_media" | "copyright" | "impersonation" | "other";

export const REPORT_CATEGORIES: Array<{ id: ReportCategoryId; label: string; hint: string }> = [
  { id: "spam", label: "Spam or misleading", hint: "Repeated, deceptive or unwanted content." },
  { id: "harassment", label: "Harassment or hate", hint: "Targets or demeans a person or group." },
  { id: "dangerous", label: "Violent or dangerous", hint: "Threats, violence, self-harm or dangerous acts." },
  { id: "sexual", label: "Sexual or inappropriate", hint: "Sexual or otherwise unsuitable content." },
  { id: "unauthorized_media", label: "Unauthorized media", hint: "Uses someone's photo, video or audio without permission." },
  { id: "copyright", label: "Copyright concern", hint: "Uses work you own or represent." },
  { id: "impersonation", label: "Impersonation", hint: "Pretends to be another person, brand or organization." },
  { id: "other", label: "Something else", hint: "Anything that does not fit above." },
];

export const REPORT_TARGETS: Record<ReportTargetType, { noun: string; categories: ReportCategoryId[] }> = {
  short: { noun: "Short", categories: ["spam", "harassment", "dangerous", "sexual", "unauthorized_media", "copyright", "impersonation", "other"] },
  short_comment: { noun: "comment", categories: ["spam", "harassment", "dangerous", "sexual", "unauthorized_media", "copyright", "impersonation", "other"] },
  profile: { noun: "profile", categories: ["spam", "harassment", "dangerous", "sexual", "impersonation", "other"] },
  sound: { noun: "sound", categories: ["unauthorized_media", "copyright", "spam", "harassment", "dangerous", "other"] },
};

export const MAX_DETAILS = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReportDraft = {
  targetType: ReportTargetType;
  targetId: string;
  category: ReportCategoryId | null;
  details: string;
  /** Sounds are identified by name, not id: the report points at a Short that uses it and carries the name. */
  soundName?: string;
};

export function categoriesFor(targetType: ReportTargetType) {
  const allowed = new Set(REPORT_TARGETS[targetType].categories);
  return REPORT_CATEGORIES.filter((category) => allowed.has(category.id));
}

export function cleanDetails(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_DETAILS) : "";
}

export type ReportValidation = { ok: true } | { ok: false; error: string };

export function validateReport(draft: ReportDraft): ReportValidation {
  if (!(draft.targetType in REPORT_TARGETS)) return { ok: false, error: "Fresh cannot report this kind of content." };
  if (!UUID.test(draft.targetId)) return { ok: false, error: "Fresh could not tell what you are reporting." };
  if (!draft.category || !REPORT_TARGETS[draft.targetType].categories.includes(draft.category)) return { ok: false, error: "Choose what is wrong." };
  if (draft.targetType === "sound" && !(draft.soundName ?? "").trim()) return { ok: false, error: "Fresh could not tell which sound you are reporting." };
  if (typeof draft.details === "string" && draft.details.length > MAX_DETAILS * 4) return { ok: false, error: "The explanation is too long." };
  return { ok: true };
}

/** The row stored in `reports`. `details` is omitted when empty. */
export function buildReportRow(draft: ReportDraft, reporterId: string): Record<string, string> {
  const details = cleanDetails(draft.details);
  const sound = draft.targetType === "sound" ? `[sound: ${(draft.soundName ?? "").trim().slice(0, 80)}]` : "";
  const text = [sound, details].filter(Boolean).join(" ").slice(0, MAX_DETAILS);
  const row: Record<string, string> = { target_type: draft.targetType, target_id: draft.targetId, reporter_id: reporterId, reason: draft.category ?? "other" };
  if (text) row.details = text;
  return row;
}

/** True when a database error means the reporting columns are missing (migration not applied). */
export function isMissingReportColumn(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .*details|could not find the 'details' column/i.test(error.message ?? "");
}

export const REPORT_NOTE = "Your report is saved for review. It does not remove anything by itself, and Fresh may not tell you the outcome. Automated checks and reviews can be wrong.";
export const COPYRIGHT_NOTE = "This records your concern for review. It is not a formal legal notice.";
