import { useMemo } from "react";
import "./WalletDashboard.css";

const supportedAssetFamilies = ["Fiat", "Fresh Coin", "Crypto", "Token"];

export default function WalletDashboard() {
  const status = useMemo(
    () => ({
      ledger: "ready",
      settlement: "not connected",
      custody: "not configured",
    }),
    [],
  );

  return (
    <section className="wallet-dashboard" aria-labelledby="wallet-title">
      <header className="wallet-hero">
        <div>
          <span className="wallet-eyebrow">Fresh Treasury</span>
          <h1 id="wallet-title">Fresh Wallet</h1>
          <p>
            One wallet layer for user assets, platform revenue and owner revenue,
            with accounting kept separate by design.
          </p>
        </div>
        <div className="wallet-status" aria-label="Treasury status">
          <span className="wallet-status-dot" />
          Ledger architecture active
        </div>
      </header>

      <div className="wallet-grid">
        <article className="wallet-card wallet-balance-card">
          <span className="wallet-card-label">Available balance</span>
          <strong>Not yet settled</strong>
          <p>No balance is displayed until a trusted ledger source confirms funds.</p>
        </article>

        <article className="wallet-card">
          <span className="wallet-card-label">Asset families</span>
          <div className="wallet-chip-list">
            {supportedAssetFamilies.map((asset) => (
              <span className="wallet-chip" key={asset}>{asset}</span>
            ))}
          </div>
        </article>
      </div>

      <section className="wallet-card wallet-separation" aria-labelledby="separation-title">
        <div>
          <span className="wallet-card-label">Accounting boundary</span>
          <h2 id="separation-title">User funds ≠ platform funds ≠ owner funds</h2>
          <p>
            Every asset movement will be recorded against explicit accounts. Revenue
            allocation will be a ledger transaction, not a frontend calculation.
          </p>
        </div>
        <div className="wallet-buckets">
          <div><b>User</b><span>Custodied user assets</span></div>
          <div><b>Platform</b><span>Fresh Web Lite operating revenue</span></div>
          <div><b>Owner</b><span>Authorized owner revenue</span></div>
        </div>
      </section>

      <section className="wallet-card" aria-labelledby="security-title">
        <span className="wallet-card-label">Owner security</span>
        <h2 id="security-title">High-value actions require strong authorization</h2>
        <p>
          Passwords, passkeys and device biometrics will authorize transfers through
          a server-side policy engine. The frontend will never be the final authority.
        </p>
        <div className="wallet-security-grid">
          <span>Ledger: {status.ledger}</span>
          <span>Settlement rail: {status.settlement}</span>
          <span>Custody: {status.custody}</span>
        </div>
      </section>
    </section>
  );
}
