export interface Risk{

id:string;

title:string;

severity:
|"low"
|"medium"
|"high"
|"critical";

description:string;

}

class RiskAnalyzer{

analyze(){

return[] as Risk[];

}

}

export const riskAnalyzer=
new RiskAnalyzer();
