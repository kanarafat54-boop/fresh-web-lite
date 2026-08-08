import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  treasuryClient,
  type TreasuryBalance,
} from "../../core/treasury/TreasuryClient";
import "./WalletDashboard.css";

const supportedAssetFamilies = ["Fiat", "Fresh Coin", "Crypto", "Token"];

function formatMinorUnits(value: string, assetCode: string): string {
  try {
    const amount = BigInt(value);
    const sign = amount < 0n ? "-" : "";
    const absolute = amount < 0n ? -amount : amount;
    const whole = absolute / 100n;
    const minor = (absolute % 100n).toString().padStart(2, "0");
    return `${sign}${assetCode} ${whole.toString()}.${minor}`;
  } catch {
    return `${assetCode} —`;
  }
}

export default function WalletDashboard() {
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadTreasury() {
      setLoading(true);
      setErrorMessage(null);

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;

      if (sessionError) {
        setErrorMessage(sessionError.message);
        setLoading(false);
        return;
      }

      const session = sessionData.session;
      setAuthenticated(Boolean(session));

      if (!session) {
        setLoading(false);
        return;
      }

      try {
        // Account creation is idempotent and creates only the authenticated
        // user's Fresh Coin asset account. It does not mint or credit funds.
        await treasuryClient.ensureUserAccount("FRESH", "fresh-coin", "Fresh Coin");
        const nextBalances = await treasuryClient.getMyBalances();

        if (!cancelled) setBalances(nextBalances);
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Treasury unavailable");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTreasury();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="wallet-dashboard" aria-labelledby="wallet-title">
      <header className="wallet-hero">
        <div>
          <span className="wallet-eyebrow">Fresh Treasury</span>
          <h1 id="wallet-title">Fresh Wallet</h1>
          <p>
            The wallet reads balances from the authoritative Fresh Treasury ledger.
            No frontend balance is invented or stored locally.
          </p>
        </div>
        <div className="wallet-status" aria-label="Treasury connection status">
          <span className="wallet-status-dot" />
          {loading ? "Connecting to ledger…" : errorMessage ? "Ledger unavailable" : "Ledger connected"}
        </div>
      </header>

      {!authenticated && !loading && (
        <section className="wallet-card" aria-live="polite">
          <span className="wallet-card-label">Authentication required</span>
          <h2>Sign in to access your Treasury</h2>
          <p>Your balances are never loaded for an unauthenticated browser session.</p>
        </section>
      )}

      {errorMessage && (
        <section className="wallet-card" role="alert">
          <span className="wallet-card-label">Treasury error</span>
          <h2>The ledger did not confirm this wallet</h2>
          <p>{errorMessage}</p>
        </section>
      )}

      <div className="wallet-grid">
        <article className="wallet-card wallet-balance-card">
          <span className="wallet-card-label">Authoritative balances</span>
          {loading ? (
            <strong>Loading…</strong>
          ) : balances.length > 0 ? (
            <div className="wallet-balance-list">
              {balances.map((balance) => (
                <div key={balance.account_id}>
                  <strong>{formatMinorUnits(balance.balance_minor, balance.asset_code)}</strong>
                  <span>{balance.display_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <strong>No funded assets</strong>
          )}
          <p>
            Balances are derived from double-entry ledger entries. A frontend action
            cannot create a balance.
          </p>
        </article>

        <article className="wallet-card">
          <span className="wallet-card-label">Asset families</span>
          <div className="wallet-chip-list">
            {supportedAssetFamilies.map((asset) => (
              <span className="wallet-chip" key={asset}>{asset}</span>
            ))}
          </div>
          <p>External assets appear only after a trusted settlement or custody rail records them.</p>
        </article>
      </div>

      <section className="wallet-card wallet-separation" aria-labelledby="separation-title">
        <div>
          <span className="wallet-card-label">Accounting boundary</span>
          <h2 id="separation-title">User funds ≠ platform funds ≠ owner funds</h2>
          <p>
            These are separate Treasury scopes. Revenue allocation is a ledger
            transaction, never a calculation performed by the user's browser.
          </p>
        </div>
        <div className="wallet-buckets">
          <div><b>User</b><span>Authenticated user's asset accounts</span></div>
          <div><b>Platform</b><span>Fresh Web Lite operating revenue</span></div>
          <div><b>Owner</b><span>Privileged owner revenue</span></div>
        </div>
      </section>

      <section className="wallet-card" aria-labelledby="security-title">
        <span className="wallet-card-label">Security boundary</span>
        <h2 id="security-title">Authorization belongs on the trusted side</h2>
        <p>
          Transfers will be authorized by server-side policy. Passwords and passkeys
          can prove control, while device biometrics should be used through platform
          WebAuthn/passkey APIs rather than sending raw biometric data to Fresh.
        </p>
        <div className="wallet-security-grid">
          <span>Ledger: {errorMessage ? "unavailable" : loading ? "connecting" : "connected"}</span>
          <span>Settlement rail: not connected</span>
          <span>Custody: not configured</span>
        </div>
      </section>
    </section>
  );
}
