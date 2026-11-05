/**
 * Screens a user-submitted correction before the owner can turn it into shared Fresh AI knowledge.
 *
 * Approved corrections become knowledge rows with user_id = null, which every user can be shown, so
 * personal data or credentials in a correction would leak to everyone. This module never decides
 * anything on its own: it only tells the owner what to look at.
 *
 *  - hard flags: the text cannot become shared knowledge as written (secret-shaped values, card-like
 *    numbers, bad length). The owner can edit the text or reject. The database repeats the secret
 *    and card checks, so the SQL-editor path is protected too.
 *  - soft flags: the owner may approve only after explicitly acknowledging them (emails, phone
 *    numbers, links, text that tries to instruct the assistant).
 *
 * Pure and dependency-free so it can be tested without a database or network. Keep the hard-flag
 * patterns in sync with supabase/migrations/20261023100000_fresh_ai_correction_review.sql.
 */
export type CorrectionFlag = { code: string; message: string };
export type CorrectionScreening = { hard: CorrectionFlag[]; soft: CorrectionFlag[] };

export const MIN_CORRECTION_CHARS = 10;
export const MAX_CORRECTION_CHARS = 2000;

const HARD_PATTERNS: Array<{ code: string; message: string; re: RegExp }> = [
  { code: "secret-jwt", message: "Looks like an access token (JWT).", re: /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/ },
  { code: "secret-api-key", message: "Looks like an API key.", re: /(^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{16,}/ },
  { code: "secret-github-token", message: "Looks like a GitHub token.", re: /gh[pousr]_[A-Za-z0-9]{20,}/ },
  { code: "secret-aws-key", message: "Looks like a cloud access key id.", re: /AKIA[0-9A-Z]{16}/ },
  { code: "secret-private-key", message: "Contains a private key block.", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { code: "secret-connection-string", message: "Contains a database connection string with a password.", re: /(postgres(ql)?|mysql|mongodb):\/\/[^\s]+:[^\s@]+@/i },
  { code: "card-like-number", message: "Contains a long number that could be a card or account number.", re: /(^|[^0-9])([0-9][ -]?){12,18}[0-9]([^0-9]|$)/ },
];

const SOFT_PATTERNS: Array<{ code: string; message: string; re: RegExp }> = [
  { code: "email-address", message: "Contains an email address.", re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i },
  { code: "link", message: "Contains a link.", re: /\bhttps?:\/\/\S+|\bwww\.\S+/i },
  {
    code: "instruction-to-assistant",
    message: "Contains wording that tries to instruct the assistant.",
    re: /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all)\b[^.\n]{0,40}\b(instructions?|rules?|prompts?)\b|\bsystem prompt\b|\bdeveloper message\b|\byou are now\b|\bpretend to be\b/i,
  },
];

function looksLikePhone(text: string): boolean {
  for (const match of text.matchAll(/(^|[^0-9])(\+?[0-9][0-9\s().-]{7,}[0-9])(?![0-9])/g)) {
    const candidate = match[2];
    const digits = candidate.replace(/[^0-9]/g, "").length;
    const isoDate = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(candidate.trim());
    if (digits >= 9 && !isoDate) return true;
  }
  return false;
}

/**
 * Screens what will actually be shared: the corrected answer (length rules apply) and the question
 * that becomes the knowledge title (only the content rules apply).
 */
export function screenSubmission(prompt: string, answer: string): CorrectionScreening {
  const a = screenCorrection(answer);
  const p = screenCorrection(prompt);
  const lengthCodes = new Set(["too-short", "too-long"]);
  const merge = (base: CorrectionFlag[], extra: CorrectionFlag[]) => {
    const seen = new Set(base.map((f) => f.code));
    for (const f of extra) if (!seen.has(f.code) && !lengthCodes.has(f.code)) base.push(f);
  };
  merge(a.hard, p.hard);
  merge(a.soft, p.soft);
  return a;
}

export function screenCorrection(input: string): CorrectionScreening {
  const text = typeof input === "string" ? input : "";
  const hard: CorrectionFlag[] = [];
  const soft: CorrectionFlag[] = [];
  const body = text.trim();
  if (body.length < MIN_CORRECTION_CHARS) hard.push({ code: "too-short", message: `Shorter than ${MIN_CORRECTION_CHARS} characters.` });
  if (body.length > MAX_CORRECTION_CHARS) hard.push({ code: "too-long", message: `Longer than ${MAX_CORRECTION_CHARS} characters.` });
  for (const p of HARD_PATTERNS) if (p.re.test(text)) hard.push({ code: p.code, message: p.message });
  for (const p of SOFT_PATTERNS) if (p.re.test(text)) soft.push({ code: p.code, message: p.message });
  if (looksLikePhone(text)) soft.push({ code: "phone-number", message: "Contains something that looks like a phone number." });
  return { hard, soft };
}
