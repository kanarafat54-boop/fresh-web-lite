import type { DigitalGenome } from "./genome";
import type { KnowledgeNode } from "./knowledgeNode";

class UniversalIntelligenceFabric{

  private genomes:DigitalGenome[]=[];

  private knowledge:KnowledgeNode[]=[];

  registerGenome(genome:DigitalGenome){

    this.genomes.push(genome);

  }

  getGenomes(){

    return this.genomes;

  }

  registerKnowledge(node:KnowledgeNode){

    this.knowledge.push(node);

  }

  getKnowledge(){

    return this.knowledge;

  }

}

export const intelligenceFabric=
new UniversalIntelligenceFabric();
