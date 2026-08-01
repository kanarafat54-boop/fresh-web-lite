import { ara6Engine } from "./engine";
import type { AraTask } from "./task";

export interface Workflow {

  id: string;

  name: string;

  description: string;

  tasks: AraTask[];

  status:
    | "pending"
    | "running"
    | "completed"
    | "failed";

  createdAt: string;

}

class Ara6Orchestrator {

  private workflows: Workflow[] = [];

  createWorkflow(workflow: Workflow) {

    this.workflows.push(workflow);

    workflow.tasks.forEach(task => {
      ara6Engine.create(task);
    });

    return workflow;

  }

  startWorkflow(id: string) {

    const workflow =
      this.workflows.find(w => w.id === id);

    if (!workflow) return;

    workflow.status = "running";

    workflow.tasks.forEach(task => {

      ara6Engine.start(task.id);

    });

  }

  completeWorkflow(id: string) {

    const workflow =
      this.workflows.find(w => w.id === id);

    if (!workflow) return;

    workflow.status = "completed";

    workflow.tasks.forEach(task => {

      ara6Engine.complete(task.id);

    });

  }

  listWorkflows() {

    return this.workflows;

  }

}

export const ara6Orchestrator =
new Ara6Orchestrator();

