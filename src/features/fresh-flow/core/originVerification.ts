import type { Origin } from "./provenance.ts";

export type FingerprintInfo = { sha256: string; sizeBytes: number; registeredAt: string; proofHash: string | null };
export type FingerprintMatch = { shortId: string; authorId: string; username: string | null; registeredAt: string; isFirst: boolean };

export type OriginVerdict =
  | { kind: "unregistered" }
  | { kind: "first"; headline: string; detail: string; conflict: false }
  | { kind: "creator-earlier"; headline: string; detail: string; conflict: false }
  | { kind: "earlier-copy"; headline: string; detail: string; conflict: boolean; first: FingerprintMatch };

export const VERIFICATION_NOTICE = [
  "A file fingerprint shows these exact bytes were first registered on Fresh by an account at a recorded time. It does not show who made the file.",
  "Any edit or re-encode changes the fingerprint, so a changed copy will not match. Signed content credentials are not part of this yet.",
] as const;

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const who = (m: FingerprintMatch) => (m.username ? `@${m.username}` : "another creator");

/** What the fingerprints say about one Short, and whether that sits badly with what its creator declared. */
export function verdictFor(shortId: string, authorId: string, declared: Origin | null, own: FingerprintInfo | null, matches: FingerprintMatch[]): OriginVerdict {
  if (!own) return { kind: "unregistered" };
  const ordered = [...matches].sort((a, b) => Date.parse(a.registeredAt) - Date.parse(b.registeredAt));
  const first = ordered[0];
  if (!first || first.shortId === shortId) return { kind: "first", headline: "First registered copy", detail: `This exact file was first registered on Fresh on ${day(own.registeredAt)}. No earlier copy has been seen.`, conflict: false };
  if (first.authorId === authorId) return { kind: "creator-earlier", headline: "Registered earlier by the same creator", detail: `The creator registered this exact file earlier, on ${day(first.registeredAt)}.`, conflict: false };
  const credited = declared === "remix" || declared === "third-party";
  return {
    kind: "earlier-copy",
    headline: credited ? "An earlier copy exists (credited by the creator)" : "An earlier copy exists",
    detail: `${who(first)} registered this exact file on ${day(first.registeredAt)}, before this Short.${credited ? " The creator declared it as reuse." : declared === "original" ? " The creator declared it as original, which does not match." : " The creator has not explained this."}`,
    conflict: declared === "original",
    first,
  };
}

export type FileCheck =
  | { kind: "this-short"; detail: string }
  | { kind: "registered-elsewhere"; detail: string; first: FingerprintMatch }
  | { kind: "not-registered"; detail: string };

/** What a viewer learns by checking a file they hold against Fresh's fingerprints. */
export function fileCheckFor(fileSha: string, own: FingerprintInfo | null, matches: FingerprintMatch[]): FileCheck {
  if (own && own.sha256 === fileSha) return { kind: "this-short", detail: "This file is byte-for-byte the one registered for this Short." };
  const ordered = [...matches].sort((a, b) => Date.parse(a.registeredAt) - Date.parse(b.registeredAt));
  const first = ordered[0];
  if (first) return { kind: "registered-elsewhere", detail: `This file is not the one registered for this Short. An identical file was first registered by ${who(first)} on ${day(first.registeredAt)}.`, first };
  return { kind: "not-registered", detail: "Fresh has no record of this exact file. It may be edited, re-encoded, or simply never registered here." };
}

export function badgeWithVerification(declaredBadge: string | null, verdict: OriginVerdict): string | null {
  if (verdict.kind === "unregistered") return declaredBadge;
  const tag = verdict.kind === "earlier-copy" ? "earlier copy exists" : "file registered";
  return declaredBadge ? `${declaredBadge} · ${tag}` : tag.charAt(0).toUpperCase() + tag.slice(1);
}
