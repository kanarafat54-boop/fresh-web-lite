import { useRef, useState } from "react";

export type TrueModeIntent = "discover" | "learn" | "research" | "news" | "relax" | "create";

type ContextItem = { label: string; value: string };

const intents: Array<{ id: TrueModeIntent; label: string; description: string }> = [
  { id: "discover", label: "Discover", description: "Find useful unexpected connections." },
  { id: "learn", label: "Learn", description: "Prefer explanation, depth and practice." },
  { id: "research", label: "Research", description: "Prioritize sources, evidence and disagreement." },
  { id: "news", label: "News", description: "Prioritize chronology, provenance and updates." },
  { id: "relax", label: "Relax", description: "Reduce pressure and keep the experience quiet." },
  { id: "create", label: "Create", description: "Turn media into ideas, drafts and actions." },
];

const context: ContextItem[] = [
  { label: "Source", value: "Show the original publisher or creator when available." },
  { label: "Provenance", value: "Preserve the relationship between originals, edits and remixes." },
  { label: "Timeline", value: "Place related information before, during and after the current item." },
  { label: "Uncertainty", value: "Separate confirmed, supported, disputed and unknown claims." },
];

export default function TrueModeHub() {
  const [intent, setIntent] = useState<TrueModeIntent>("discover");
  const [whyOpen, setWhyOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [mysteryOpen, setMysteryOpen] = useState(false);
  const [perspectiveOpen, setPerspectiveOpen] = useState(false);
  const [realityOpen, setRealityOpen] = useState(false);
  const [deepMode, setDeepMode] = useState(false);
  const [quietMode, setQuietMode] = useState(false);
  const [serendipity, setSerendipity] = useState(false);
  const [gesture, setGesture] = useState("Try swiping left or right on the media card.");
  const start = useRef<{ x: number; y: number } | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    start.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!start.current) return;
    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;
    start.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 48) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      setGesture(dx > 0 ? "Right: open creator/context space." : "Left: open related media and evidence.");
    } else {
      setGesture(dy > 0 ? "Down: return to previous media." : "Up: continue to the next media item.");
    }
  }

  return (
    <section className="module" aria-label="Fresh TrueMode">
      <div className="post-header">
        <div>
          <p className="post-username">#TrueMode</p>
          <h2 style={{ margin: "0.2rem 0" }}>Explore the world, don't disappear into the feed.</h2>
        </div>
        <button className={quietMode ? "like-btn liked" : "like-btn"} onClick={() => setQuietMode((v) => !v)}>
          {quietMode ? "Quiet on" : "Quiet mode"}
        </button>
      </div>

      <div className="notes-list" style={{ display: "grid", gap: "0.75rem" }}>
        <article className="post-item" onPointerDown={onPointerDown} onPointerUp={onPointerUp} style={{ touchAction: "pan-y", userSelect: "none" }}>
          <div className="post-header"><strong>Media Interaction Engine</strong><span className="post-username">2D navigation prototype</span></div>
          <p className="post-content">Vertical movement follows the media stream; horizontal movement reveals context, creators, related media and evidence.</p>
          <p className="post-username" aria-live="polite">{gesture}</p>
        </article>

        <article className="post-item">
          <strong>Intent Feed</strong>
          <p className="post-username">Tell Fresh what you are trying to accomplish.</p>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {intents.map((item) => <button key={item.id} className={intent === item.id ? "like-btn liked" : "like-btn"} onClick={() => setIntent(item.id)} title={item.description}>{item.label}</button>)}
          </div>
        </article>

        <article className="post-item">
          <strong>Context Lens</strong>
          <p className="post-username">Make surrounding information visible instead of hiding it behind the algorithm.</p>
          <button className="add-note-btn" onClick={() => setContextOpen((v) => !v)}>{contextOpen ? "Hide context" : "Reveal context"}</button>
          {contextOpen && <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.5rem" }}>{context.map((item) => <div key={item.label}><strong>{item.label}:</strong> {item.value}</div>)}</div>}
        </article>

        <article className="post-item">
          <strong>Why am I seeing this?</strong>
          <p className="post-username">Recommendation transparency belongs to the user, not a black box.</p>
          <button className="add-note-btn" onClick={() => setWhyOpen((v) => !v)}>{whyOpen ? "Hide signals" : "Show signals"}</button>
          {whyOpen && <ul><li>Current intent: <strong>{intent}</strong></li><li>Future recommendations should expose the signals used.</li><li>Users should be able to disable individual personalization signals.</li></ul>}
        </article>

        <article className="post-item">
          <strong>Mystery Mode</strong>
          <p className="post-username">Progressive discovery: clue → context → connection → discovery.</p>
          <button className="add-note-btn" onClick={() => setMysteryOpen((v) => !v)}>{mysteryOpen ? "Close mystery" : "Reveal a connection"}</button>
          {mysteryOpen && <div style={{ marginTop: "0.75rem" }}><p><strong>Clue:</strong> unexpected connections can be more valuable than similarity.</p><p><strong>Connection:</strong> Fresh can connect media to its topic, creator, source, history or related knowledge.</p><p><strong>Rule:</strong> mystery must never mean fabricated facts.</p></div>}
        </article>

        <article className="post-item">
          <strong>Perspective + Reality Check</strong>
          <p className="post-username">Separate perspectives and evidence instead of silently collapsing disagreement.</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className="add-note-btn" onClick={() => setPerspectiveOpen((v) => !v)}>{perspectiveOpen ? "Hide perspectives" : "Other perspectives"}</button>
            <button className="add-note-btn" onClick={() => setRealityOpen((v) => !v)}>{realityOpen ? "Hide check" : "Reality check"}</button>
          </div>
          {perspectiveOpen && <p>Official account · Independent reporting · Witness material · Expert analysis · Community discussion.</p>}
          {realityOpen && <p>Fresh should label information as <strong>confirmed · supported · disputed · unknown</strong> rather than manufacture certainty.</p>}
        </article>

        <article className="post-item">
          <strong>Deep Mode + Serendipity</strong>
          <p className="post-username">Turn one media item into a path through increasing depth or useful distant connections.</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button className={deepMode ? "like-btn liked" : "like-btn"} onClick={() => setDeepMode((v) => !v)}>{deepMode ? "Deep mode on" : "Deep mode"}</button>
            <button className={serendipity ? "like-btn liked" : "like-btn"} onClick={() => setSerendipity((v) => !v)}>{serendipity ? "Serendipity on" : "Unexpected discovery"}</button>
          </div>
          {deepMode && <p>Short → explanation → full video/article → notes → learning path.</p>}
          {serendipity && <p>Controlled discovery: introduce distant but useful connections without pretending they are directly related.</p>}
        </article>
      </div>
    </section>
  );
}
