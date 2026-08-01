import type { Improvement } from "./improvement";

class EvolutionEngine{

private improvements:Improvement[]=[];

discover(improvement:Improvement){

this.improvements.unshift(improvement);

}

getAll(){

return this.improvements;

}

getPending(){

return this.improvements.filter(

item=>!item.approved

);

}

approve(id:string){

const item=this.improvements.find(

i=>i.id===id

);

if(item){

item.approved=true;

}

}

}

export const evolutionEngine=
new EvolutionEngine();
