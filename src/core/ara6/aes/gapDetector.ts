export interface Gap{

id:string;

title:string;

description:string;

priority:"low"|"medium"|"high"|"critical";

ecosystem:string;

}

class GapDetector{

private gaps:Gap[]=[];

report(gap:Gap){

this.gaps.unshift(gap);

}

getAll(){

return this.gaps;

}

getByPriority(priority:Gap["priority"]){

return this.gaps.filter(

gap=>gap.priority===priority

);

}

clear(){

this.gaps=[];

}

}

export const gapDetector=
new GapDetector();
