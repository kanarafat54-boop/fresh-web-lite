import { useEffect, useMemo, useState } from "react";
import "./FreshStudioProductionDesk.css";
import { fetchBlenderRenderOutput, getBlenderRenderJob, submitBlenderRenderJob } from "../../core/platform/blenderRenderWorker";

type Shot = { id: string; title: string; framing: string; movement: string; duration: number; notes: string };
type Scene = { id: string; title: string; location: string; timeOfDay: string; description: string; shots: Shot[] };
type Production = {
  version: 1;
  title: string;
  genre: string;
  format: string;
  logline: string;
  world: string;
  visualStyle: string;
  characters: string;
  scenes: Scene[];
  updatedAt: string;
};

const KEY = "fresh.studio.production-desk.v1";
const makeId = () => globalThis.crypto?.randomUUID?.() ?? `scene-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const blankProduction = (): Production => ({
  version: 1, title: "Untitled production", genre: "Fantasy", format: "Feature film",
  logline: "", world: "", visualStyle: "Cinematic realism", characters: "", scenes: [], updatedAt: new Date().toISOString(),
});
function loadProduction(): Production {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankProduction();
    const parsed = JSON.parse(raw) as Production;
    if (parsed?.version !== 1 || !Array.isArray(parsed.scenes)) return blankProduction();
    return { ...blankProduction(), ...parsed };
  } catch { return blankProduction(); }
}

export default function FreshStudioProductionDesk({ onBack }: { onBack: () => void }) {
  const [production, setProduction] = useState<Production>(loadProduction);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [sceneDraft, setSceneDraft] = useState({ title: "", location: "", description: "" });
  const [renderState, setRenderState] = useState<"idle" | "submitting" | "queued" | "running" | "ready" | "failed">("idle");
  const [renderMessage, setRenderMessage] = useState("");
  const [renderPreviewUrl, setRenderPreviewUrl] = useState<string | null>(null);
  const selectedScene = useMemo(
    () => production.scenes.find((scene) => scene.id === selectedSceneId) ?? production.scenes[0] ?? null,
    [production.scenes, selectedSceneId],
  );

  useEffect(() => {
    setSaveState("saving");
    try {
      const next = { ...production, updatedAt: new Date().toISOString() };
      localStorage.setItem(KEY, JSON.stringify(next));
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }, [production]);

  const update = (patch: Partial<Production>) => setProduction((current) => ({ ...current, ...patch }));
  const addScene = () => {
    const scene: Scene = {
      id: makeId(), title: sceneDraft.title.trim() || `Scene ${production.scenes.length + 1}`,
      location: sceneDraft.location.trim() || "Unspecified location", timeOfDay: "Day",
      description: sceneDraft.description.trim(), shots: [],
    };
    setProduction((current) => ({ ...current, scenes: [...current.scenes, scene] }));
    setSelectedSceneId(scene.id);
    setSceneDraft({ title: "", location: "", description: "" });
  };
  const updateScene = (patch: Partial<Scene>) => {
    if (!selectedScene) return;
    setProduction((current) => ({
      ...current,
      scenes: current.scenes.map((scene) => scene.id === selectedScene.id ? { ...scene, ...patch } : scene),
    }));
  };
  const addShot = () => {
    if (!selectedScene) return;
    const shot: Shot = {
      id: makeId(), title: `Shot ${selectedScene.shots.length + 1}`, framing: "Medium",
      movement: "Static", duration: 5, notes: "",
    };
    updateScene({ shots: [...selectedScene.shots, shot] });
  };
  const updateShot = (id: string, patch: Partial<Shot>) => {
    if (!selectedScene) return;
    updateScene({ shots: selectedScene.shots.map((shot) => shot.id === id ? { ...shot, ...patch } : shot) });
  };
  const removeScene = (id: string) => {
    setProduction((current) => ({ ...current, scenes: current.scenes.filter((scene) => scene.id !== id) }));
    if (selectedSceneId === id) setSelectedSceneId(null);
  };
  useEffect(() => () => { if (renderPreviewUrl) URL.revokeObjectURL(renderPreviewUrl); }, [renderPreviewUrl]);

  const renderFantasyPreview = async () => {
    setRenderState("submitting");
    setRenderMessage("Submitting a real Blender render job…");
    try {
      const accepted = await submitBlenderRenderJob({
        title: selectedScene?.title || production.title,
        width: 960,
        height: 540,
        objects: [
          { name: "Portal ring", type: "torus", position: { x: 0, y: 0, z: 1.3 }, scale: { x: 1.5, y: 1.5, z: 1.5 }, rotation: { x: 1.5708, y: 0, z: 0 }, color: "#8b5cf6" },
          { name: "Portal core", type: "sphere", position: { x: 0, y: 0, z: 1.3 }, scale: { x: 0.62, y: 0.18, z: 0.62 }, color: "#38bdf8" },
          { name: "Left obelisk", type: "cone", position: { x: -2.4, y: 0, z: 0 }, scale: { x: 0.55, y: 0.55, z: 2.2 }, color: "#64748b" },
          { name: "Right obelisk", type: "cone", position: { x: 2.4, y: 0, z: 0 }, scale: { x: 0.55, y: 0.55, z: 2.2 }, color: "#64748b" },
          { name: "Ground", type: "plane", position: { x: 0, y: 0, z: -1.15 }, scale: { x: 5, y: 5, z: 1 }, color: "#172033" },
        ],
      });
      setRenderState("queued");
      setRenderMessage("Blender accepted the job. Waiting for the render worker…");
      for (let attempt = 0; attempt < 100; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500));
        const job = await getBlenderRenderJob(accepted.jobId);
        if (job.status === "failed") throw new Error(job.error || "Blender render failed.");
        if (job.status === "running") setRenderState("running");
        if (job.status === "succeeded") {
          const blob = await fetchBlenderRenderOutput(accepted.jobId);
          const nextUrl = URL.createObjectURL(blob);
          setRenderPreviewUrl(nextUrl);
          setRenderState("ready");
          setRenderMessage("Rendered by the Blender worker. This is a real PNG artifact.");
          return;
        }
      }
      throw new Error("The Blender render is taking longer than expected. Check the worker status before retrying.");
    } catch (error) {
      setRenderState("failed");
      setRenderMessage(error instanceof Error ? error.message : "Unable to render this scene.");
    }
  };

  const exportPlan = () => {
    const lines = [
      `# ${production.title}`, `Genre: ${production.genre}`, `Format: ${production.format}`,
      `Logline: ${production.logline}`, `World: ${production.world}`,
      `Visual style: ${production.visualStyle}`, `Characters: ${production.characters}`, "",
      ...production.scenes.flatMap((scene, index) => [
        `## Scene ${index + 1}: ${scene.title}`, `Location: ${scene.location} · ${scene.timeOfDay}`,
        scene.description, ...scene.shots.map((shot, shotIndex) =>
          `- Shot ${shotIndex + 1}: ${shot.title} | ${shot.framing} | ${shot.movement} | ${shot.duration}s | ${shot.notes}`),
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${production.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "fresh-production"}-plan.md`;
    anchor.click(); URL.revokeObjectURL(url);
  };

  return (
    <section className="fresh-production-desk" aria-label="Fresh Director production desk">
      <header className="fpd-header">
        <div><span className="fpd-kicker">FRESH STUDIO · PRE-PRODUCTION</span><h2>Fresh Director</h2><p>Turn an idea into a structured production plan, scene by scene and shot by shot.</p></div>
        <div className="fpd-header-actions"><span className={`fpd-save-state is-${saveState}`}>{saveState === "saved" ? "Saved on this device" : saveState === "saving" ? "Saving…" : "Storage unavailable"}</span><button type="button" onClick={onBack}>Back to Studio</button><button type="button" className="fpd-primary" onClick={exportPlan}>Export production plan</button></div>
      </header>
      <div className="fpd-layout">
        <aside className="fpd-sidebar">
          <div className="fpd-section-title"><strong>Production</strong><span>01</span></div>
          <label>Project title<input value={production.title} onChange={(event) => update({ title: event.target.value })} /></label>
          <label>Genre<select value={production.genre} onChange={(event) => update({ genre: event.target.value })}>{["Fantasy","Science fiction","Action","Drama","Documentary","Horror","Animation","Adventure","Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Format<select value={production.format} onChange={(event) => update({ format: event.target.value })}>{["Feature film","Short film","Series episode","Documentary","Music video","Game cinematic","Commercial","Other"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Story logline<textarea rows={3} value={production.logline} onChange={(event) => update({ logline: event.target.value })} placeholder="A one or two sentence summary of the story…" /></label>
          <label>World & locations<textarea rows={3} value={production.world} onChange={(event) => update({ world: event.target.value })} placeholder="Describe the world, rules, locations and atmosphere…" /></label>
          <label>Visual direction<select value={production.visualStyle} onChange={(event) => update({ visualStyle: event.target.value })}>{["Cinematic realism","Epic fantasy","Dark fantasy","Stylized animation","Documentary naturalism","Graphic / comic","Experimental"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Characters & creatures<textarea rows={4} value={production.characters} onChange={(event) => update({ characters: event.target.value })} placeholder="Names, motivations, appearance, abilities and continuity…" /></label>
        </aside>
        <main className="fpd-main">
          <section className="fpd-panel">
            <div className="fpd-panel-heading"><div><span className="fpd-kicker">STORY BREAKDOWN</span><h3>Scenes & sequences</h3></div><span>{production.scenes.length} scenes</span></div>
            <div className="fpd-scene-list">
              {production.scenes.map((scene, index) => <button type="button" key={scene.id} className={selectedScene?.id === scene.id ? "is-selected" : ""} onClick={() => setSelectedSceneId(scene.id)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{scene.title}</strong><small>{scene.location} · {scene.shots.length} shots</small></button>)}
              {!production.scenes.length && <p className="fpd-empty">Your scene list is empty. Add the opening scene to begin planning.</p>}
            </div>
            <div className="fpd-add-scene">
              <input aria-label="New scene title" placeholder="Scene title" value={sceneDraft.title} onChange={(event) => setSceneDraft((current) => ({ ...current, title: event.target.value }))} />
              <input aria-label="New scene location" placeholder="Location" value={sceneDraft.location} onChange={(event) => setSceneDraft((current) => ({ ...current, location: event.target.value }))} />
              <input aria-label="Scene description" placeholder="What happens in this scene?" value={sceneDraft.description} onChange={(event) => setSceneDraft((current) => ({ ...current, description: event.target.value }))} />
              <button type="button" className="fpd-primary" onClick={addScene}>+ Add scene</button>
            </div>
          </section>
          {selectedScene && <section className="fpd-panel">
            <div className="fpd-panel-heading"><div><span className="fpd-kicker">SCENE BREAKDOWN</span><h3>{selectedScene.title}</h3></div><button type="button" className="fpd-danger" onClick={() => removeScene(selectedScene.id)}>Delete scene</button></div>
            <div className="fpd-scene-fields">
              <label>Scene title<input value={selectedScene.title} onChange={(event) => updateScene({ title: event.target.value })} /></label>
              <label>Location<input value={selectedScene.location} onChange={(event) => updateScene({ location: event.target.value })} /></label>
              <label>Time<select value={selectedScene.timeOfDay} onChange={(event) => updateScene({ timeOfDay: event.target.value })}>{["Dawn","Day","Sunset","Night","Interior"].map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="fpd-wide-field">Scene action & continuity<textarea rows={3} value={selectedScene.description} onChange={(event) => updateScene({ description: event.target.value })} placeholder="Action, dialogue beats, character positions, props and continuity…" /></label>
            <div className="fpd-panel-heading fpd-shots-heading"><div><span className="fpd-kicker">CAMERA PLAN</span><h3>Shot list</h3></div><button type="button" className="fpd-primary" onClick={addShot}>+ Add shot</button></div>
            {selectedScene.shots.map((shot, index) => <div className="fpd-shot-row" key={shot.id}>
              <span className="fpd-shot-number">{String(index + 1).padStart(2, "0")}</span>
              <label>Shot name<input value={shot.title} onChange={(event) => updateShot(shot.id, { title: event.target.value })} /></label>
              <label>Framing<select value={shot.framing} onChange={(event) => updateShot(shot.id, { framing: event.target.value })}>{["Extreme wide","Wide","Medium","Close-up","Extreme close-up","Over shoulder","POV","Aerial"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Camera movement<select value={shot.movement} onChange={(event) => updateShot(shot.id, { movement: event.target.value })}>{["Static","Pan","Tilt","Dolly","Slow push-in","Pull-out","Tracking","Crane","Handheld","Orbit"].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label>Seconds<input type="number" min={1} max={600} value={shot.duration} onChange={(event) => updateShot(shot.id, { duration: Math.max(1, Math.min(600, Number(event.target.value) || 1)) })} /></label>
              <label className="fpd-shot-notes">Direction / notes<input value={shot.notes} onChange={(event) => updateShot(shot.id, { notes: event.target.value })} /></label>
            </div>)}
            {!selectedScene.shots.length && <p className="fpd-empty">No shots yet. Add a shot to define framing, camera movement and duration.</p>}
          </section>}
          <section className="fpd-panel fpd-render-panel">
            <div className="fpd-panel-heading"><div><span className="fpd-kicker">3D WORLD & VFX FOUNDATION</span><h3>Blender scene renderer</h3></div><span>CPU render</span></div>
            <p className="fpd-render-description">Submit a bounded fantasy portal scene to the separate Blender worker. The worker builds geometry, materials, camera and lighting, then returns a validated PNG render.</p>
            <button type="button" className="fpd-primary" onClick={renderFantasyPreview} disabled={["submitting","queued","running"].includes(renderState)}>{renderState === "submitting" ? "Submitting…" : renderState === "queued" || renderState === "running" ? "Rendering…" : "Render fantasy scene"}</button>
            {renderMessage && <p className={`fpd-render-status is-${renderState}`} role="status">{renderMessage}</p>}
            {renderPreviewUrl && <img className="fpd-render-preview" src={renderPreviewUrl} alt="Rendered fantasy portal scene from the Blender worker" />}
            <small className="fpd-render-footnote">Requires the Fresh Blender worker to be deployed and its server-only URL and token configured. If it is not configured, the API returns a clear setup-required response.</small>
          </section>
          <div className="fpd-capability-note"><strong>Production truth:</strong> Director plans save locally and export as Markdown. The Blender worker is a separate CPU-render service; 3D previews are available only when that service is deployed and connected. This does not claim that full animation, simulation or VFX compositing is complete.</div>
        </main>
      </div>
    </section>
  );
}
