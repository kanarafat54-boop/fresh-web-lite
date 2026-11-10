import { useState } from "react";
import * as T from "./timeline.ts";
import { formatClock } from "./Timeline.tsx";

type EditFn = (fn: (d: T.TimelineDoc) => T.TimelineDoc) => boolean;
const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const SWATCHES = ["#ffffff", "#000000", "#ffd400", "#ff4d4d", "#ff7ab8", "#4dd2ff", "#5dff9a", "#a78bfa"];

function Slider({ label, value, min, max, step, format, onChange, onCommit }: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange?: (v: number) => void; onCommit: (v: number) => void }) {
  const [local, setLocal] = useState<number | null>(null);
  const shown = local ?? value;
  return (
    <label className="fs-slider"><span><span>{label}</span><b className="fs-mono">{format(shown)}</b></span>
      <input type="range" min={min} max={max} step={step} value={shown} aria-label={label}
        onChange={(e) => { setLocal(Number(e.target.value)); onChange?.(Number(e.target.value)); }}
        onPointerUp={() => { if (local !== null) { onCommit(local); setLocal(null); } }}
        onKeyUp={() => { if (local !== null) { onCommit(local); setLocal(null); } }}
        onBlur={() => { if (local !== null) { onCommit(local); setLocal(null); } }} />
    </label>
  );
}

type Section = "speed" | "audio" | "look" | "frame" | "motion" | "transition" | "layer";
export function ClipInspector({ doc, clip, edit, playhead = 0 }: { doc: T.TimelineDoc; clip: T.TimelineClip; edit: EditFn; playhead?: number }) {
  const [section, setSection] = useState<Section>("speed");
  const asset = doc.assets.find((a) => a.id === clip.assetId);
  const track = doc.tracks.find((t) => t.id === clip.trackId);
  const isVideo = track?.kind === "video";
  const look = clip.look ?? T.NEUTRAL_LOOK;
  const dur = T.clipDuration(clip);
  const onLayer = isVideo && T.isLayerTrack(doc, clip.trackId);
  const sections: Array<[Section, string]> = isVideo
    ? [["speed", "Speed"], ["audio", "Audio"], ["look", "Look"], ["frame", "Frame"], ["motion", "Motion"], onLayer ? ["layer", "Layer"] : ["transition", "Transition"]]
    : [["speed", "Speed"], ["audio", "Audio"]];
  const active = sections.some(([id]) => id === section) ? section : "speed";
  const setLook = (l: T.ClipLook | null) => edit((d) => T.setClipLook(d, clip.id, l ?? null));
  return (
    <>
      <h2>Clip</h2>
      <p className="fs-inspector-name">{asset?.name ?? "Clip"}</p>
      <dl className="fs-facts"><div><dt>Starts</dt><dd className="fs-mono">{formatClock(clip.start)}</dd></div><div><dt>Length</dt><dd className="fs-mono">{formatClock(dur)}</dd></div></dl>
      <div className="fs-seg" role="tablist" aria-label="Clip settings">
        {sections.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={active === id} className={active === id ? "is-active" : ""} onClick={() => setSection(id)}>{label}</button>)}
      </div>
      <div className="fs-inspector-body">
        {active === "speed" && (
          <div className="fs-chips" role="group" aria-label="Clip speed">
            {SPEEDS.map((sp) => <button key={sp} type="button" className={`fs-chip${clip.speed === sp ? " is-active" : ""}`} aria-pressed={clip.speed === sp} onClick={() => edit((d) => T.setClipSpeed(d, clip.id, sp))}>{sp}×</button>)}
          </div>
        )}
        {active === "audio" && (
          <>
            <Slider label="Volume" value={clip.volume ?? 1} min={0} max={T.MAX_VOLUME} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => edit((d) => T.setClipAudio(d, clip.id, { volume: v }))} />
            <Slider label={isVideo ? "Fade in" : "Fade in"} value={clip.fadeIn ?? 0} min={0} max={Math.max(0.1, Math.min(5, dur))} step={0.1} format={(v) => `${v.toFixed(1)} s`} onCommit={(v) => edit((d) => T.setClipAudio(d, clip.id, { fadeIn: v }))} />
            <Slider label="Fade out" value={clip.fadeOut ?? 0} min={0} max={Math.max(0.1, Math.min(5, dur))} step={0.1} format={(v) => `${v.toFixed(1)} s`} onCommit={(v) => edit((d) => T.setClipAudio(d, clip.id, { fadeOut: v }))} />
            <p className="fs-muted">{isVideo ? "Fades apply to the picture (from/to black) and the sound. " : "Fades apply to the sound. "}Volume above 100% boosts quiet audio.{asset && !asset.hasAudio ? " This file has no audio." : ""}</p>
          </>
        )}
        {active === "look" && (
          <>
            <div className="fs-chips" role="group" aria-label="Look presets">
              {T.LOOK_PRESETS.map((p) => {
                const on = Math.abs(look.brightness - p.look.brightness) < 1e-6 && Math.abs(look.contrast - p.look.contrast) < 1e-6 && Math.abs(look.saturation - p.look.saturation) < 1e-6;
                return <button key={p.id} type="button" className={`fs-chip${on ? " is-active" : ""}`} aria-pressed={on} onClick={() => setLook(p.id === "none" ? null : p.look)}>{p.name}</button>;
              })}
            </div>
            <Slider label="Brightness" value={look.brightness} min={-0.5} max={0.5} step={0.02} format={(v) => (v > 0 ? "+" : "") + Math.round(v * 100)} onCommit={(v) => setLook({ ...look, brightness: v })} />
            <Slider label="Contrast" value={look.contrast} min={0.5} max={1.8} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => setLook({ ...look, contrast: v })} />
            <Slider label="Saturation" value={look.saturation} min={0} max={2} step={0.02} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => setLook({ ...look, saturation: v })} />
            <p className="fs-muted">The preview is an approximation. The exported video uses exact values.</p>
          </>
        )}
        {active === "motion" && <MotionPanel clip={clip} edit={edit} playhead={playhead} />}
        {active === "layer" && <LayerPanel clip={clip} edit={edit} />}
        {active === "transition" && <TransitionPicker doc={doc} clip={clip} edit={edit} />}
        {active === "frame" && (
          <>
            <div className="fs-chips" role="group" aria-label="Framing">
              {([["fit", "Fit (show everything)"], ["fill", "Fill (crop to cover)"]] as const).map(([id, label]) => <button key={id} type="button" className={`fs-chip${(clip.fit ?? "fit") === id ? " is-active" : ""}`} aria-pressed={(clip.fit ?? "fit") === id} onClick={() => edit((d) => T.setClipFit(d, clip.id, id))}>{label}</button>)}
            </div>
            <p className="fs-muted">Choose the project’s shape from the preview. “Fill” removes black bars by cropping the edges.</p>
          </>
        )}
      </div>
    </>
  );
}

function LayerPanel({ clip, edit }: { clip: T.TimelineClip; edit: EditFn }) {
  const L = clip.layer ?? T.DEFAULT_LAYER;
  const up = (patch: Partial<T.ClipLayer>) => edit((d) => T.setClipLayer(d, clip.id, patch));
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  const corners = [["Top left", 0.25, 0.25], ["Top right", 0.75, 0.25], ["Bottom left", 0.25, 0.75], ["Bottom right", 0.75, 0.75], ["Centre", 0.5, 0.5]] as const;
  return (
    <>
      <div className="fs-chips" role="group" aria-label="Quick position">
        {corners.map(([n, x, y]) => <button key={n} type="button" className="fs-chip" onClick={() => up({ x, y, ...(n === "Centre" ? { width: 1 } : { width: Math.min(L.width, 0.5) }) })}>{n === "Centre" ? "Full frame" : n}</button>)}
      </div>
      <Slider label="Size" value={L.width} min={T.MIN_LAYER_WIDTH} max={1} step={0.01} format={pct} onCommit={(v) => up({ width: v })} />
      <Slider label="Left ↔ right" value={L.x} min={0} max={1} step={0.01} format={pct} onCommit={(v) => up({ x: v })} />
      <Slider label="Top ↔ bottom" value={L.y} min={0} max={1} step={0.01} format={pct} onCommit={(v) => up({ y: v })} />
      <Slider label="Opacity" value={L.opacity} min={0.05} max={1} step={0.05} format={pct} onCommit={(v) => up({ opacity: v })} />
      <p className="fs-muted">This clip plays in a window over the main video. Drag the window in the preview, or the white dot to resize it. Fades make it see-through. Its sound is mixed in with the main video.</p>
    </>
  );
}

function MotionPanel({ clip, edit, playhead }: { clip: T.TimelineClip; edit: EditFn; playhead: number }) {
  const m = clip.motion;
  const same = (a: T.ClipMotion | null, b: T.ClipMotion | null) => (a === null || b === null ? a === b : !a.mid?.length && !b.mid?.length && (["fromZoom", "toZoom", "fromX", "toX", "fromY", "toY"] as const).every((k) => Math.abs(a[k] - b[k]) < 1e-6));
  const set = (patch: Partial<T.ClipMotion>) => edit((d) => T.setClipMotion(d, clip.id, { ...(m ?? T.MOTION_PRESETS[1].motion!), ...patch }));
  const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}%`;
  const noZoom = m && T.motionPoints(m).every((k) => k.zoom === 1);
  const progress = (playhead - clip.start) / Math.max(0.001, T.clipDuration(clip));
  const canKey = progress > 0 && progress < 1;
  const keys = m?.mid ?? [];
  const seconds = (at: number) => `${(at * T.clipDuration(clip)).toFixed(1)} s`;
  return (
    <>
      <div className="fs-chips" role="group" aria-label="Motion presets">
        {T.MOTION_PRESETS.map((p) => <button key={p.id} type="button" className={`fs-chip${same(m ?? null, p.motion) ? " is-active" : ""}`} aria-pressed={same(m ?? null, p.motion)} onClick={() => edit((d) => T.setClipMotion(d, clip.id, p.motion))}>{p.name}</button>)}
      </div>
      {m && (
        <>
          <Slider label="Zoom at start" value={m.fromZoom} min={T.MIN_ZOOM} max={T.MAX_ZOOM} step={0.05} format={(v) => `${v.toFixed(2)}×`} onCommit={(v) => set({ fromZoom: v })} />
          <Slider label="Zoom at end" value={m.toZoom} min={T.MIN_ZOOM} max={T.MAX_ZOOM} step={0.05} format={(v) => `${v.toFixed(2)}×`} onCommit={(v) => set({ toZoom: v })} />
          <Slider label="Left–right at start" value={m.fromX} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => set({ fromX: v })} />
          <Slider label="Left–right at end" value={m.toX} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => set({ toX: v })} />
          <Slider label="Up–down at start" value={m.fromY} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => set({ fromY: v })} />
          <Slider label="Up–down at end" value={m.toY} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => set({ toY: v })} />
          <div className="fs-label">Keyframes</div>
          {keys.length === 0 && <p className="fs-muted">Add a keyframe at the playhead to hold, speed up or change direction part-way through the clip.</p>}
          {keys.map((k, n) => (
            <fieldset key={`${n}-${k.at}`} className="fs-keyframe" aria-label={`Keyframe ${n + 1}`}>
              <legend>Keyframe {n + 1} · {seconds(k.at)}</legend>
              <Slider label="Position in clip" value={k.at} min={T.MIN_KEY_GAP} max={1 - T.MIN_KEY_GAP} step={0.01} format={(v) => seconds(v)} onCommit={(v) => edit((d) => T.updateMotionKey(d, clip.id, n, { at: v }))} />
              <Slider label="Zoom" value={k.zoom} min={T.MIN_ZOOM} max={T.MAX_ZOOM} step={0.05} format={(v) => `${v.toFixed(2)}×`} onCommit={(v) => edit((d) => T.updateMotionKey(d, clip.id, n, { zoom: v }))} />
              <Slider label="Left–right" value={k.x} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => edit((d) => T.updateMotionKey(d, clip.id, n, { x: v }))} />
              <Slider label="Up–down" value={k.y} min={-1} max={1} step={0.05} format={pct} onCommit={(v) => edit((d) => T.updateMotionKey(d, clip.id, n, { y: v }))} />
              <button type="button" className="fs-btn" onClick={() => edit((d) => T.removeMotionKey(d, clip.id, n))}>Remove keyframe {n + 1}</button>
            </fieldset>
          ))}
          <button type="button" className="fs-btn" disabled={!canKey || keys.length >= T.MAX_MID_KEYS} onClick={() => edit((d) => T.addMotionKey(d, clip.id, progress))}>Add keyframe at playhead</button>
          {!canKey && <p className="fs-muted">Move the playhead inside this clip to add a keyframe.</p>}
          {keys.length >= T.MAX_MID_KEYS && <p className="fs-muted">A clip can have up to {T.MAX_MID_KEYS} extra keyframes.</p>}
          {noZoom && <p className="fs-muted" role="status">Moving needs some zoom. At 1× the whole picture is already showing, so there is nothing to move across.</p>}
        </>
      )}
      <p className="fs-muted">The picture moves in straight lines from keyframe to keyframe, from the start settings to the end settings. Splitting a clip keeps the movement smooth across the cut.</p>
    </>
  );
}

function TransitionPicker({ doc, clip, edit }: { doc: T.TimelineDoc; clip: T.TimelineClip; edit: EditFn }) {
  const max = T.maxTransition(doc, clip);
  const cur = clip.transitionIn;
  if (max === null) return <p className="fs-muted">Transitions go between two clips. Place this clip right after another one on the same track, with no gap, to add one.</p>;
  if (max < T.MIN_TRANSITION_SECONDS) return <p className="fs-muted">These clips are too short for a transition.</p>;
  const set = (type: T.TransitionType, duration = cur?.duration ?? Math.min(1, max)) => edit((d) => T.setTransition(d, clip.id, { type, duration }));
  return (
    <>
      <div className="fs-transition-grid" role="group" aria-label="Transition type">
        <button type="button" className={`fs-transition-opt${!cur ? " is-active" : ""}`} aria-pressed={!cur} onClick={() => edit((d) => T.setTransition(d, clip.id, null))}><strong>None</strong><small>Hard cut</small></button>
        {T.TRANSITION_TYPES.map((t) => (
          <button key={t.id} type="button" className={`fs-transition-opt${cur?.type === t.id ? " is-active" : ""}`} aria-pressed={cur?.type === t.id} onClick={() => set(t.id)}><strong>{t.label}</strong><small>{t.hint}</small></button>
        ))}
      </div>
      {cur && <Slider label="Length" value={cur.duration} min={T.MIN_TRANSITION_SECONDS} max={max} step={0.1} format={(v) => `${v.toFixed(1)} s`} onCommit={(v) => set(cur.type, v)} />}
      <p className="fs-muted">The video keeps its total length. Dissolve, wipe and slide reveal this clip over the last frame of the one before; sound softens either side of the cut. The preview shows a simple fade; the export is exact.</p>
    </>
  );
}

export function OverlayInspector({ layer, assetName, edit, duration }: { layer: T.OverlayLayer; assetName: string | null; edit: EditFn; duration: number }) {
  const up = (patch: Partial<Omit<T.OverlayLayer, "id" | "kind" | "assetId">>) => edit((d) => T.updateOverlay(d, layer.id, patch));
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <>
      <h2>{layer.kind === "rect" ? "Rectangle" : "Picture"}</h2>
      <div className="fs-inspector-body">
        {layer.kind === "image" && <p className="fs-muted">{assetName ?? "Picture"}</p>}
        <Slider label="Left ↔ right" value={layer.x} min={0} max={1} step={0.01} format={pct} onCommit={(v) => up({ x: v })} />
        <Slider label="Top ↔ bottom" value={layer.y} min={0} max={1} step={0.01} format={pct} onCommit={(v) => up({ y: v })} />
        <Slider label={layer.kind === "rect" ? "Width" : "Size"} value={layer.width} min={0.02} max={1} step={0.01} format={pct} onCommit={(v) => up({ width: v })} />
        {layer.kind === "rect" && <Slider label="Height" value={layer.height} min={0.02} max={1} step={0.01} format={pct} onCommit={(v) => up({ height: v })} />}
        <Slider label="Opacity" value={layer.opacity} min={0.05} max={1} step={0.05} format={pct} onCommit={(v) => up({ opacity: v })} />
        <Slider label="Rotate" value={layer.rotation ?? 0} min={-T.MAX_ROTATION} max={T.MAX_ROTATION} step={1} format={(v) => `${Math.round(v)}°`} onCommit={(v) => up({ rotation: v })} />
        <Slider label="Shows for" value={layer.duration} min={T.MIN_OVERLAY_SECONDS} max={Math.max(10, Math.ceil(duration))} step={0.1} format={(v) => `${v.toFixed(1)} s`} onCommit={(v) => up({ duration: v })} />
        {layer.kind === "rect" && (
          <>
            <div className="fs-label">Colour</div>
            <div className="fs-swatches" role="group" aria-label="Rectangle colour">
              {SWATCHES.map((c) => <button key={c} type="button" className={`fs-swatch${layer.color.toLowerCase() === c ? " is-active" : ""}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={layer.color.toLowerCase() === c} onClick={() => up({ color: c })} />)}
            </div>
          </>
        )}
        <p className="fs-muted">Drag it in the preview to move it, or the white dot to resize. Drag its block on the timeline to retime it. Overlays sit above the video and below text.</p>
      </div>
    </>
  );
}

type TextSection = "text" | "style" | "place";
export function TextInspector({ layer, edit, duration }: { layer: T.TextLayer; edit: EditFn; duration: number }) {
  const [section, setSection] = useState<TextSection>("text");
  const up = (patch: Partial<Omit<T.TextLayer, "id">>) => edit((d) => T.updateText(d, layer.id, patch));
  return (
    <>
      <h2>Text</h2>
      <div className="fs-seg" role="tablist" aria-label="Text settings">
        {([["text", "Text"], ["style", "Style"], ["place", "Place"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={section === id} className={section === id ? "is-active" : ""} onClick={() => setSection(id)}>{label}</button>)}
      </div>
      <div className="fs-inspector-body">
        {section === "text" && (
          <>
            <textarea className="fs-textarea" rows={3} maxLength={T.MAX_TEXT_CHARS} defaultValue={layer.text} key={layer.id} aria-label="Text content"
              onBlur={(e) => { if (e.target.value !== layer.text) { if (!up({ text: e.target.value })) e.target.value = layer.text; } }} />
            <p className="fs-muted">Up to {T.MAX_TEXT_CHARS} characters. New lines are kept.</p>
          </>
        )}
        {section === "style" && (
          <>
            <Slider label="Size" value={layer.size} min={0.03} max={0.25} step={0.005} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => up({ size: v })} />
            <div className="fs-label">Colour</div>
            <div className="fs-swatches" role="group" aria-label="Text colour">
              {SWATCHES.map((c) => <button key={c} type="button" className={`fs-swatch${layer.color.toLowerCase() === c ? " is-active" : ""}`} style={{ background: c }} aria-label={`Colour ${c}`} aria-pressed={layer.color.toLowerCase() === c} onClick={() => up({ color: c })} />)}
            </div>
            <div className="fs-chips">
              <button type="button" className={`fs-chip${layer.bold ? " is-active" : ""}`} aria-pressed={layer.bold} onClick={() => up({ bold: !layer.bold })}>Bold</button>
              <button type="button" className={`fs-chip${layer.box ? " is-active" : ""}`} aria-pressed={layer.box} onClick={() => up({ box: !layer.box })}>Background</button>
            </div>
            <p className="fs-muted">Exports use the DejaVu Sans font.</p>
          </>
        )}
        {section === "place" && (
          <>
            <Slider label="Left ↔ right" value={layer.x} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => up({ x: v })} />
            <Slider label="Top ↔ bottom" value={layer.y} min={0} max={1} step={0.01} format={(v) => `${Math.round(v * 100)}%`} onCommit={(v) => up({ y: v })} />
            <Slider label="Shows for" value={layer.duration} min={T.MIN_TEXT_SECONDS} max={Math.max(10, Math.ceil(duration))} step={0.1} format={(v) => `${v.toFixed(1)} s`} onCommit={(v) => up({ duration: v })} />
            <div className="fs-chips" role="group" aria-label="Quick position">
              {([["Top", 0.12], ["Middle", 0.5], ["Bottom", 0.86]] as const).map(([n, y]) => <button key={n} type="button" className="fs-chip" onClick={() => up({ x: 0.5, y })}>{n}</button>)}
            </div>
          </>
        )}
      </div>
    </>
  );
}
