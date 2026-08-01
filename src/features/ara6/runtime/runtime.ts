export interface RuntimeTask{

  id:string;

  name:string;

  status:
  |"waiting"
  |"running"
  |"completed";

}

class Ara6Runtime{

  private tasks:RuntimeTask[]=[];

  addTask(name:string){

    const task={

      id:crypto.randomUUID(),

      name,

      status:"waiting" as const

    };

    this.tasks.push(task);

    return task;

  }

  start(id:string){

    const task=

    this.tasks.find(

      item=>item.id===id

    );

    if(task){

      task.status="running";

    }

  }

  finish(id:string){

    const task=

    this.tasks.find(

      item=>item.id===id

    );

    if(task){

      task.status="completed";

    }

  }

  getTasks(){

    return this.tasks;

  }

}

export const ara6Runtime=
new Ara6Runtime();
