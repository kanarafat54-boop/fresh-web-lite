import { useState } from "react";
import { defaultSettingsFor } from "../shared/projectSettings.ts";
import { describeError } from "./useProjectActions.ts";
import type { StudioScreenProps } from "../shared/context.ts";

export const VIDEO_SHAPES = [
  { aspect: "9:16", label: "Vertical", hint: "Shorts, Reels, TikTok", w: 18, h: 32 },
  { aspect: "16:9", label: "Landscape", hint: "YouTube, presentations", w: 32, h: 18 },
  { aspect: "1:1", label: "Square", hint: "Feed posts", w: 24, h: 24 },
] as const;

/** One-tap start: makes an empty video project with the chosen shape and opens it straight in the editor. */
export default function QuickStart({ state, notify, openProject }: Pick<StudioScreenProps, "state" | "notify" | "openProject">) {
  const [busy, setBusy] = useState<string | null>(null);
  const start = async (aspect: string) => {
    if (!state.service || busy) return;
    setBusy(aspect);
    try {
      const project = await state.service.create({ name: "Untitled video", kind: "video", settings: { ...defaultSettingsFor("video"), aspectRatio: aspect }, startingPoint: "blank" });
      state.applyUpdate(project);
      openProject(project, { editor: true, panel: "media" });
    } catch (error) {
      notify("error", describeError(error));
      setBusy(null);
    }
  };
  return (
    <div className="fs-quick" role="group" aria-label="Make a video">
      {VIDEO_SHAPES.map((s) => (
        <button key={s.aspect} type="button" className="fs-quick-tile" disabled={!state.service || busy !== null} onClick={() => void start(s.aspect)}>
          <span className="fs-quick-shape" aria-hidden="true"><i style={{ width: s.w, height: s.h }} /></span>
          <strong>{busy === s.aspect ? "Opening…" : s.label}</strong>
          <small>{s.aspect} · {s.hint}</small>
        </button>
      ))}
    </div>
  );
}
