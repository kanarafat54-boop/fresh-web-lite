export interface Opportunity{

id:string;

title:string;

reason:string;

impact:"low"|"medium"|"high";

ready:boolean;

}

class OpportunityDetector{

private opportunities:Opportunity[]=[];

add(opportunity:Opportunity){

this.opportunities.unshift(opportunity);

}

getAll(){

return this.opportunities;

}

ready(){

return this.opportunities.filter(

o=>o.ready

);

}

}

export const opportunityDetector=
new OpportunityDetector();
