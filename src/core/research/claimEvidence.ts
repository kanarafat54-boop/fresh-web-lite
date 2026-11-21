import type { EvidencePassport } from "./evidencePassport.js";

/**
 * Claim-to-passage evidence (v1).
 *
 * Splits a synthesized answer into statements and, for each one, looks for an exact passage in the material Fresh captured
 * (the Evidence Passports). It answers one narrow question: "does a captured source passage contain what this statement says?"
 *
 * It is a deterministic word-and-number match. It is NOT proof that a statement is true and NOT a reading of meaning: it cannot
 * tell namesakes apart, and a passage that uses the same words can still disagree. Every match carries the exact quote and its
 * position in the passport's fingerprinted text, so a person (or a test) can check it. When nothing matches, the statement is
 * reported as not confirmed by any captured source. It is never quietly treated as supported.
 *
 * No Node-only imports: the browser can re-check quotes against passports itself.
 */

export const CLAIM_EVIDENCE_METHOD = "term-overlap-v1";

/** Fresh's own caveats. They are not claims about the world, so they need no source. */
export const FRESH_NOTES = {
  conflict: "Fresh found potentially conflicting evidence across independent research passes. Review the cited sources before treating the result as settled.",
  noAnswer: "Fresh found sources but could not produce a synthesized answer.",
} as const;

export const CLAIM_EVIDENCE_LIMITATIONS: readonly string[] = [
  "A matching passage means the captured source text contains the statement's key words and numbers. It does not prove the statement is true, or that the source means the same thing.",
  "Fresh checks only the excerpt it captured for each source, not the complete page.",
  "A statement with no matching passage is not confirmed by any captured source. It may still be right, or wrong.",
];

export type NoPassageReason = "too_short" | "low_overlap" | "number_missing" | "negation_differs" | "no_sources";

export type PassageSupport = {
  passportId: string;
  sourceUrl: string;
  sourceTitle: string;
  publisherDomain: string;
  publishedAt?: string;
  observedAt: string;
  capturedKind: "publisher_excerpt" | "title_only";
  /** Exactly `capturedMaterial.text.slice(start, end)` of the passport named above. */
  quote: string;
  start: number;
  end: number;
  method: typeof CLAIM_EVIDENCE_METHOD;
  /** Share of the statement's distinctive terms found in the quote, 0 to 1. */
  score: number;
  matchedTerms: string[];
  strength: "strong" | "partial";
};

export type AnswerStatement = {
  id: string;
  /** Exactly `answer.slice(start, end)`. */
  text: string;
  start: number;
  end: number;
  kind: "claim" | "note";
  support: "passage_found" | "no_passage_found" | "not_applicable";
  /** Best first, at most one per source, at most MAX_PASSAGES. */
  passages: PassageSupport[];
  /** Why the closest candidate was rejected. Only set when support is no_passage_found. */
  reason?: NoPassageReason;
};

export type AnswerEvidence = {
  method: typeof CLAIM_EVIDENCE_METHOD;
  statements: AnswerStatement[];
  /** The statements cover answer.slice(0, checkedUpTo). Whatever follows was NOT checked, and must be shown as such, never dropped. */
  checkedUpTo: number;
  /** Length of the whole answer, in characters. */
  answerLength: number;
  /** Characters after checkedUpTo that are not blank. 0 when the whole answer was checked. */
  uncheckedChars: number;
  summary: { claims: number; withPassage: number; strong: number; partial: number; withoutPassage: number };
  limitations: readonly string[];
};

const MAX_ANSWER_CHARS = 8000;
const MAX_STATEMENTS = 40;
const MAX_PASSPORTS = 40;
const MAX_PASSAGE_TEXT = 6000;
const MAX_WINDOW_CHARS = 700;
const MAX_PASSAGES = 3;
const MIN_TERMS = 3;
const STRONG = 0.8;
const PARTIAL = 0.55;

type Segment = { text: string; start: number; end: number };

const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "vs", "etc", "inc", "ltd", "co", "no", "fig", "e.g", "i.e", "u.s", "u.k", "u.n", "a.m", "p.m"]);
const CLOSERS = /["'”’)\]]/;

/** The word, with its dots, that ends right before position `at`. */
function wordBefore(text: string, at: number): string {
  let i = at;
  while (i > 0 && /[\p{L}.]/u.test(text[i - 1])) i -= 1;
  return text.slice(i, at);
}

/** Splits text into sentences and lines. Offsets always index the original string, so `text.slice(start, end) === segment.text`. */
export function splitStatements(text: string): Segment[] {
  const out: Segment[] = [];
  let segmentStart = 0;
  const flush = (to: number): void => {
    let start = segmentStart, end = to;
    while (start < end && /\s/.test(text[start])) start += 1;
    // A list marker is layout, not part of the statement.
    const marker = /^(?:[-*•–]|\d{1,2}[.)])\s+/.exec(text.slice(start, end));
    if (marker) start += marker[0].length;
    while (end > start && /\s/.test(text[end - 1])) end -= 1;
    if (end > start) out.push({ text: text.slice(start, end), start, end });
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "\n") { flush(i); segmentStart = i + 1; continue; }
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    let j = i + 1;
    while (j < text.length && CLOSERS.test(text[j])) j += 1;
    if (j < text.length && !/\s/.test(text[j])) continue; // 3.5, example.com, U.S.A
    if (ch === ".") {
      const word = wordBefore(text, i);
      if (ABBREVIATIONS.has(word.toLowerCase()) || /^\p{Lu}$/u.test(word)) continue;
      if (/^\s*\d{1,2}$/.test(text.slice(segmentStart, i))) continue; // "1." at the start is a list marker, not a sentence
      let k = j;
      while (k < text.length && /[ \t]/.test(text[k])) k += 1;
      if (k < text.length && /\p{Ll}/u.test(text[k])) continue; // the next word is lower case: not a new sentence
    }
    flush(j);
    segmentStart = j;
    i = j - 1;
  }
  flush(text.length);
  return out;
}

const STOP_WORDS = new Set(("a about after all also an and any are as at be been being but by can could did do does for from had has have he her his how i if in into is it its may might more most of on or our she so some such than that the their them then there these they this those to too up us was we were what when where which who whom why will with would you your").split(" "));
const NEGATIONS = new Set(["not", "no", "never", "none", "cannot", "without", "neither", "nor", "denied", "denies", "deny", "refused", "rejected", "false", "unable", "failed", "fails"]);
/** A number may carry a leading minus (hyphen, minus sign or en dash); see termsOf for when that dash is a sign. */
const TOKEN = /[-−–]?\p{N}+(?:[.,]\p{N}+)*|\p{L}+/gu;

type Terms = { all: string[]; numbers: Set<string>; negated: boolean };

function canonical(token: string): string {
  if (/^-?\p{N}/u.test(token)) return token.replace(/,/g, "");
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && /(?:x|ch|sh|ss|z)es$/.test(token)) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

/** Distinctive terms of a text, in order of first appearance, plus its numbers and whether it is negated. */
export function termsOf(text: string): Terms {
  const raw = text.normalize("NFKC").toLowerCase();
  const seen = new Set<string>(), all: string[] = [], numbers = new Set<string>();
  let negated = /n['’]t\b/.test(raw);
  for (const match of raw.matchAll(TOKEN)) {
    let token = match[0];
    if (/^[-−–]/u.test(token)) {
      // A minus sign reverses a number ("-5 million" is not "5 million"), but the dash in "5-10" or "COVID-19" is punctuation:
      // it is a sign only when no letter or digit comes right before it. A plus sign never changes a number's meaning here.
      const before = match.index > 0 ? raw[match.index - 1] : "";
      token = !before || !/[\p{L}\p{N}]/u.test(before) ? `-${token.slice(1)}` : token.slice(1);
    }
    if (NEGATIONS.has(token)) { negated = true; continue; }
    const isNumber = /^-?\p{N}/u.test(token);
    if (!isNumber && (STOP_WORDS.has(token) || token.length < 2)) continue;
    const term = canonical(token);
    if (isNumber) numbers.add(term);
    if (!seen.has(term)) { seen.add(term); all.push(term); }
  }
  return { all, numbers, negated };
}

type Window = { passport: EvidencePassport; text: string; start: number; end: number; terms: Terms };

function windowsOf(passport: EvidencePassport): Window[] {
  const text = passport.capturedMaterial.text.slice(0, MAX_PASSAGE_TEXT);
  const sentences = splitStatements(text);
  const out: Window[] = [];
  const add = (start: number, end: number): void => {
    if (end - start > MAX_WINDOW_CHARS) return;
    const quote = text.slice(start, end);
    out.push({ passport, text: quote, start, end, terms: termsOf(quote) });
  };
  sentences.forEach((sentence, index) => {
    add(sentence.start, sentence.end);
    const next = sentences[index + 1];
    if (next) add(sentence.start, next.end); // a fact is sometimes split over two sentences
  });
  return out;
}

type Candidate = { window: Window; score: number; matched: string[]; strength: "strong" | "partial" };

function judge(claim: Terms, window: Window): { candidate?: Candidate; reason: NoPassageReason } {
  const matched = claim.all.filter((term) => window.terms.all.includes(term));
  const score = matched.length / claim.all.length;
  if (score < PARTIAL) return { reason: "low_overlap" };
  for (const number of claim.numbers) if (!window.terms.numbers.has(number)) return { reason: "number_missing" };
  if (claim.negated !== window.terms.negated) return { reason: "negation_differs" };
  return { candidate: { window, score, matched, strength: score >= STRONG ? "strong" : "partial" }, reason: "low_overlap" };
}

const RANK_REASON: NoPassageReason[] = ["no_sources", "too_short", "low_overlap", "negation_differs", "number_missing"];

function passageOf(candidate: Candidate): PassageSupport {
  const { passport } = candidate.window;
  return {
    passportId: passport.id,
    sourceUrl: passport.source.url,
    sourceTitle: passport.source.title,
    publisherDomain: passport.source.publisherDomain,
    ...(passport.source.publishedAt ? { publishedAt: passport.source.publishedAt } : {}),
    observedAt: passport.source.observedAt,
    capturedKind: passport.capturedMaterial.kind,
    quote: candidate.window.text,
    start: candidate.window.start,
    end: candidate.window.end,
    method: CLAIM_EVIDENCE_METHOD,
    score: Math.round(candidate.score * 100) / 100,
    matchedTerms: candidate.matched,
    strength: candidate.strength,
  };
}

/** True when the quote really is the text it claims to be, at the stated place in the stated passport. */
export function quoteMatchesPassport(passage: PassageSupport, passport: Pick<EvidencePassport, "id" | "capturedMaterial">): boolean {
  return passport.id === passage.passportId
    && Number.isInteger(passage.start) && Number.isInteger(passage.end)
    && passage.start >= 0 && passage.end > passage.start
    && passport.capturedMaterial.text.slice(passage.start, passage.end) === passage.quote;
}

function isFreshNote(text: string): boolean {
  return NOTE_SENTENCES.has(text);
}
const NOTE_SENTENCES = new Set(Object.values(FRESH_NOTES).flatMap((note) => splitStatements(note).map((segment) => segment.text)));

/**
 * Maps each statement of the answer to the best captured passages that contain what it says.
 * Deterministic: the same answer and passports always give the same result.
 */
export function mapAnswerToPassages(answer: string, passports: readonly EvidencePassport[]): AnswerEvidence {
  const windows = passports.slice(0, MAX_PASSPORTS).flatMap(windowsOf);
  // The work is bounded, but nothing is lost silently: a sentence cut by the limit is not checked as if it were whole,
  // and everything after the last checked sentence is reported as unchecked so the screen can still show it.
  let segments = splitStatements(answer.slice(0, MAX_ANSWER_CHARS));
  if (answer.length > MAX_ANSWER_CHARS) segments = segments.slice(0, -1);
  segments = segments.slice(0, MAX_STATEMENTS);
  const checkedUpTo = segments.length ? segments[segments.length - 1].end : 0;
  const uncheckedChars = answer.slice(checkedUpTo).trim().length;
  const statements: AnswerStatement[] = segments.map((segment, index) => {
    const base = { id: `s${index + 1}`, text: segment.text, start: segment.start, end: segment.end };
    if (isFreshNote(segment.text)) return { ...base, kind: "note" as const, support: "not_applicable" as const, passages: [] };
    const claim = termsOf(segment.text);
    if (claim.all.length < MIN_TERMS) return { ...base, kind: "claim" as const, support: "no_passage_found" as const, passages: [], reason: "too_short" as const };
    if (!windows.length) return { ...base, kind: "claim" as const, support: "no_passage_found" as const, passages: [], reason: "no_sources" as const };
    const candidates: Candidate[] = [];
    let reason: NoPassageReason = "low_overlap";
    for (const window of windows) {
      const verdict = judge(claim, window);
      if (verdict.candidate) candidates.push(verdict.candidate);
      else if (RANK_REASON.indexOf(verdict.reason) > RANK_REASON.indexOf(reason)) reason = verdict.reason;
    }
    // Best first: strong before partial, higher score, then the shorter (more exact) quote. One passage per source.
    candidates.sort((a, b) => (a.strength === b.strength ? 0 : a.strength === "strong" ? -1 : 1) || b.score - a.score || a.window.text.length - b.window.text.length);
    const passages: PassageSupport[] = [], used = new Set<string>();
    for (const candidate of candidates) {
      if (used.has(candidate.window.passport.id)) continue;
      used.add(candidate.window.passport.id);
      passages.push(passageOf(candidate));
      if (passages.length === MAX_PASSAGES) break;
    }
    return passages.length
      ? { ...base, kind: "claim" as const, support: "passage_found" as const, passages }
      : { ...base, kind: "claim" as const, support: "no_passage_found" as const, passages: [], reason };
  });
  const claims = statements.filter((statement) => statement.kind === "claim");
  const withPassage = claims.filter((statement) => statement.support === "passage_found");
  return {
    method: CLAIM_EVIDENCE_METHOD,
    statements,
    checkedUpTo,
    answerLength: answer.length,
    uncheckedChars,
    summary: {
      claims: claims.length,
      withPassage: withPassage.length,
      strong: withPassage.filter((statement) => statement.passages[0].strength === "strong").length,
      partial: withPassage.filter((statement) => statement.passages[0].strength === "partial").length,
      withoutPassage: claims.length - withPassage.length,
    },
    limitations: CLAIM_EVIDENCE_LIMITATIONS,
  };
}
