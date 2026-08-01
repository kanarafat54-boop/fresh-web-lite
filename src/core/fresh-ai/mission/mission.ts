export type MissionStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export interface Mission {

  id: string;

  title: string;

  description: string;

  goal: string;

  status: MissionStatus;

  objectives: string[];

  createdAt: string;

  updatedAt: string;

}
