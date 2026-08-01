import type { UIGNode } from "./node";
import type { UIGEdge } from "./edge";

class UnifiedIntelligenceGraph{

  private nodes:UIGNode[]=[];

  private edges:UIGEdge[]=[];

  addNode(node:UIGNode){

    this.nodes.push(node);

  }

  addEdge(edge:UIGEdge){

    this.edges.push(edge);

  }

  getNodes(){

    return this.nodes;

  }

  getEdges(){

    return this.edges;

  }

  findNode(id:string){

    return this.nodes.find(

      node=>node.id===id

    );

  }

  getConnections(id:string){

    return this.edges.filter(

      edge=>

      edge.from===id ||

      edge.to===id

    );

  }

}

export const UIG=
new UnifiedIntelligenceGraph();
