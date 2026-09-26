import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  treasuryClient,
  type TreasuryBalance,
  type TreasuryTransactionRow,
} from "../../core/treasury/TreasuryClient";
import {
  PAYMENT_RAIL_FAMILIES,
  methodsForDirection,
  statusLabel,
  type PaymentMethodDef,
  type PaymentRailFamily,
} from "../../core/treasury/paymentRails";
import {
  createRailRequest,
  listMyRailRequests,
  type RailRequestRow,
} from "../../core/treasury/railRequestClient";
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

function parseAmountToMinor(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const minor = (fraction + "00").slice(0, 2);
  const combined = `${whole}${minor}`.replace(/^0+(?=\d)/, "");
  return combined.length > 0 ? combined : "0";
}

export default function WalletDashboard() {
  const [balances, setBalances] = useState<TreasuryBalance[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransactionRow[]>([]);
  const [railRequests, setRailRequests] = useState<RailRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  const [recipientUsername, setRecipientUsername] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [sendDescription, setSendDescription] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const [railTab, setRailTab] = useState<"deposit" | "withdrawal">("deposit");
  const [familyFilter, setFamilyFilter] = useState<PaymentRailFamily | "all">("all");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodDef | null>(null);
  const [railAmount, setRailAmount] = useState("");
  const [railCurrency, setRailCurrency] = useState("KES");
  const [railPhone, setRailPhone] = useState("");
  const [railNote, setRailNote] = useState("");
  const [railBusy, setRailBusy] = useState(false);
  const [railError, setRailError] = useState<string | null>(null);
  const [railSuccess, setRailSuccess] = useState<string | null>(null);

  const filteredMethods = useMemo(() => {
    let list = methodsForDirection(railTab);
    if (familyFilter !== "all") list = list.filter((m) => m.family === familyFilter);
    return list;
  }, [railTab, familyFilter]);

  async function refreshTreasury() {
    const [nextBalances, nextTransactions, nextRails] = await Promise.all([
      treasuryClient.getMyBalances(),
      treasuryClient.getMyTransactions(),
      listMyRailRequests(15).catch(() => [] as RailRequestRow[]),
    ]);
    setBalances(nextBalances);
    setTransactions(nextTransactions);
    setRailRequests(nextRails);
  }

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
        await treasuryClient.ensureUserAccount("FRESH", "fresh-coin", "Fresh Coin");
        if (!cancelled) await refreshTreasury();
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

  useEffect(() => {
    if (selectedMethod?.currencies?.length) {
      setRailCurrency(selectedMethod.currencies[0]);
    }
  }, [selectedMethod]);

  async function sendFreshCoin() {
    setSendError(null);
    setSendSuccess(null);

    const fromAccount = balances.find((b) => b.asset_code === "FRESH");
    if (!fromAccount) {
      setSendError("Your Fresh Coin account isn't ready yet.");
      return;
    }

    const amountMinor = parseAmountToMinor(amountInput);
    if (!amountMinor || BigInt(amountMinor) <= 0n) {
      setSendError("Enter a valid amount, e.g. 5.00");
      return;
    }
    if (!recipientUsername.trim()) {
      setSendError("Enter a recipient's Fresh username.");
      return;
    }

    setSending(true);
    try {
      const recipient = await treasuryClient.resolveRecipient(recipientUsername.trim(), "FRESH");
      const transactionId = await treasuryClient.transferInternal({
        fromAccountId: fromAccount.account_id,
        toAccountId: recipient.accountId,
        amountMinor,
        idempotencyKey: crypto.randomUUID(),
        description: sendDescription.trim() || `Fresh transfer to ${recipient.displayName}`,
      });

      setSendSuccess(`Sent to ${recipient.displayName}. Transaction ${transactionId.slice(0, 8)}…`);
      setRecipientUsername("");
      setAmountInput("");
      setSendDescription("");
      await refreshTreasury();
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setSending(false);
    }
  }

  async function submitRailRequest() {
    setRailError(null);
    setRailSuccess(null);
    if (!selectedMethod) {
      setRailError("Choose a payment or withdrawal method.");
      return;
    }
    const amountMinor = parseAmountToMinor(railAmount);
    if (!amountMinor || BigInt(amountMinor) <= 0n) {
      setRailError("Enter a valid amount, e.g. 100.00");
      return;
    }

    setRailBusy(true);
    try {
      const id = await createRailRequest({
        method: selectedMethod,
        direction: railTab,
        amountMinor,
        currencyCode: railCurrency,
        metadata: {
          phone: railPhone.trim() || undefined,
          note: railNote.trim() || undefined,
          rail_status: selectedMethod.status,
        },
      });
      setRailSuccess(
        selectedMethod.status === "connected"
          ? `${railTab === "deposit" ? "Deposit" : "Withdrawal"} request ${id.slice(0, 8)}… submitted to the settlement rail.`
          : `Request ${id.slice(0, 8)}… recorded. ${selectedMethod.shortLabel} rail is not live yet — no funds moved. Settlement adapters will process when connected.`,
      );
      setRailAmount("");
      setRailNote("");
      await refreshTreasury();
    } catch (error) {
      setRailError(error instanceof Error ? error.message : "Could not create request.");
    } finally {
      setRailBusy(false);
    }
  }

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

      {authenticated && (
        <section className="wallet-card" aria-labelledby="rails-title">
          <span className="wallet-card-label">Payment & withdrawal rails</span>
          <h2 id="rails-title">Add funds / Withdraw — beyond mobile money</h2>
          <p>
            Choose a settlement method. Requests are recorded in Treasury; the ledger is
            credited or debited only after a connected rail confirms settlement.
          </p>

          <div className="wallet-rail-tabs" role="tablist" aria-label="Deposit or withdraw">
            <button
              type="button"
              role="tab"
              aria-selected={railTab === "deposit"}
              className={railTab === "deposit" ? "active" : ""}
              onClick={() => {
                setRailTab("deposit");
                setSelectedMethod(null);
                setRailError(null);
                setRailSuccess(null);
              }}
            >
              Add funds
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={railTab === "withdrawal"}
              className={railTab === "withdrawal" ? "active" : ""}
              onClick={() => {
                setRailTab("withdrawal");
                setSelectedMethod(null);
                setRailError(null);
                setRailSuccess(null);
              }}
            >
              Withdraw
            </button>
          </div>

          <div className="wallet-chip-list wallet-family-filters" role="group" aria-label="Method family">
            <button
              type="button"
              className={familyFilter === "all" ? "wallet-chip active" : "wallet-chip"}
              onClick={() => setFamilyFilter("all")}
            >
              All
            </button>
            {PAYMENT_RAIL_FAMILIES.map((f) => (
              <button
                key={f.id}
                type="button"
                className={familyFilter === f.id ? "wallet-chip active" : "wallet-chip"}
                onClick={() => setFamilyFilter(f.id)}
                title={f.description}
              >
                {f.icon} {f.label}
              </button>
            ))}
          </div>

          <div className="wallet-method-grid">
            {filteredMethods.map((method) => (
              <button
                key={method.id}
                type="button"
                className={`wallet-method-card${selectedMethod?.id === method.id ? " selected" : ""}`}
                onClick={() => {
                  setSelectedMethod(method);
                  setRailError(null);
                  setRailSuccess(null);
                }}
              >
                <span className="wallet-method-icon" aria-hidden>
                  {method.icon}
                </span>
                <strong>{method.shortLabel}</strong>
                <small>{method.label}</small>
                <span className={`wallet-method-status status-${method.status}`}>
                  {statusLabel(method.status)}
                </span>
              </button>
            ))}
          </div>

          {selectedMethod && (
            <div className="wallet-rail-form">
              <p className="wallet-method-desc">{selectedMethod.description}</p>
              <div className="wallet-rail-fields">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Amount, e.g. 100.00"
                  value={railAmount}
                  onChange={(e) => setRailAmount(e.target.value)}
                  disabled={railBusy}
                />
                <select
                  value={railCurrency}
                  onChange={(e) => setRailCurrency(e.target.value)}
                  disabled={railBusy}
                  aria-label="Currency"
                >
                  {selectedMethod.currencies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {selectedMethod.requiredFields.includes("phone") && (
                  <input
                    type="tel"
                    placeholder="Phone (e.g. +254… )"
                    value={railPhone}
                    onChange={(e) => setRailPhone(e.target.value)}
                    disabled={railBusy}
                  />
                )}
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={railNote}
                  onChange={(e) => setRailNote(e.target.value)}
                  disabled={railBusy}
                />
                <button type="button" onClick={() => void submitRailRequest()} disabled={railBusy}>
                  {railBusy
                    ? "Submitting…"
                    : railTab === "deposit"
                      ? "Request deposit"
                      : "Request withdrawal"}
                </button>
              </div>
              {railError && (
                <p role="alert" className="wallet-msg-error">
                  {railError}
                </p>
              )}
              {railSuccess && <p className="wallet-msg-ok">{railSuccess}</p>}
            </div>
          )}

          {railRequests.length > 0 && (
            <div className="wallet-rail-history">
              <h3>Recent rail requests</h3>
              <ul>
                {railRequests.map((r) => (
                  <li key={r.id}>
                    <span>
                      {r.direction} · {r.method_id}
                    </span>
                    <span>
                      {formatMinorUnits(r.amount_minor, r.currency_code)}
                    </span>
                    <span className={`wallet-method-status status-${r.status === "settled" ? "connected" : "pending_integration"}`}>
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {authenticated && (
        <section className="wallet-card" aria-labelledby="send-title">
          <span className="wallet-card-label">Send Fresh Coin</span>
          <h2 id="send-title">Send to another Fresh user</h2>
          <p>Transfers move value between authenticated users' own asset accounts. Nothing is minted.</p>

          <div className="wallet-rail-fields">
            <input
              type="text"
              placeholder="Recipient's Fresh username"
              value={recipientUsername}
              onChange={(e) => setRecipientUsername(e.target.value)}
              disabled={sending}
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Amount, e.g. 5.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={sending}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={sendDescription}
              onChange={(e) => setSendDescription(e.target.value)}
              disabled={sending}
            />
            <button type="button" onClick={() => void sendFreshCoin()} disabled={sending}>
              {sending ? "Sending…" : "Send"}
            </button>
          </div>

          {sendError && (
            <p role="alert" className="wallet-msg-error">
              {sendError}
            </p>
          )}
          {sendSuccess && <p className="wallet-msg-ok">{sendSuccess}</p>}
        </section>
      )}

      {authenticated && (
        <section className="wallet-card" aria-labelledby="history-title">
          <span className="wallet-card-label">Recent activity</span>
          <h2 id="history-title">Transaction history</h2>
          {transactions.length === 0 ? (
            <p>No transactions yet.</p>
          ) : (
            <div className="wallet-tx-list">
              {transactions.map((tx) => (
                <div key={`${tx.transaction_id}-${tx.account_id}`} className="wallet-tx-row">
                  <span
                    style={{
                      color:
                        tx.direction === "debit"
                          ? "var(--fresh-success, #2e9e5b)"
                          : "var(--fresh-danger, #e0554f)",
                    }}
                  >
                    {tx.direction === "debit" ? "+" : "-"}
                    {formatMinorUnits(tx.amount_minor, tx.asset_code)}
                  </span>
                  <span style={{ flex: 1, opacity: 0.8 }}>{tx.description}</span>
                  <span style={{ opacity: 0.6 }}>{new Date(tx.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

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
          <div>
            <b>User</b>
            <span>Authenticated user's asset accounts</span>
          </div>
          <div>
            <b>Platform</b>
            <span>Fresh Web Lite operating revenue</span>
          </div>
          <div>
            <b>Owner</b>
            <span>Privileged owner revenue</span>
          </div>
        </div>
      </section>

      <section className="wallet-card" aria-labelledby="security-title">
        <span className="wallet-card-label">Security boundary</span>
        <h2 id="security-title">Authorization belongs on the trusted side</h2>
        <p>
          Transfers are authorized by server-side policy through Supabase RPCs.
          External payment rails are adapters only; they never invent ledger balances.
        </p>
        <div className="wallet-security-grid">
          <span>Ledger: {errorMessage ? "unavailable" : loading ? "connecting" : "connected"}</span>
          <span>Settlement rails: catalog live · adapters pending</span>
          <span>Custody: not configured</span>
        </div>
      </section>
    </section>
  );
}
