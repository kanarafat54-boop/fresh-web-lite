import type { ReactNode } from "react";
import "./ShortsStateScreen.css";

/**
 * Full-screen system states for Fresh Shorts (specification Part 12): loading, offline, empty feed,
 * failed load and unavailable content. Each state says what happened and offers the next real action.
 */
export type ShortsStateKind = "loading" | "offline" | "empty" | "error" | "unavailable";

type Action = { label: string; onClick: () => void };

const icon = (children: ReactNode) => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {children}
  </svg>
);

const GLYPHS: Record<Exclude<ShortsStateKind, "loading">, ReactNode> = {
  offline: icon(<><path d="M2 9.5a15 15 0 0 1 20 0M5 13a10.5 10.5 0 0 1 14 0M8.5 16.5a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="20" r="1" fill="currentColor" /><path d="m4 4 16 16" /></>),
  empty: icon(<><rect x="6" y="3" width="12" height="18" rx="3" /><path d="m10.5 9.5 4 2.5-4 2.5v-5Z" fill="currentColor" /></>),
  error: icon(<><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5M12 16.5v.01" /></>),
  unavailable: icon(<><rect x="6" y="3" width="12" height="18" rx="3" /><path d="m4 4 16 16" /></>),
};

export function ShortsStateScreen({ kind, title, message, primary, secondary }: {
  kind: ShortsStateKind;
  title: string;
  message?: string;
  primary?: Action;
  secondary?: Action;
}) {
  if (kind === "loading") {
    return (
      <div className="fresh-shorts-state" role="status" aria-live="polite" aria-label={title}>
        <div className="fresh-shorts-skeleton" aria-hidden="true">
          <span className="fresh-shorts-skeleton-rail" />
          <span className="fresh-shorts-skeleton-line wide" />
          <span className="fresh-shorts-skeleton-line" />
        </div>
        <p className="fresh-shorts-state-title">{title}</p>
      </div>
    );
  }
  return (
    <div className="fresh-shorts-state" role={kind === "error" || kind === "offline" ? "alert" : "status"} data-state={kind}>
      <div className="fresh-shorts-state-glyph">{GLYPHS[kind]}</div>
      <p className="fresh-shorts-state-title">{title}</p>
      {message ? <p className="fresh-shorts-state-message">{message}</p> : null}
      {primary ? <button type="button" className="fresh-shorts-state-primary" onClick={primary.onClick}>{primary.label}</button> : null}
      {secondary ? <button type="button" className="fresh-shorts-state-secondary" onClick={secondary.onClick}>{secondary.label}</button> : null}
    </div>
  );
}
