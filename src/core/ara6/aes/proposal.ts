export interface Proposal{

id:string;

title:string;

description:string;

reason:string;

status:
|"draft"
|"review"
|"approved"
|"rejected"
|"deployed";

createdAt:string;

}
