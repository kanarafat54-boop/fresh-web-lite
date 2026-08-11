import type { SemanticEvidence } from "./types";
import { compareEvidence, effectiveEvidenceWeights, type EvidenceRelationship, type SourceProfile } from "./sourceIntelligence";

export type EvidenceLineageNodeType = "evidence" | "source" | "claim";
export type EvidenceLineageNode = { id: string; type: EvidenceLineageNodeType; label: string; metadata?: Record<string, string | number | boolean | null> };
export type EvidenceLineageEdge = { from: string; to: string; relation: "published_by" | "reports" | "likely_copies" | "possibly_copies" | "same_origin" | "supports" | "contradicts"; score: number };

export type EvidenceLineageGraph = {
  nodes: EvidenceLineageNode[];
  edges: EvidenceLineageEdge[];
  independentEvidenceIds: string[];
  dependentEvidenceIds: string[];
};

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return url; } };

export function buildEvidenceLineage(evidence: SemanticEvidence[], profiles = new Map<string, SourceProfile>()): EvidenceLineageGraph {
  const nodes: EvidenceLineageNode[] = [];
  const edges: EvidenceLineageEdge[] = [];
  const independent = new Set<string>();
  const dependent = new Set<string>();
  const weights = effectiveEvidenceWeights(evidence, profiles);

  for (const item of evidence) {
    const sourceId = `source:${item.provider}:${host(item.sourceUrl)}`;
    nodes.push({ id: `evidence:${item.id}`, type: "evidence", label: item.sourceTitle ?? item.sourceUrl, metadata: { provider: item.provider, url: item.sourceUrl, confidence: item.confidence ?? 0.5 } });
    nodes.push({ id: sourceId, type: "source", label: item.provider, metadata: { host: host(item.sourceUrl) } });
    edges.push({ from: `evidence:${item.id}`, to: sourceId, relation: "published_by", score: 1 });
  }

  for (let i = 0; i < evidence.length; i += 1) {
    let isDependent = false;
    for (let j = 0; j < i; j += 1) {
      const relationship = compareEvidence(evidence[i], evidence[j]);
      const relationMap: Record<EvidenceRelationship, EvidenceLineageEdge["relation"] | undefined> = {
        independent: undefined, unknown: undefined, same_source: "same_origin", same_origin: "same_origin", likely_copy: "likely_copies", possible_copy: "possibly_copies",
      };
      const relation = relationMap[relationship.relationship];
      if (relation) {
        edges.push({ from: `evidence:${evidence[i].id}`, to: `evidence:${evidence[j].id}`, relation, score: relationship.score });
        if (relationship.relationship !== "same_origin" && relationship.relationship !== "same_source") isDependent = true;
      }
    }
    if (isDependent || (weights[i]?.independence ?? 1) < 0.5) dependent.add(evidence[i].id); else independent.add(evidence[i].id);
  }

  return { nodes, edges, independentEvidenceIds: [...independent], dependentEvidenceIds: [...dependent] };
}
