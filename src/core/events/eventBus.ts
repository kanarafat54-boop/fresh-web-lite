import type { FreshEvent } from "./types";

type EventHandler = (event:FreshEvent)=>void;

class EventBus{

  private handlers:Record<string,EventHandler[]>={};

  subscribe(
    eventType:string,
    handler:EventHandler
  ){

    if(!this.handlers[eventType]){

      this.handlers[eventType]=[];

    }

    this.handlers[eventType].push(handler);

  }

  publish(event:FreshEvent){

    const listeners=
      this.handlers[event.type]||[];

    listeners.forEach(handler=>handler(event));

  }

}

export const eventBus=
new EventBus();
