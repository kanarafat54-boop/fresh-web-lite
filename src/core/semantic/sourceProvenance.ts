export type ProvenanceKind = "original" | "report" | "syndication" | "aggregation" | "social_repost" | "unknown";

export type ProvenanceNode = {
  id: string;
  provider: string;
  url?: string;
  title?: string;
  kind: ProvenanceKind;
  observedAt?: string;
};

export type ProvenanceEdge = {
  fromId: string;
  toId: string;
  relation: "derived_from" | "quotes" | "syndicates" | "reposts" | "references" | "unknown";
  confidence: number;
};

export type ProvenanceGraph = {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
};

export function buildProvenanceGraph(nodes: ProvenanceNode[], edges: ProvenanceEdge[]): ProvenanceGraph {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const safeEdges = edges.filter((e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId) && e.fromId !== e.toId && e.confidence >= 0 && e.confidence <= 1);
  return { nodes, edges: safeEdges };
}

/** Number of distinct upstream origins reachable from an evidence source. */
export function countIndependentOrigins(graph: ProvenanceGraph, sourceId: string): number {
  const reverse = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!reverse.has(edge.fromId)) reverse.set(edge.fromId, []);
    reverse.get(edge.fromId)!.push(edge.toId);
  }
  const seen = new Set<string>();
  const origins = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    const incoming = graph.edges.filter((e) => e.toId === id && e.confidence >= 0.7);
    if (!incoming.length) origins.add(id);
    for (const edge of incoming) visit(edge.fromId);
  };
  visit(sourceId);
  return origins.size;
}

/**
 * Prevents a provenance chain from being counted as independent confirmation.
 * Missing lineage remains unknown; it is never assumed independent.
 */
export function provenanceAdjustedIndependence(graph: ProvenanceGraph, sourceIds: string[]): number {
  const origins = new Set<string>();
  for (const id of sourceIds) {
    const count = countIndependentOrigins(graph, id);
    if (count === 0) origins.add(`unknown:${id}`);
    else origins.add(`origins:${id}:${count}`);
  }
  return origins.size;
}
