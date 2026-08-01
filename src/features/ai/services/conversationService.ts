export interface ConversationMessage{

  id:number;

  role:"user"|"assistant"|"system";

  text:string;

  timestamp:number;

}

class ConversationService{

  private messages:ConversationMessage[]=[];

  getMessages(){

    return this.messages;

  }

  send(text:string){

    const userMessage:ConversationMessage={

      id:Date.now(),

      role:"user",

      text,

      timestamp:Date.now()

    };

    this.messages.push(userMessage);

    const assistantMessage:ConversationMessage={

      id:Date.now()+1,

      role:"assistant",

      text:"Mission received. Fresh AI is analyzing your request.",

      timestamp:Date.now()

    };

    this.messages.push(assistantMessage);

    return this.messages;

  }

  clear(){

    this.messages=[];

  }

}

export const conversationService=
new ConversationService();
