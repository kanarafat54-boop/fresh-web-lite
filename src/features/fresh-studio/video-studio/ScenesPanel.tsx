import * as T from "./timeline.ts";
import * as F from "./film.ts";
import { Icon } from "./icons.tsx";
import { formatClock } from "./Timeline.tsx";
import { useState } from "react";
import { loadDirectorProduction } from "./directorSource.ts";
import type { Filmstrip } from "./mediaVisuals.ts";
import type { useVideoEditor } from "./useVideoEditor.ts";

type Ed = ReturnType<typeof useVideoEditor>;

/** The frame of a clip's source that best shows where the clip starts. */
function frameOf(doc: T.TimelineDoc, clip: T.TimelineClip, thumbs: Record<string, Filmstrip>): string | null {
  const film = thumbs[clip.assetId];
  if (!film || film.urls.length === 0) return null;
  const length = doc.assets.find((a) => a.id === clip.assetId)?.duration ?? 0;
  const at = length > 0 ? Math.min(1, Math.max(0, clip.sourceIn / length)) : 0;
  return film.urls[Math.round(at * (film.urls.length - 1))] ?? null;
}

/** Every shot as a frame, scene by scene, so the film reads at a glance. Choosing a frame selects its clip and moves the playhead there. */
function Storyboard({ doc, thumbs, onPick }: { doc: T.TimelineDoc; thumbs: Record<string, Filmstrip>; onPick: (clip: T.TimelineClip) => void }) {
  const scenes = doc.film?.scenes ?? [];
  if (!scenes.some((s) => s.shots.length > 0)) return null;
  return (
    <div className="fs-board" role="group" aria-label="Storyboard">
      {scenes.map((s, n) => s.shots.length > 0 && (
        <div key={s.id} className="fs-board-scene">
          <div className="fs-board-title"><strong>{n + 1}. {s.title || "Untitled scene"}</strong>{(s.location || s.timeOfDay) && <span className="fs-muted"> {[s.location, s.timeOfDay].filter(Boolean).join(", ")}</span>}</div>
          <ul className="fs-board-row">
            {s.shots.map((x, i) => {
              const c = F.clipOfShot(doc, x);
              const src = c ? frameOf(doc, c, thumbs) : null;
              const label = `Shot ${i + 1} of scene ${n + 1}: ${x.title || "Untitled shot"}`;
              const inner = (
                <>
                  <span className={`fs-frame${c ? "" : " fs-frame-empty"}`}>{src ? <img src={src} alt="" draggable={false} /> : <span>{c ? "No preview" : x.framing}</span>}</span>
                  <span className="fs-board-cap"><strong>{i + 1}. {x.title || "Untitled shot"}</strong><span className="fs-muted">{x.framing} · {x.movement} · {formatClock(c ? T.clipDuration(c) : x.duration)}</span></span>
                </>
              );
              return <li key={x.id}>{c ? <button type="button" className="fs-board-shot" aria-label={`${label}. Go to its clip`} onClick={() => onPick(c)}>{inner}</button> : <div className="fs-board-shot fs-board-open" aria-label={`${label}. No clip linked yet`}>{inner}</div>}</li>;
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/** Plan a multi-scene film: scenes, shots, link each shot to a clip, then lay the clips out in film order. */
export function ScenesPanel({ ed, clip, ownerId, thumbs, onPick }: { ed: Ed; clip: T.TimelineClip | null; /** Preview frames per source file. */ thumbs: Record<string, Filmstrip>; /** Select a clip and move the playhead to it. */ onPick: (clip: T.TimelineClip) => void; /** Signed-in owner, used to find the Director desk plan saved to the account. */ ownerId: string | null }) {
  const [importNote, setImportNote] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const doc = ed.doc;
  const scenes = doc.film?.scenes ?? [];
  const sum = F.filmSummary(doc);
  const base = T.baseVideoTrack(doc);
  const canLink = !!clip && !!base && clip.trackId === base.id;
  const nameOf = (c: T.TimelineClip) => doc.assets.find((a) => a.id === c.assetId)?.name ?? "Clip";
  const over = sum.linkedSeconds > 300;
  const importFromDirector = async () => {
    setImporting(true); setImportNote(null);
    try {
      const production = await loadDirectorProduction(ownerId);
      if (!production) { setImportNote("No Director plan found yet. Plan scenes in the Director desk first, then come back."); return; }
      if (ed.edit((d) => F.importProduction(d, production))) setImportNote("Imported. The Director scenes were added after yours; undo removes them.");
      else setImportNote(null);
    } finally { setImporting(false); }
  };
  return (
    <div>
      <div className="fs-row">
        <button type="button" className="fs-btn fs-btn-primary" onClick={() => ed.edit((d) => F.addScene(d))}><Icon name="plus" size={18} /> Add scene</button>
        <button type="button" className="fs-btn" disabled={importing} onClick={() => void importFromDirector()}>{importing ? "Looking…" : "Import from Director desk"}</button>
      </div>
      {importNote && <p className="fs-muted" role="status">{importNote}</p>}
      {scenes.length > 0 && (
        <p className="fs-muted" role="status">
          {sum.scenes} {sum.scenes === 1 ? "scene" : "scenes"} · {sum.shots} {sum.shots === 1 ? "shot" : "shots"} · {sum.linked} linked · planned {formatClock(sum.plannedSeconds)} · on the timeline {formatClock(sum.linkedSeconds)}
        </p>
      )}
      <Storyboard doc={doc} thumbs={thumbs} onPick={onPick} />
      {scenes.length === 0 && <p className="fs-muted">Break your film into scenes and shots, link each shot to a clip, then arrange the clips in film order. Add a scene to begin.</p>}
      {scenes.map((s, n) => (
        <section key={s.id} className="fs-scene" aria-label={`Scene ${n + 1}: ${s.title}`}>
          <div className="fs-scene-head">
            <input key={`t:${s.id}:${s.title}`} className="fs-input" aria-label={`Scene ${n + 1} title`} defaultValue={s.title} maxLength={200} onBlur={(e) => { if (e.target.value !== s.title) ed.edit((d) => F.updateScene(d, s.id, { title: e.target.value })); }} />
            <button type="button" className="fs-iconbtn" aria-label={`Move scene ${n + 1} up`} disabled={n === 0} onClick={() => ed.edit((d) => F.moveScene(d, s.id, -1))}><Icon name="up" size={18} /></button>
            <button type="button" className="fs-iconbtn" aria-label={`Move scene ${n + 1} down`} disabled={n === scenes.length - 1} onClick={() => ed.edit((d) => F.moveScene(d, s.id, 1))}><Icon name="down" size={18} /></button>
            <button type="button" className="fs-iconbtn" aria-label={`Delete scene ${n + 1}`} onClick={() => ed.edit((d) => F.removeScene(d, s.id))}><Icon name="trash" size={18} /></button>
          </div>
          <div className="fs-row">
            <label className="fs-field fs-grow">Location<input key={`l:${s.id}:${s.location}`} className="fs-input" defaultValue={s.location} maxLength={200} onBlur={(e) => { if (e.target.value !== s.location) ed.edit((d) => F.updateScene(d, s.id, { location: e.target.value })); }} /></label>
            <label className="fs-field">Time of day
              <select value={s.timeOfDay} onChange={(e) => ed.edit((d) => F.updateScene(d, s.id, { timeOfDay: e.target.value }))}>
                {[...new Set([...F.TIMES_OF_DAY, s.timeOfDay])].map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
          </div>
          <label className="fs-field">What happens<textarea key={`d:${s.id}:${s.description}`} rows={2} defaultValue={s.description} maxLength={2000} onBlur={(e) => { if (e.target.value !== s.description) ed.edit((d) => F.updateScene(d, s.id, { description: e.target.value })); }} /></label>
          <ul className="fs-bin">
            {s.shots.length === 0 && <li className="fs-muted">No shots yet.</li>}
            {s.shots.map((x, i) => {
              const c = F.clipOfShot(doc, x);
              return (
                <li key={x.id} aria-label={`Shot ${i + 1}: ${x.title}`}>
                  <div className="fs-scene-head">
                    <input key={`st:${x.id}:${x.title}`} className="fs-input" aria-label={`Shot ${i + 1} of scene ${n + 1} title`} defaultValue={x.title} maxLength={200} onBlur={(e) => { if (e.target.value !== x.title) ed.edit((d) => F.updateShot(d, x.id, { title: e.target.value })); }} />
                    <button type="button" className="fs-iconbtn" aria-label={`Move shot ${i + 1} of scene ${n + 1} up`} disabled={i === 0} onClick={() => ed.edit((d) => F.moveShot(d, x.id, -1))}><Icon name="up" size={18} /></button>
                    <button type="button" className="fs-iconbtn" aria-label={`Move shot ${i + 1} of scene ${n + 1} down`} disabled={i === s.shots.length - 1} onClick={() => ed.edit((d) => F.moveShot(d, x.id, 1))}><Icon name="down" size={18} /></button>
                    <button type="button" className="fs-iconbtn" aria-label={`Delete shot ${i + 1} of scene ${n + 1}`} onClick={() => ed.edit((d) => F.removeShot(d, x.id))}><Icon name="trash" size={18} /></button>
                  </div>
                  <div className="fs-row">
                    <label className="fs-field">Framing<select value={x.framing} onChange={(e) => ed.edit((d) => F.updateShot(d, x.id, { framing: e.target.value }))}>{[...new Set([...F.FRAMINGS, x.framing])].map((v) => <option key={v}>{v}</option>)}</select></label>
                    <label className="fs-field">Movement<select value={x.movement} onChange={(e) => ed.edit((d) => F.updateShot(d, x.id, { movement: e.target.value }))}>{[...new Set([...F.MOVEMENTS, x.movement])].map((v) => <option key={v}>{v}</option>)}</select></label>
                    <label className="fs-field">Planned seconds<input key={`sd:${x.id}:${x.duration}`} type="number" min={0.5} max={F.MAX_SHOT_SECONDS} step={0.5} defaultValue={x.duration} onBlur={(e) => { const v = Number(e.target.value); if (v !== x.duration) ed.edit((d) => F.updateShot(d, x.id, { duration: v })); }} /></label>
                  </div>
                  <div className="fs-row">
                    {c ? <span className="fs-linked">Clip: {nameOf(c)} · {formatClock(T.clipDuration(c))}</span> : <span className="fs-muted">{x.clipId ? "Its clip was removed." : "No clip linked."}</span>}
                    {c
                      ? <button type="button" className="fs-btn" onClick={() => ed.edit((d) => F.linkShot(d, x.id, null))} aria-label={`Unlink the clip from shot ${i + 1} of scene ${n + 1}`}>Unlink</button>
                      : <button type="button" className="fs-btn" disabled={!canLink} onClick={() => clip && ed.edit((d) => F.linkShot(d, x.id, clip.id))} aria-label={`Link the selected clip to shot ${i + 1} of scene ${n + 1}`}>Link selected clip</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <button type="button" className="fs-btn" onClick={() => ed.edit((d) => F.addShot(d, s.id))} aria-label={`Add a shot to scene ${n + 1}`}><Icon name="plus" size={18} /> Add shot</button>
        </section>
      ))}
      {scenes.length > 0 && (
        <>
          {!canLink && sum.shots > sum.linked && <p className="fs-muted">To link a shot, select a clip on the main video track first.</p>}
          {over && <p className="fs-warn" role="alert">The linked clips run {formatClock(sum.linkedSeconds)}. Exports are limited to {formatClock(300)} for now, so the film cannot be exported as it stands.</p>}
          <button type="button" className="fs-btn fs-btn-primary" disabled={sum.linked === 0} onClick={() => ed.edit((d) => F.sequenceFilm(d))}>Arrange clips in film order</button>
          <p className="fs-muted">Arranging moves the linked clips on the main video track end to end, in scene and shot order. Clips that are not linked follow after them. Other tracks stay where they are.</p>
        </>
      )}
    </div>
  );
}
