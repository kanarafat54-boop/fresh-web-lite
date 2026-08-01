export interface Goal{

  id:string;

  title:string;

  description:string;

  progress:number;

  status:"active"|"completed"|"paused";

}

class GoalEngine{

  private goals:Goal[]=[];

  create(

    title:string,

    description:string

  ){

    const goal={

      id:crypto.randomUUID(),

      title,

      description,

      progress:0,

      status:"active" as const

    };

    this.goals.push(goal);

    return goal;

  }

  getGoals(){

    return this.goals;

  }

}

export const goalEngine=
new GoalEngine();
