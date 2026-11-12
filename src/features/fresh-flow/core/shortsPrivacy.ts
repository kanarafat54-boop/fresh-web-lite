// Privacy, comment controls and Quiet Mode for Fresh Shorts (spec 3.10, 10.4, 10.5). Pure logic, no network.

export type AudienceChoice = "everyone" | "following" | "nobody";

export type ShortsPrivacySettings = {
  whoCanComment: AudienceChoice;
  holdComments: boolean;
  commentKeywords: string[];
  whoCanMessage: AudienceChoice;
  soundReuseAllowed: boolean;
  quietEnabled: boolean;
  /** "HH:MM" 24-hour, local time. Both set means a daily quiet window; either missing means Quiet Mode has no window. */
  quietFrom: string | null;
  quietUntil: string | null;
  dailyLimitMinutes: number | null;
};

export const DEFAULT_PRIVACY: ShortsPrivacySettings = {
  whoCanComment: "everyone",
  holdComments: false,
  commentKeywords: [],
  whoCanMessage: "everyone",
  soundReuseAllowed: true,
  quietEnabled: false,
  quietFrom: null,
  quietUntil: null,
  dailyLimitMinutes: null,
};

export const MAX_KEYWORDS = 50;
export const MAX_KEYWORD_LENGTH = 40;
export const MIN_DAILY_LIMIT = 5;
export const MAX_DAILY_LIMIT = 720;

const AUDIENCES: ReadonlySet<string> = new Set(["everyone", "following", "nobody"]);

export function isAudience(value: unknown): value is AudienceChoice {
  return typeof value === "string" && AUDIENCES.has(value);
}

/** Turns "spam, Buy now ,, SPAM" into a clean, de-duplicated, length-limited list. Matching is case-insensitive. */
export function parseKeywords(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of input.split(/[,\n]/)) {
    const word = part.trim().slice(0, MAX_KEYWORD_LENGTH).trim();
    const key = word.toLowerCase();
    if (!word || seen.has(key)) continue;
    seen.add(key);
    out.push(word);
    if (out.length >= MAX_KEYWORDS) break;
  }
  return out;
}

export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(value.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function normalizeLimit(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return null;
  const whole = Math.round(n);
  return whole < MIN_DAILY_LIMIT || whole > MAX_DAILY_LIMIT ? null : whole;
}

/** Reads a database row (snake_case) or stored JSON into settings, falling back to defaults for anything invalid. */
export function settingsFromRow(row: Record<string, unknown> | null | undefined): ShortsPrivacySettings {
  if (!row) return { ...DEFAULT_PRIVACY };
  const keywords = Array.isArray(row.comment_keywords) ? parseKeywords((row.comment_keywords as unknown[]).filter((k) => typeof k === "string").join(",")) : [];
  return {
    whoCanComment: isAudience(row.who_can_comment) ? row.who_can_comment : "everyone",
    holdComments: row.hold_comments === true,
    commentKeywords: keywords,
    whoCanMessage: isAudience(row.who_can_message) ? row.who_can_message : "everyone",
    soundReuseAllowed: row.sound_reuse_allowed !== false,
    quietEnabled: row.quiet_enabled === true,
    quietFrom: normalizeTime(row.quiet_from),
    quietUntil: normalizeTime(row.quiet_until),
    dailyLimitMinutes: normalizeLimit(row.daily_limit_minutes),
  };
}

export function settingsToRow(userId: string, s: ShortsPrivacySettings): Record<string, unknown> {
  return {
    user_id: userId,
    who_can_comment: s.whoCanComment,
    hold_comments: s.holdComments,
    comment_keywords: parseKeywords(s.commentKeywords.join(",")),
    who_can_message: s.whoCanMessage,
    sound_reuse_allowed: s.soundReuseAllowed,
    quiet_enabled: s.quietEnabled,
    quiet_from: s.quietFrom,
    quiet_until: s.quietUntil,
    daily_limit_minutes: s.dailyLimitMinutes,
    updated_at: new Date().toISOString(),
  };
}

function minutesOfDay(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** True while the viewer's quiet window is active. A window may cross midnight (22:00 to 07:00). Equal times mean no window. */
export function isQuietNow(s: ShortsPrivacySettings, now: Date): boolean {
  if (!s.quietEnabled || !s.quietFrom || !s.quietUntil) return false;
  const from = minutesOfDay(s.quietFrom);
  const until = minutesOfDay(s.quietUntil);
  if (from === until) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return from < until ? current >= from && current < until : current >= from || current < until;
}

export type BreakReason = "quiet-hours" | "daily-limit";

/** Whether to interrupt watching with a break screen. Quiet hours win over the daily limit. */
export function breakDue(s: ShortsPrivacySettings, minutesWatchedToday: number, now: Date, extraMinutes = 0): BreakReason | null {
  if (!s.quietEnabled) return null;
  if (isQuietNow(s, now)) return "quiet-hours";
  if (s.dailyLimitMinutes !== null && minutesWatchedToday >= s.dailyLimitMinutes + extraMinutes) return "daily-limit";
  return null;
}

export function dayKey(now: Date): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Plain-language summary of why a comment, message or like was refused, from a database error. */
export function explainControlError(message: string | undefined): string | null {
  if (!message) return null;
  if (/turned off for this Short/i.test(message)) return "The creator turned comments off for this Short.";
  if (/only people the creator follows/i.test(message)) return "Only people the creator follows can comment on this Short.";
  if (/can'?t comment on this Short|can'?t reply to this comment|can'?t interact with this Short|can'?t message this account/i.test(message)) return "You can't do that here.";
  if (/not accepting messages|only accepts messages/i.test(message)) return "This account is not accepting your messages.";
  return null;
}

/** True when a database error means the privacy tables are not there yet. */
export function isPrivacyUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST202" || /short_privacy_settings|user_restrictions|schema cache/i.test(error.message ?? "");
}

export type CommentControlState = { held: boolean; mine: boolean; isCreator: boolean };

/** What to show for a comment in state "pending". Others never receive these rows from the database. */
export function heldCommentView(state: string | null | undefined, viewerId: string | null, authorId: string, shortAuthorId: string | null): CommentControlState | null {
  if (state !== "pending") return null;
  return { held: true, mine: viewerId !== null && viewerId === authorId, isCreator: viewerId !== null && viewerId === shortAuthorId };
}

/** A comment is hidden behind a notice unless its state is a visible one. Pending is shown separately to its author and the creator. */
export function isCommentHiddenState(state: string | null | undefined): boolean {
  if (!state) return false;
  return !["visible", "approved", "pending"].includes(state);
}
