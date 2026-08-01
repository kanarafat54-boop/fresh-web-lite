import type { Proposal } from "./proposal";

class ProposalManager{

private proposals:Proposal[]=[];

create(proposal:Proposal){

this.proposals.unshift(proposal);

}

getAll(){

return this.proposals;

}

approve(id:string){

const proposal=this.proposals.find(
p=>p.id===id
);

if(proposal){

proposal.status="approved";

}

}

reject(id:string){

const proposal=this.proposals.find(
p=>p.id===id
);

if(proposal){

proposal.status="rejected";

}

}

}

export const proposalManager=
new ProposalManager();
