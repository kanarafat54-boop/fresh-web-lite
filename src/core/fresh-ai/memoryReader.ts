import { memoryService } from "../memory/memoryService";

class MemoryReader {

  read(userId: string) {
    return memoryService.getAll(userId);
  }

  goals(userId: string) {
    return memoryService.getByType(
      userId,
      "goal"
    );
  }

  projects(userId: string) {
    return memoryService.getByType(
      userId,
      "project"
    );
  }

  skills(userId: string) {
    return memoryService.getByType(
      userId,
      "skill"
    );
  }

}

export const memoryReader =
new MemoryReader();
