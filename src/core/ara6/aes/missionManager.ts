import type { Mission, MissionStatus } from "./mission";

class MissionManager{

  private missions:Mission[]=[];

  create(mission:Mission){

    this.missions.unshift(mission);

  }

  getAll(){

    return this.missions;

  }

  get(id:string){

    return this.missions.find(

      mission=>mission.id===id

    );

  }

  updateStatus(

    id:string,

    status:MissionStatus,

    progress:number

  ){

    const mission=this.get(id);

    if(!mission) return;

    mission.status=status;

    mission.progress=progress;

    mission.updatedAt=new Date().toISOString();

  }

}

export const missionManager=
new MissionManager();
