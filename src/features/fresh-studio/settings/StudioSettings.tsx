import { useState } from "react";
import { CAPABILITY_STATUS_LABELS, STUDIO_CAPABILITIES } from "../shared/studioCapabilities.ts";

export type PerformanceMode = "lite" | "balanced" | "advanced";
const KEY = "fresh.studio.performance-mode.v1";
const MODES: Array<{ id: PerformanceMode; label: string; note: string }> = [
  { id: "lite", label: "Lite", note: "Entry-level devices: compressed previews, less background work." },
  { id: "balanced", label: "Balanced", note: "Standard use: normal preview quality." },
  { id: "advanced", label: "Advanced", note: "High-performance devices: higher-resolution previews." },
];

export function readPerformanceMode(): PerformanceMode {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "lite" || v === "advanced" ? v : "balanced";
  } catch { return "balanced"; }
}

export default function StudioSettings() {
  const [mode, setMode] = useState<PerformanceMode>(readPerformanceMode);
  const choose = (next: PerformanceMode) => {
    setMode(next);
    try { window.localStorage.setItem(KEY, next); } catch { /* storage unavailable: choice lasts for this session */ }
  };

  return (
    <div className="fs-info">
      <header className="fs-section-head"><div><h1>Settings</h1><p className="fs-muted">Switching modes never changes your original media or project quality.</p></div></header>

      <section className="fs-panel" aria-label="Performance mode">
        <h2>Performance mode</h2>
        <fieldset className="fs-radios">
          <legend className="fs-sr">Performance mode</legend>
          {MODES.map((m) => (
            <label key={m.id} className="fs-radio">
              <input type="radio" name="perf" checked={mode === m.id} onChange={() => choose(m.id)} />
              <span><strong>{m.label}</strong><small>{m.note}</small></span>
            </label>
          ))}
        </fieldset>
        <p className="fs-muted">Saved on this device. Editors will read this setting as they are added.</p>
      </section>

      <section className="fs-panel" aria-label="Feature status">
        <h2>What works today</h2>
        <ul className="fs-caps">
          {STUDIO_CAPABILITIES.map((c) => (
            <li key={c.id}>
              <div className="fs-caps-head"><strong>{c.label}</strong><span className={`fs-pill fs-pill-${c.status}`}>{CAPABILITY_STATUS_LABELS[c.status]}</span></div>
              <p className="fs-muted">{c.note}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
