import type { Mission } from "./mission";

class MissionManager {

  private missions: Mission[] = [];

  create(mission: Mission) {

    this.missions.push(mission);

    return mission;

  }

  list() {

    return this.missions;

  }

  get(id: string) {

    return this.missions.find(
      mission => mission.id === id
    );

  }

  updateStatus(
    id: string,
    status: Mission["status"]
  ) {

    const mission = this.get(id);

    if (!mission) return;

    mission.status = status;
    mission.updatedAt = new Date().toISOString();

  }

}

export const missionManager =
new MissionManager();
