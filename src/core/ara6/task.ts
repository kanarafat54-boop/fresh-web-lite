export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export interface AraTask {
  id: string;
  title: string;
  description: string;
  ecosystem: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}
