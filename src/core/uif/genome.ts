export interface DigitalGenome{

  id:string;

  type:string;

  name:string;

  owner:string;

  capabilities:string[];

  permissions:string[];

  relationships:string[];

  goals:string[];

  state:"active"|"inactive"|"pending";

  metadata:Record<string,unknown>;

  createdAt:string;

  updatedAt:string;

}
