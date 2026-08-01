import type { Relationship } from "./types";

class RelationshipEngine{

  private relationships:Relationship[]=[];

  connect(

    from:string,

    to:string,

    type:string,

    strength:number=1

  ){

    this.relationships.push({

      id:crypto.randomUUID(),

      from,

      to,

      type,

      strength,

      createdAt:new Date().toISOString()

    });

  }

  getConnections(id:string){

    return this.relationships.filter(

      relation=>

      relation.from===id ||

      relation.to===id

    );

  }

  getAll(){

    return this.relationships;

  }

}

export const relationshipEngine=
new RelationshipEngine();
