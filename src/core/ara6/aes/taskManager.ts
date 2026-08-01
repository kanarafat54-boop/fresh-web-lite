import type { EngineeringTask } from "./engineeringTask";

class TaskManager{

  private tasks:EngineeringTask[]=[];

  create(task:EngineeringTask){

    this.tasks.push(task);

  }

  getMissionTasks(

    missionId:string

  ){

    return this.tasks.filter(

      task=>task.missionId===missionId

    );

  }

  complete(id:string){

    const task=this.tasks.find(

      task=>task.id===id

    );

    if(task){

      task.completed=true;

    }

  }

}

export const taskManager=
new TaskManager();
