import type {
  KnowledgeNode,
  KnowledgeEdge
} from "./graphTypes";

class KnowledgeGraph {

  private nodes: KnowledgeNode[] = [];

  private edges: KnowledgeEdge[] = [];

  addNode(node: KnowledgeNode) {

    if (this.nodes.some(n => n.id === node.id)) {
      return;
    }

    this.nodes.push(node);

  }

  addEdge(edge: KnowledgeEdge) {

    this.edges.push(edge);

  }

  getNode(id: string) {

    return this.nodes.find(n => n.id === id);

  }

  getConnections(id: string) {

    return this.edges.filter(
      edge =>
        edge.from === id ||
        edge.to === id
    );

  }

  getNodes() {

    return this.nodes;

  }

  getEdges() {

    return this.edges;

  }

}

export const knowledgeGraph =
new KnowledgeGraph();
