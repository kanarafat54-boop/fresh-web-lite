import type { SemanticEvidence } from "./types";
import type { EvidenceLineageGraph } from "./evidenceLineage";

export type ProvenanceNodeType = "origin" | "publisher" | "syndicator" | "aggregator" | "social" | "unknown";
export type ProvenanceNode = { id: string; type: ProvenanceNodeType; label: string; url?: string };
export type ProvenanceEdge = { from: string; to: string; relation: "originated_at" | "published_by" | "syndicated_by" | "aggregated_by" | "shared_by" | "derived_from"; confidence: number };

export type EvidenceProvenanceGraph = {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
};

function hostname(url?: string): string | undefined {
  if (!url) return undefined;
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return undefined; }
}

function classifyProvider(provider: string): ProvenanceNodeType {
  const p = provider.toLowerCase();
  if (/social|twitter|x\.com|facebook|instagram|tiktok|reddit|youtube/.test(p)) return "social";
  if (/aggregat|newsapi|google news|feed/.test(p)) return "aggregator";
  if (/syndicat|wire|press release/.test(p)) return "syndicator";
  if (/unknown|user/.test(p)) return "unknown";
  return "publisher";
}

/**
 * Builds provenance without inventing an origin. Relationships are marked
 * derived/possible only when the existing lineage graph supplies evidence.
 */
export function buildEvidenceProvenance(evidence: SemanticEvidence[], lineage: EvidenceLineageGraph): EvidenceProvenanceGraph {
  const nodes = new Map<string, ProvenanceNode>();
  const edges: ProvenanceEdge[] = [];
  const addNode = (node: ProvenanceNode) => nodes.set(node.id, node);

  for (const item of evidence) {
    const host = hostname(item.sourceUrl);
    const sourceId = `publisher:${item.provider}:${host ?? "unknown"}`;
    addNode({ id: sourceId, type: classifyProvider(item.provider), label: item.provider, url: item.sourceUrl });
    addNode({ id: `evidence:${item.id}`, type: "unknown", label: item.sourceTitle ?? item.sourceUrl, url: item.sourceUrl });
    edges.push({ from: `evidence:${item.id}`, to: sourceId, relation: "published_by", confidence: 1 });
  }

  for (const edge of lineage.edges) {
    if (edge.relation === "likely_copies" || edge.relation === "possibly_copies") {
      edges.push({ from: edge.from, to: edge.to, relation: "derived_from", confidence: edge.score });
    }
    if (edge.relation === "same_origin") {
      edges.push({ from: edge.from, to: edge.to, relation: "derived_from", confidence: edge.score });
    }
  }

  return { nodes: [...nodes.values()], edges };
}

export function provenanceIndependentCount(graph: EvidenceProvenanceGraph, evidenceIds: string[]): number {
  const dependent = new Set(graph.edges.filter((e) => e.relation === "derived_from" && e.confidence >= 0.8).map((e) => e.from.replace(/^evidence:/, "")));
  return evidenceIds.filter((id) => !dependent.has(id)).length;
}
