
import type {
 FreshMemory
} from "./types";


class MemoryService {


private memories:FreshMemory[]=[];



add(memory:FreshMemory){

this.memories.push(memory);

}



getAll(userId:string){

return this.memories.filter(
memory =>
memory.userId === userId
);

}



getByType(
userId:string,
type:FreshMemory["type"]
){

return this.memories.filter(
memory =>
memory.userId === userId &&
memory.type === type
);

}



remove(id:string){

this.memories =
this.memories.filter(
memory =>
memory.id !== id
);

}



clear(){

this.memories=[];

}


}


export const memoryService =
new MemoryService();


