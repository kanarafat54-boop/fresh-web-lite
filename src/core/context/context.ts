
export interface FreshContext {

 userId:string;


 activeSpace:
 | "social"
 | "ai"
 | "creator"
 | "finance"
 | "learning"
 | "business"
 | "developer"
 | "lifestyle";


 goals:string[];

 interests:string[];

 skills:string[];

 projects:string[];


 device:{
   platform:string;
   type:string;
 };


 timestamp:string;

}

