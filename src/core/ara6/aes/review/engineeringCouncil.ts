import { reviewManager } from "./reviewManager";

class EngineeringCouncil{

canContinue(
missionId:string
){

return reviewManager.approved(
missionId
);

}

}

export const engineeringCouncil=
new EngineeringCouncil();
