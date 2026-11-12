// Reads the newest saved Director desk production, so its scenes can be imported into a film plan.
// Account copy first (when signed in), then the copy kept on this device. Returns null when there is none.
import { directorContent, findDirectorProject } from "../../fresh-flow/core/studioProjects.ts";

/** The Director desk keeps its on-device copy under this key (see FreshStudioProductionDesk). */
export const DIRECTOR_DEVICE_KEY = "fresh.studio.production-desk.v1";

export async function loadDirectorProduction(ownerId: string | null): Promise<unknown | null> {
  if (ownerId) {
    try {
      const found = await findDirectorProject(ownerId);
      const content = found ? directorContent(found) : null;
      if (content) return content;
    } catch { /* offline or not allowed: fall back to this device */ }
  }
  try {
    const raw = localStorage.getItem(DIRECTOR_DEVICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
