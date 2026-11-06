/**
 * Context panel logic for Fresh Shorts (specification Part 7).
 *
 * Two real things, nothing invented:
 *  1. Details the platform already knows about a Short (creator, verified badge, published date, sound).
 *  2. An evidence check the viewer starts on purpose: the Short's caption is sent to the Fresh AI gateway
 *     (/api/ai/ask), and the panel reports what the gateway returned, with its sources, using labels that
 *     never claim more than the evidence supports. It is an AI evidence check, not a human fact-check.
 */
export type ContextShort = {
  id: string;
  authorName: string;
  authorUsername: string;
  /** Unknown when the creator profile did not provide verification metadata. */
  authorVerified?: boolean;
  caption: string;
  soundName?: string | null;
  createdAt?: string | null;
};

export type ProvenanceRow = { label: string; value: string };

export function buildProvenance(short: ContextShort, now: Date = new Date()): ProvenanceRow[] {
  const rows: ProvenanceRow[] = [
    { label: "Creator", value: `${short.authorName} (@${short.authorUsername})${short.authorVerified ? " — verified account" : ""}` },
  ];
  if (short.createdAt) {
    const published = new Date(short.createdAt);
    if (!Number.isNaN(published.getTime())) {
      const days = Math.floor((now.getTime() - published.getTime()) / 86_400_000);
      const age = days <= 0 ? "today" : days === 1 ? "yesterday" : days < 60 ? `${days} days ago` : published.toISOString().slice(0, 10);
      rows.push({ label: "Published", value: age });
    }
  }
  rows.push({ label: "Sound", value: short.soundName?.trim() ? short.soundName.trim() : "Original sound or none named" });
  return rows;
}

const MAX_CAPTION_IN_PROMPT = 500;

/** The question sent to Fresh AI. Instructs it to rely on evidence only and to say when it cannot verify. */
export function buildContextGoal(short: ContextShort): string {
  const caption = short.caption.trim().slice(0, MAX_CAPTION_IN_PROMPT);
  return [
    "Check the factual claims in this Fresh Short caption using trustworthy sources.",
    "Say clearly which claims are supported, which cannot be verified, and which sources disagree.",
    "If there is no checkable factual claim (opinion, entertainment, personal story), say so briefly.",
    "Do not guess. Do not claim verification you do not have.",
    `Caption: "${caption}"`,
  ].join("\n");
}

export type EvidenceItem = { title: string; snippet: string };
export type AskPayload = {
  answer?: string;
  error?: string;
  evidence?: EvidenceItem[];
  verification?: { uniqueSources?: number; uniqueDomains?: number; confidence?: string; contradictionsDetected?: boolean };
};

export type ContextState = "supported" | "limited" | "unverified" | "disputed" | "error";

export type ContextSource = { url: string | null; host: string; snippet: string };

export type ContextResult = {
  state: ContextState;
  label: string;
  explanation: string;
  answer: string;
  sources: ContextSource[];
};

function hostOf(value: string): { url: string | null; host: string } {
  try {
    const u = new URL(value);
    if (u.protocol === "http:" || u.protocol === "https:") return { url: u.toString(), host: u.hostname.replace(/^www\./, "") };
  } catch { /* not a URL */ }
  return { url: null, host: value.slice(0, 60) || "Source" };
}

/** Turns the gateway response into what the panel shows. Conservative by design. */
export function interpretAskResponse(ok: boolean, payload: AskPayload | null | undefined): ContextResult {
  if (!ok || !payload || payload.error) {
    return { state: "error", label: "Could not check", explanation: payload?.error || "Fresh AI could not complete the check right now. Try again shortly.", answer: "", sources: [] };
  }
  const sources: ContextSource[] = (payload.evidence ?? []).slice(0, 8).map((item) => ({ ...hostOf(String(item.title ?? "")), snippet: String(item.snippet ?? "").slice(0, 300) }));
  const answer = String(payload.answer ?? "").trim();
  const domains = payload.verification?.uniqueDomains ?? new Set(sources.map((s) => s.host)).size;
  if (payload.verification?.contradictionsDetected) {
    return { state: "disputed", label: "Sources disagree", explanation: "Fresh AI found sources that contradict each other on this topic. Read them before you share.", answer, sources };
  }
  if (sources.length === 0) {
    return { state: "unverified", label: "Not verified", explanation: "No usable sources were found, so nothing here is confirmed. This is not the same as false.", answer, sources };
  }
  if (sources.length >= 3 && domains >= 2) {
    return { state: "supported", label: "Supported by several sources", explanation: `Fresh AI found ${sources.length} sources across ${domains} sites. This is an automated evidence check, not a human fact-check.`, answer, sources };
  }
  return { state: "limited", label: "Limited evidence", explanation: "Only a little evidence was found. Treat the answer as a starting point.", answer, sources };
}
