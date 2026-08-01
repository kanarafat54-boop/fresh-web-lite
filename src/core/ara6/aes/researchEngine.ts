import type { ResearchReport } from "./researchReport";

class ResearchEngine{

private reports:ResearchReport[]=[];

add(report:ResearchReport){

this.reports.unshift(report);

}

getAll(){

return this.reports;

}

search(keyword:string){

return this.reports.filter(

report=>

report.title
.toLowerCase()
.includes(keyword.toLowerCase())

);

}

}

export const researchEngine=
new ResearchEngine();
