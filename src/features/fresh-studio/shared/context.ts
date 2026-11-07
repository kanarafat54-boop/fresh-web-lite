import type { StudioProject } from "./types.ts";
import type { StudioSectionId } from "./studioNav.ts";
import type { StudioProjectsState } from "../projects/useStudioProjects.ts";
import type { ProjectActions, Notify } from "../projects/useProjectActions.ts";
import type { CardAction } from "../components/ProjectCard.tsx";

export type OpenOptions = { editor?: boolean; panel?: "media" | "text" | "captions" | "smart" | "export" };

/** What every Studio screen needs; passed as one prop so screens stay decoupled from the app shell. */
export type StudioScreenProps = {
  state: StudioProjectsState;
  actions: ProjectActions;
  notify: Notify;
  goto: (section: StudioSectionId) => void;
  /** `editor` opens a video project straight into the editor; `panel` picks the editor panel to show first. */
  openProject: (project: StudioProject, opts?: OpenOptions) => void;
  onCardAction: (action: CardAction, project: StudioProject) => void;
  /** Navigate to another Fresh Web Lite route (e.g. "ai", "creator", "fresh-flow"). */
  navigateRoute: (route: string) => void;
  /** Open the existing on-device video/photo editor. */
  openDeviceEditor: () => void;
};
