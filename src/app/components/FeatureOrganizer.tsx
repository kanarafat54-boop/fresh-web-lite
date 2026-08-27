import { useFeaturePreferences } from "../registry/useFeaturePreferences";

type FeatureOrganizerProps = {
  open: boolean;
  onClose: () => void;
};

export default function FeatureOrganizer({ open, onClose }: FeatureOrganizerProps) {
  const { allEntries, toggle, move, resetToDefault } = useFeaturePreferences();
  if (!open) return null;

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div className="comment-panel" style={{ height: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="fresh-command__panel-heading">
          <strong>Organize your Fresh</strong>
          <span>Show, hide and reorder your workspaces</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          {allEntries.map(({ feature, enabled, locked }, index) => (
            <div key={feature.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input type="checkbox" checked={enabled} disabled={locked} onChange={() => toggle(feature.id)} />
                {feature.name}
                {locked ? " (always on)" : ""}
              </label>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => move(feature.id, -1)} disabled={index === 0} aria-label={`Move ${feature.name} up`}>↑</button>
                <button type="button" onClick={() => move(feature.id, 1)} disabled={index === allEntries.length - 1} aria-label={`Move ${feature.name} down`}>↓</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="share-option-btn" onClick={resetToDefault}>Reset to default</button>
        <button type="button" className="share-option-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}
