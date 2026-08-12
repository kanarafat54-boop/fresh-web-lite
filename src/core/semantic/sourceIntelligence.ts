import type { SemanticEvidence } from "./types";

export type SourceProfile = { id: string; provider: string; canonicalHost?: string; reliability: number; independence: number; observations: number; lastObservedAt?: string };
export type EvidenceRelationship = "independent" | "same_source" | "same_origin" | "likely_copy" | "possible_copy" | "unknown";
export type EvidenceIndependence = { evidenceId: string; relatedEvidenceId: string; relationship: EvidenceRelationship; score: number; reasons: string[] };
export type EvidenceWeight = { evidenceId: string; rawConfidence: number; sourceReliability: number; independence: number; effectiveWeight: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function hostOf(url: string): string | undefined { try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return undefined; } }
function normalizedText(text: string): string { return text.toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim(); }
function similarity(a: string, b: string): number { const aa = new Set(normalizedText(a).split(" ").filter(Boolean)); const bb = new Set(normalizedText(b).split(" ").filter(Boolean)); if (!aa.size || !bb.size) return 0; let intersection = 0; for (const token of aa) if (bb.has(token)) intersection += 1; return intersection / Math.max(1, aa.size + bb.size - intersection); }
export function compareEvidence(a: SemanticEvidence, b: SemanticEvidence): EvidenceIndependence {
  const hostA = hostOf(a.sourceUrl), hostB = hostOf(b.sourceUrl);
  if (a.id === b.id) return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "same_source", score: 0, reasons: ["Evidence records have the same identifier."] };
  if (a.sourceUrl === b.sourceUrl) return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "same_origin", score: 0.05, reasons: ["Both records point to the same URL."] };
  if (hostA && hostA === hostB) return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "same_source", score: 0.2, reasons: ["Both records originate from the same canonical host."] };
  const copyScore = Math.max(similarity(a.claim, b.claim), similarity(a.sourceTitle ?? "", b.sourceTitle ?? ""));
  if (copyScore >= 0.9) return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "likely_copy", score: 0.15, reasons: ["Claims/titles are highly similar across different hosts; sources may be repeating the same report."] };
  if (copyScore >= 0.7) return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "possible_copy", score: 0.45, reasons: ["Claims/titles have substantial lexical overlap; independence is uncertain."] };
  return { evidenceId: a.id, relatedEvidenceId: b.id, relationship: "independent", score: 1, reasons: ["No strong source or textual dependency signal was detected."] };
}
export function buildSourceProfile(provider: string, evidence: SemanticEvidence[], reliability = 0.5): SourceProfile {
  const providerEvidence = evidence.filter((item) => item.provider === provider);
  const hosts = providerEvidence.map((item) => hostOf(item.sourceUrl)).filter((value): value is string => Boolean(value));
  const observed = providerEvidence.map((item) => item.observedAt).sort();
  return { id: `source:${provider}`, provider, canonicalHost: hosts[0], reliability: clamp(reliability), independence: 1, observations: providerEvidence.length, lastObservedAt: observed.length ? observed[observed.length - 1] : undefined };
}
export function weightEvidence(evidence: SemanticEvidence, profile: SourceProfile, independence = 1): EvidenceWeight { const rawConfidence = clamp(evidence.confidence ?? 0.5); const sourceReliability = clamp(profile.reliability); const independentFactor = clamp(independence); return { evidenceId: evidence.id, rawConfidence, sourceReliability, independence: independentFactor, effectiveWeight: clamp(rawConfidence * sourceReliability * independentFactor) }; }
export function effectiveEvidenceWeights(evidence: SemanticEvidence[], profiles = new Map<string, SourceProfile>()): EvidenceWeight[] { return evidence.map((item, index) => { const profile = profiles.get(item.provider) ?? buildSourceProfile(item.provider, evidence); let independence = 1; for (let i = 0; i < index; i += 1) independence = Math.min(independence, compareEvidence(item, evidence[i]).score); return weightEvidence(item, profile, independence); }); }
export function aggregateIndependentEvidence(evidence: SemanticEvidence[], profiles = new Map<string, SourceProfile>()): number { const weights = effectiveEvidenceWeights(evidence, profiles); return clamp(1 - weights.reduce((remaining, weight) => remaining * (1 - weight.effectiveWeight), 1)); }
