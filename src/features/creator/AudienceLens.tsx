import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { parseLens, type Lens } from "../fresh-flow/core/audienceLensLogic.js";

type ShortRow = { id: string; caption: string | null };
type State = { kind: "loading" } | { kind: "none" } | { kind: "unavailable" } | { kind: "error"; message: string } | { kind: "ready"; lens: Lens };

/** Real viewer drop-off for one of the creator's own Shorts. Totals only; never individual viewers. */
export default function AudienceLens() {
  const [shorts, setShorts] = useState<ShortRow[] | null>(null);
  const [shortId, setShortId] = useState("");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return live && (setShorts([]), setState({ kind: "none" }));
      const { data, error } = await supabase.from("shorts").select("id, caption").eq("author_id", uid).order("created_at", { ascending: false }).limit(20);
      if (!live) return;
      if (error) return setState({ kind: "error", message: error.message });
      const rows = (data ?? []) as ShortRow[];
      setShorts(rows);
      if (rows.length) setShortId(rows[0].id);
      else setState({ kind: "none" });
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!shortId) return;
    let live = true;
    setState({ kind: "loading" });
    supabase.rpc("fresh_short_audience_lens", { p_short_id: shortId }).then(({ data, error }) => {
      if (!live) return;
      if (error) {
        const missing = error.code === "PGRST202" || /could not find the function/i.test(error.message);
        return setState(missing ? { kind: "unavailable" } : { kind: "error", message: error.message });
      }
      setState({ kind: "ready", lens: parseLens(data) });
    });
    return () => { live = false; };
  }, [shortId]);

  return (
    <div className="audience-lens">
      {shorts && shorts.length > 0 && (
        <label className="creator-inline-label">
          Short
          <select value={shortId} onChange={(e) => setShortId(e.target.value)}>
            {shorts.map((s) => (
              <option key={s.id} value={s.id}>{(s.caption ?? "").trim().slice(0, 48) || "Untitled Short"}</option>
            ))}
          </select>
        </label>
      )}
      {state.kind === "loading" && <p className="creator-muted">Loading viewing data…</p>}
      {state.kind === "none" && <p className="creator-muted">Post a Short and Audience Lens will show where viewers stay and where they leave.</p>}
      {state.kind === "unavailable" && <p className="creator-muted">Audience Lens is not switched on yet, so Fresh shows no curve rather than an estimate.</p>}
      {state.kind === "error" && <p className="creator-message">Could not load viewing data: {state.message}</p>}
      {state.kind === "ready" && !state.lens.enough && (
        <p className="creator-muted">
          Not enough viewers yet ({state.lens.viewers} of {state.lens.minViewers}). Totals appear once {state.lens.minViewers} people have watched, so no single viewer can be picked out.
        </p>
      )}
      {state.kind === "ready" && state.lens.enough && (
        <>
          <div className="creator-retention" role="img" aria-label="Share of viewers still watching at each point">
            {state.lens.steps.map((s) => (
              <div key={s.key} className="creator-retention-bar" title={`${s.label} · ${s.viewers} viewers · ${s.pct}%`}>
                <div style={{ height: `${Math.max(4, s.pct)}%` }} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <p className="creator-muted">
            {state.lens.biggestDrop
              ? `Most viewers leave between ${state.lens.biggestDrop.from} and ${state.lens.biggestDrop.to} (${state.lens.biggestDrop.lost} of ${state.lens.steps[0].viewers}). Look at what happens in that stretch.`
              : "No clear drop-off point."}{" "}
            Based on {state.lens.viewers} real viewers.
          </p>
        </>
      )}
    </div>
  );
}
