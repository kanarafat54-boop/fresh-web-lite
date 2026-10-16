import type { FreshMediaProject } from "../../core/platform/mediaProjectStore";

type MediaKind = "video" | "image" | "audio";

type Props = {
  projects: FreshMediaProject[];
  onChoose: (kind: MediaKind) => void;
  onOpenProject: (project: FreshMediaProject) => void;
  onNewProject: () => void;
};

const choices: { kind: MediaKind; icon: string; title: string; description: string; detail: string }[] = [
  { kind: "video", icon: "▶", title: "Edit a video", description: "Trim, crop, add text and color, then export.", detail: "VIDEO EDITOR" },
  { kind: "image", icon: "▧", title: "Open an image", description: "Preview an image on this device. Editing and generation are not connected yet.", detail: "IMAGE WORKSPACE" },
  { kind: "audio", icon: "♫", title: "Work with audio", description: "Open and listen to an audio file on this device.", detail: "AUDIO WORKSPACE" },
];

export default function StudioStartPanel({ projects, onChoose, onOpenProject, onNewProject }: Props) {
  return (
    <section className="studio-start" aria-labelledby="studio-start-title">
      <div className="studio-start-intro">
        <span className="studio-start-kicker">YOUR CREATIVE SPACE</span>
        <h2 id="studio-start-title">What would you like to make?</h2>
        <p>Start with one clear choice. Your files stay on this device unless you choose a connected service.</p>
      </div>
      <div className="studio-start-grid">
        {choices.map((choice) => (
          <button className="studio-start-card" key={choice.kind} type="button" onClick={() => onChoose(choice.kind)}>
            <span className="studio-start-card-icon" aria-hidden="true">{choice.icon}</span>
            <span className="studio-start-card-detail">{choice.detail}</span>
            <strong>{choice.title}</strong>
            <span className="studio-start-card-description">{choice.description}</span>
            <span className="studio-start-card-action">Choose file <span aria-hidden="true">→</span></span>
          </button>
        ))}
        <article className="studio-start-card studio-start-card-disabled" aria-label="Camera capture not available yet">
          <span className="studio-start-card-icon" aria-hidden="true">◎</span>
          <span className="studio-start-card-detail">IN DEVELOPMENT</span>
          <strong>Camera & capture</strong>
          <span className="studio-start-card-description">Live camera capture and advanced camera controls are not connected yet.</span>
          <span className="studio-start-card-action">Not available yet</span>
        </article>
      </div>
      <div className="studio-start-footer">
        <div>
          <h3>Pick up where you left off</h3>
          <p>Saved projects on this device</p>
        </div>
        <button className="studio-start-new" type="button" onClick={onNewProject}>New blank project</button>
      </div>
      {projects.length > 0 ? (
        <div className="studio-start-projects">
          {projects.slice(0, 4).map((project) => (
            <button key={project.id} type="button" onClick={() => onOpenProject(project)}>
              <strong>{project.title}</strong>
              <span>{project.sourceName ?? "Blank project"} · {project.pipelineStatus}</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="studio-start-empty">Your recent projects will appear here after you save or import media.</p>
      )}
    </section>
  );
}
