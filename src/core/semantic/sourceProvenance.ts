export type ProvenanceKind = "original" | "report" | "syndication" | "aggregation" | "social_repost" | "quotation" | "unknown";

export type ProvenanceNode = { id: string; provider: string; url?: string; title?: string; kind: ProvenanceKind; observedAt?: string };
export type ProvenanceEdge = { fromId: string; toId: string; relation: "derived_from" | "quotes" | "syndicates" | "reposts" | "references" | "unknown"; confidence: number; evidence?: string };
export type ProvenanceGraph = { nodes: ProvenanceNode[]; edges: ProvenanceEdge[] };

export function buildProvenanceGraph(nodes: ProvenanceNode[], edges: ProvenanceEdge[]): ProvenanceGraph {
  const ids = new Set(nodes.map(n => n.id));
  return { nodes, edges: edges.filter(e => ids.has(e.fromId) && ids.has(e.toId) && e.fromId !== e.toId && e.confidence >= 0 && e.confidence <= 1) };
}

export function countIndependentOrigins(graph: ProvenanceGraph, sourceId: string): number {
  const seen = new Set<string>();
  const origins = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const incoming = graph.edges.filter(e => e.toId === id && e.confidence >= 0.7);
    if (!incoming.length) origins.add(id);
    for (const edge of incoming) visit(edge.fromId);
  };
  visit(sourceId);
  return origins.size;
}

/** Counts distinct known upstream origins; missing lineage remains explicitly unknown. */
export function provenanceAdjustedIndependence(graph: ProvenanceGraph, sourceIds: string[]): number {
  const origins = new Set<string>();
  for (const sourceId of sourceIds) {
    const seen = new Set<string>();
    const visit = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const incoming = graph.edges.filter(e => e.toId === id && e.confidence >= 0.7);
      if (!incoming.length) origins.add(id);
      for (const edge of incoming) visit(edge.fromId);
    };
    visit(sourceId);
    if (!seen.size) origins.add(`unknown:${sourceId}`);
  }
  return origins.size;
}
