import "./WorkspacePage.css";

type Listing = { id: string; title: string; creator: string; price: string; category: string };

const LISTINGS: Listing[] = [
  { id: "l1", title: "Fresh Identity Pack", creator: "@memphis", price: "0 FRESH", category: "identity" },
  { id: "l2", title: "Ara6 Workflow Kit", creator: "@ara6", price: "120 FRESH", category: "automation" },
  { id: "l3", title: "Academy Course: AI Basics", creator: "@academy", price: "45 FRESH", category: "learning" },
  { id: "l4", title: "Creator Theme Pack", creator: "@creator", price: "30 FRESH", category: "design" },
];

export default function MarketplaceWorkspace() {
  return (
    <section className="workspace-page" aria-label="Marketplace workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Discover · Buy · Sell</span>
        <h1>Fresh Marketplace</h1>
        <p>
          Discover and exchange products, kits, and services across the Fresh ecosystem.
          Settlements are routed through the Fresh Treasury ledger.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Featured listings</h2>
        <div className="workspace-grid">
          {LISTINGS.map((l) => (
            <div key={l.id} className="workspace-card">
              <h3>{l.title}</h3>
              <p>by {l.creator}</p>
              <div className="workspace-meta">
                <span className="workspace-pill">{l.price}</span>
                <span className="workspace-badge">{l.category}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
