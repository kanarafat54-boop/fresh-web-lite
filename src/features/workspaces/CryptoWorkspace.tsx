import { useMemo, useState } from "react";
import { selectPaymentRoutes, type FreshRouteContext } from "../../features/crypto/freshCryptoRouter";
import type { FreshAsset, FreshPaymentRoute } from "../../features/crypto/freshCryptoTypes";
import "./WorkspacePage.css";

const ASSETS: FreshAsset[] = [
  { code: "FRESH", kind: "fresh-coin", name: "Fresh Coin", decimals: 2 },
  { code: "USDC", kind: "token", name: "USD Coin", decimals: 6 },
  { code: "BTC", kind: "crypto", name: "Bitcoin", decimals: 8 },
  { code: "USD", kind: "fiat", name: "US Dollar", decimals: 2 },
];

const RAILS: FreshPaymentRoute[] = [
  { rail: "fresh_internal", assetCode: "FRESH", estimatedFeeMinor: 0n, estimatedSettlementSeconds: 1, available: true },
  { rail: "fresh_internal", assetCode: "USDC", estimatedFeeMinor: 0n, estimatedSettlementSeconds: 1, available: true },
  { rail: "bank", assetCode: "USD", estimatedFeeMinor: 150n, estimatedSettlementSeconds: 172800, available: true },
  { rail: "crypto", assetCode: "BTC", estimatedFeeMinor: 800n, estimatedSettlementSeconds: 600, available: true },
  { rail: "stablecoin", assetCode: "USDC", estimatedFeeMinor: 5n, estimatedSettlementSeconds: 30, available: false },
];

function formatFee(route: FreshPaymentRoute, asset: FreshAsset): string {
  if (route.estimatedFeeMinor == null) return "—";
  const whole = Number(route.estimatedFeeMinor) / 10 ** asset.decimals;
  return `${whole} ${asset.code}`;
}

export default function CryptoWorkspace() {
  const [assetCode, setAssetCode] = useState("FRESH");
  const [destinationType, setDestinationType] = useState<FreshRouteContext["destinationType"]>("fresh_user");
  const [amount, setAmount] = useState("1000");

  const asset = ASSETS.find((a) => a.code === assetCode)!;
  const requestedAmountMinor = useMemo(() => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 0) return 0n;
    return BigInt(Math.round(value * 10 ** asset.decimals));
  }, [amount, asset.decimals]);

  const context: FreshRouteContext = { asset, availableRails: RAILS, requestedAmountMinor, destinationType };
  const routes = selectPaymentRoutes(context);

  return (
    <section className="workspace-page" aria-label="Crypto workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Assets · Payments · Routing</span>
        <h1>Fresh Crypto</h1>
        <p>
          Explore supported assets and let Fresh route your payment across the cheapest, fastest
          available rails. Routes come from the Fresh payment router — no balance is invented.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Supported assets</h2>
        <div className="workspace-grid">
          {ASSETS.map((a) => (
            <button
              key={a.code}
              className={`workspace-card ${a.code === assetCode ? "workspace-pill" : ""}`}
              onClick={() => setAssetCode(a.code)}
            >
              <h3>{a.name}</h3>
              <p>{a.code} · {a.kind}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <h2>Payment router</h2>
        <div className="workspace-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Amount ({asset.code})
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "8px 10px", marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            Destination
            <select
              value={destinationType}
              onChange={(e) => setDestinationType(e.target.value as FreshRouteContext["destinationType"])}
              style={{ width: "100%", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "8px 10px", marginTop: 4 }}
            >
              <option value="fresh_user">Fresh user</option>
              <option value="bank">Bank</option>
              <option value="mobile_money">Mobile money</option>
              <option value="card">Card</option>
              <option value="external_crypto">External crypto</option>
            </select>
          </label>
        </div>

        <h2 style={{ marginTop: 8 }}>Available routes</h2>
        {routes.length === 0 ? (
          <p className="workspace-empty">No available routes for this asset and destination.</p>
        ) : (
          <ul className="workspace-list">
            {routes.map((r, i) => (
              <li key={`${r.rail}-${i}`}>
                <h3>{r.rail}</h3>
                <p>Fee: {formatFee(r, asset)} · settles in ~{r.estimatedSettlementSeconds ?? "—"}s</p>
                <div className="workspace-meta">
                  <span className="workspace-pill">{r.assetCode}</span>
                  <span className="workspace-badge">{r.available ? "available" : "unavailable"}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
