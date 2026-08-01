import type { SystemNode } from "./systemNode";
import type { Dependency } from "./dependency";

class WorldModel{

private nodes:SystemNode[]=[];

private dependencies:Dependency[]=[];

registerNode(node:SystemNode){

this.nodes.push(node);

}

registerDependency(
dependency:Dependency
){

this.dependencies.push(
dependency
);

}

getNodes(){

return this.nodes;

}

getDependencies(){

return this.dependencies;

}

findNode(id:string){

return this.nodes.find(

node=>node.id===id

);

}

}

export const worldModel=
new WorldModel();
