export type EvidenceObservation = {
  id: string;
  sourceId?: string;
  provider: string;
  sourceUrl: string;
  sourceTitle?: string;
  claimText: string;
  publishedAt?: string;
  observedAt?: string;
};

export type EvidenceCluster = {
  id: string;
  representativeEvidenceId: string;
  evidenceIds: string[];
  sourceIds: string[];
  reason: "same_source" | "same_url" | "near_duplicate" | "same_provider_lineage" | "independent";
};

const normalize = (value: string) => value.toLowerCase().replace(/https?:\/\/[^\s]+/g, " ").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

const tokenSet = (value: string) => new Set(normalize(value).split(" ").filter(Boolean));

function similarity(a: string, b: string): number {
  const A = tokenSet(a); const B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let intersection = 0;
  for (const token of A) if (B.has(token)) intersection++;
  return intersection / (A.size + B.size - intersection);
}

/**
 * Prevents copied reporting from being counted as independent confirmation.
 * This is intentionally conservative: clustering lowers evidence multiplicity;
 * it does not declare the underlying claim true or false.
 */
export function clusterEvidence(evidence: EvidenceObservation[], nearDuplicateThreshold = 0.82): EvidenceCluster[] {
  const clusters: EvidenceCluster[] = [];
  for (const item of evidence) {
    const sameUrl = clusters.find((c) => c.evidenceIds.some((id) => evidence.find((e) => e.id === id)?.sourceUrl === item.sourceUrl));
    if (sameUrl) { sameUrl.evidenceIds.push(item.id); if (item.sourceId) sameUrl.sourceIds.push(item.sourceId); sameUrl.reason = "same_url"; continue; }

    let match: EvidenceCluster | undefined;
    for (const cluster of clusters) {
      for (const id of cluster.evidenceIds) {
        const other = evidence.find((e) => e.id === id);
        if (!other) continue;
        if (item.sourceId && other.sourceId && item.sourceId === other.sourceId) { match = cluster; cluster.reason = "same_source"; break; }
        if (similarity(item.claimText, other.claimText) >= nearDuplicateThreshold && item.provider === other.provider) { match = cluster; cluster.reason = "same_provider_lineage"; break; }
        if (similarity(item.claimText, other.claimText) >= nearDuplicateThreshold) { match = cluster; cluster.reason = "near_duplicate"; break; }
      }
      if (match) break;
    }

    if (match) { match.evidenceIds.push(item.id); if (item.sourceId) match.sourceIds.push(item.sourceId); }
    else clusters.push({ id: `evidence-cluster:${item.id}`, representativeEvidenceId: item.id, evidenceIds: [item.id], sourceIds: item.sourceId ? [item.sourceId] : [], reason: "independent" });
  }
  return clusters.map((cluster) => ({ ...cluster, sourceIds: [...new Set(cluster.sourceIds)] }));
}

export function independentEvidenceCount(evidence: EvidenceObservation[]): number {
  return clusterEvidence(evidence).length;
}

export function independenceAdjustedConfidence(rawConfidence: number, evidence: EvidenceObservation[]): number {
  const independent = independentEvidenceCount(evidence);
  if (!evidence.length) return 0;
  const multiplicityFactor = Math.min(1, independent / evidence.length + 0.25);
  return Math.max(0, Math.min(1, rawConfidence * multiplicityFactor));
}
