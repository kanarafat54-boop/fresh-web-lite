import { useLayout } from "../../../../app/contexts/useLayout";

const ACTIONS: Array<{ label: string; route?: string; action?: "search" }> = [
  { label: "🚀 Build App", route: "software" },
  { label: "🤖 Create AI", route: "ai" },
  { label: "📺 Go Live", route: "shorts" },
  { label: "💰 Wallet", route: "wallet" },
  { label: "🛒 Marketplace", route: "marketplace" },
  { label: "📚 Learn", route: "learning" },
  { label: "🎬 Feed", route: "feed" },
  { label: "⚙ Ara6", route: "software" },
  { label: "🔍 Search", action: "search" },
];

export default function QuickActionsCard() {
  const { setActiveRoute, openSearch } = useLayout();

  return (
    <section className="actions-card">
      <h2>Quick Actions</h2>
      <div className="quick-grid">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            onClick={() => (a.action === "search" ? openSearch() : a.route && setActiveRoute(a.route))}
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
