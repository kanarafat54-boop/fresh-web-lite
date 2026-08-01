export interface KnowledgeNode {

  id: string;

  type: string;

  label: string;

  metadata?: Record<string, unknown>;

}

export interface KnowledgeEdge {

  id: string;

  from: string;

  to: string;

  relation: string;

}

