export interface EngineeringReview{

id:string;

missionId:string;

agentId:string;

decision:
|"approve"
|"reject"
|"changes";

comments:string;

confidence:number;

createdAt:string;

}
