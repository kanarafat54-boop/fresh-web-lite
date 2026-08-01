export interface SystemComponent{

  id:string;

  name:string;

  type:
    |"service"
    |"agent"
    |"ecosystem"
    |"api"
    |"database"
    |"runtime";

  version:string;

  status:
    |"starting"
    |"healthy"
    |"warning"
    |"error"
    |"offline";

  description:string;

  createdAt:string;

  updatedAt:string;

}
