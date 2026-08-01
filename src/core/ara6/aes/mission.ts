export type MissionStatus =
  | "planned"
  | "researching"
  | "designing"
  | "coding"
  | "testing"
  | "review"
  | "approved"
  | "deploying"
  | "completed"
  | "failed";

export interface Mission{

  id:string;

  title:string;

  description:string;

  ecosystem:string;

  status:MissionStatus;

  progress:number;

  createdAt:string;

  updatedAt:string;

}
