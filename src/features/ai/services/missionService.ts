export interface Mission{

  id:string;

  title:string;

  status:"pending"|"running"|"completed";

  progress:number;

}

class MissionService{

  private missions:Mission[]=[];

  create(title:string){

    const mission:Mission={

      id:crypto.randomUUID(),

      title,

      status:"pending",

      progress:0

    };

    this.missions.push(mission);

    return mission;

  }

  getAll(){

    return this.missions;

  }

}

export const missionService=
new MissionService();
