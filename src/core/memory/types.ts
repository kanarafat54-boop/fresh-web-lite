
export type MemoryType =
 | "goal"
 | "skill"
 | "project"
 | "interest"
 | "achievement"
 | "experience";


export interface FreshMemory {

 id:string;

 userId:string;

 type:MemoryType;

 title:string;

 description:string;


 metadata?:Record<string, any>;


 createdAt:string;

 updatedAt:string;

}


