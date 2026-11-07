import { CAPABILITY_STATUS_LABELS, capabilityById } from "./studioCapabilities.ts";

type Props = {
  title: string;
  summary: string;
  capabilityIds: string[];
  actions?: Array<{ label: string; onClick: () => void }>;
};

/**
 * Honest placeholder for Studio sections whose backend is not built yet.
 * It states the real status instead of showing controls that do nothing (spec §26.7).
 */
export default function InfoSection({ title, summary, capabilityIds, actions = [] }: Props) {
  const caps = capabilityIds.map(capabilityById).filter((c): c is NonNullable<typeof c> => Boolean(c));
  return (
    <div className="fs-info">
      <header className="fs-section-head"><div><h1>{title}</h1><p className="fs-muted">{summary}</p></div></header>
      <ul className="fs-caps">
        {caps.map((c) => (
          <li key={c.id}>
            <div className="fs-caps-head"><strong>{c.label}</strong><span className={`fs-pill fs-pill-${c.status}`}>{CAPABILITY_STATUS_LABELS[c.status]}</span></div>
            <p className="fs-muted">{c.note}</p>
          </li>
        ))}
      </ul>
      {actions.length > 0 && (
        <div className="fs-actions">{actions.map((a) => <button key={a.label} type="button" className="fs-btn" onClick={a.onClick}>{a.label}</button>)}</div>
      )}
    </div>
  );
}
