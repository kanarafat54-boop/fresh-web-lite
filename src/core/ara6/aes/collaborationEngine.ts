import { agentTeam } from "./agentTeam";

class CollaborationEngine{

  assignMission(missionId:string){

    return agentTeam.getActive().map(agent=>({

      missionId,

      agent:agent.name,

      role:agent.role,

      status:"assigned"

    }));

  }

}

export const collaborationEngine=
new CollaborationEngine();
