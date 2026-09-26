import { FRESH_FLOW_MEDIA_WORLDS, type FreshFlowRouteId } from "../core/freshFlowArchitecture";
import "./FreshFlowSwitch.css";

type Props = {
  open: boolean;
  activeRouteId: FreshFlowRouteId | string;
  onSelect: (routeId: FreshFlowRouteId) => void;
  onClose: () => void;
};

/**
 * Flow Switch — Layer A (Media Director), summoned on demand.
 * Keeps the six media worlds off permanent chrome so the experience stays clean.
 */
export default function FreshFlowSwitch({ open, activeRouteId, onSelect, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fresh-flow-switch-backdrop" role="presentation" onClick={onClose}>
      <div
        className="fresh-flow-switch"
        role="dialog"
        aria-modal="true"
        aria-label="Fresh Flow media worlds"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="fresh-flow-switch-header">
          <div>
            <span className="fresh-flow-switch-eyebrow">Fresh Flow</span>
            <h2>Choose a media world</h2>
            <p>Massive underneath. Minimal on the surface.</p>
          </div>
          <button type="button" className="fresh-flow-switch-close" onClick={onClose} aria-label="Close Flow Switch">
            ×
          </button>
        </header>
        <ul className="fresh-flow-switch-list">
          {FRESH_FLOW_MEDIA_WORLDS.map((world) => {
            const active = world.routeId === activeRouteId;
            return (
              <li key={world.id}>
                <button
                  type="button"
                  className={`fresh-flow-switch-item${active ? " active" : ""}`}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    onSelect(world.routeId);
                    onClose();
                  }}
                >
                  <span className="fresh-flow-switch-icon" aria-hidden="true">
                    {world.icon}
                  </span>
                  <span className="fresh-flow-switch-copy">
                    <strong>{world.label}</strong>
                    <small>{world.description}</small>
                  </span>
                  <span className="fresh-flow-switch-surface">{world.surface.replace(/-/g, " ")}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
