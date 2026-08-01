import type { EcosystemDNA } from "./ecosystemDNA";

class DNARegistry{

private dna:EcosystemDNA[]=[];

register(item:EcosystemDNA){

this.dna.push(item);

}

getAll(){

return this.dna;

}

find(id:string){

return this.dna.find(

item=>item.id===id

);

}

}

export const dnaRegistry=
new DNARegistry();
