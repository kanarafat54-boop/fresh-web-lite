export interface Improvement{

id:string;

title:string;

description:string;

ecosystem:string;

reason:string;

priority:
|"low"
|"medium"
|"high"
|"critical";

confidence:number;

approved:boolean;

createdAt:string;

}
