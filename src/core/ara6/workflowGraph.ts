export interface WorkflowNode {

  id: string;

  name: string;

  agent: string;

  dependsOn: string[];

  completed: boolean;

}

export interface WorkflowGraph {

  id: string;

  name: string;

  nodes: WorkflowNode[];

}

class WorkflowGraphEngine {

  private graphs: WorkflowGraph[] = [];

  create(graph: WorkflowGraph) {

    this.graphs.push(graph);

    return graph;

  }

  list() {

    return this.graphs;

  }

  get(id: string) {

    return this.graphs.find(g => g.id === id);

  }

  completeNode(
    graphId: string,
    nodeId: string
  ) {

    const graph = this.get(graphId);

    if (!graph) return;

    const node =
      graph.nodes.find(n => n.id === nodeId);

    if (!node) return;

    node.completed = true;

  }

}

export const workflowGraphEngine =
new WorkflowGraphEngine();
