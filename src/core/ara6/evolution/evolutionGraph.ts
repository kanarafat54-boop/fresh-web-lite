import type { EvolutionNode } from "./evolutionNode";

class EvolutionGraph{

private nodes:EvolutionNode[]=[];

register(node:EvolutionNode){

this.nodes.push(node);

}

getAll(){

return this.nodes;

}

getChildren(parentId:string){

return this.nodes.filter(

node=>node.parentId===parentId

);

}

}

export const evolutionGraph=
new EvolutionGraph();
