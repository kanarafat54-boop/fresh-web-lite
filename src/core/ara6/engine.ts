import type { AraTask } from "./task";

class Ara6Engine {

  private tasks: AraTask[] = [];

  create(task: AraTask) {
    this.tasks.push(task);
  }

  start(id: string) {
    const task = this.tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "running";
    task.updatedAt = new Date().toISOString();
  }

  complete(id: string) {
    const task = this.tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "completed";
    task.updatedAt = new Date().toISOString();
  }

  fail(id: string) {
    const task = this.tasks.find(t => t.id === id);

    if (!task) return;

    task.status = "failed";
    task.updatedAt = new Date().toISOString();
  }

  list() {
    return this.tasks;
  }

}

export const ara6Engine = new Ara6Engine();
