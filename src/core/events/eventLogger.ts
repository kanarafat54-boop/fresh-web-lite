import { eventBus } from "./eventBus";

export function startEventLogger(){

  const originalPublish=
    eventBus.publish.bind(eventBus);

  eventBus.publish=(event)=>{

    console.log(

      "[Fresh Event]",

      event.type,

      event

    );

    originalPublish(event);

  };

}
