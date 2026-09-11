import type { ProfileInsights } from "../../services/profileInsightsService";

export function ProfileInsightsStrip({ insights }: { insights: ProfileInsights | null | undefined }) {
  if (insights === undefined) return <div className="empty-state" aria-live="polite">Loading profile insights…</div>;
  if (!insights) return null;

  return (
    <section aria-label="Fresh profile insights" style={{ marginTop: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
        {insights.items.map((item) => (
          <div key={item.label} style={{ border: "1px solid var(--border-color, #ddd)", borderRadius: 14, padding: 12 }}>
            <strong style={{ display: "block", fontSize: 18 }}>{item.value}</strong>
            <span style={{ display: "block", fontSize: 12, opacity: 0.75 }}>{item.label}</span>
            <small style={{ display: "block", marginTop: 5, opacity: 0.65 }}>{item.reason}</small>
          </div>
        ))}
      </div>
      <p className="empty-state" style={{ marginTop: 8 }}>{insights.summary}</p>
    </section>
  );
}
