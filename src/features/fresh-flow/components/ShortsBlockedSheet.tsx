import { useEffect, useRef, useState } from "react";
import { BLOCK_EFFECTS, type BlockedAccount } from "../core/userBlocks";
import { blockAccount, loadBlockedAccounts, unblockAccount } from "../core/userBlocksService";
import "./shortsContextPanel.css";

type Props = {
  userId: string;
  /** When set, the sheet first asks the viewer to confirm blocking this account. */
  target?: { id: string; name: string } | null;
  onClose: () => void;
  /** Called with an account id after it was blocked (true) or unblocked (false). */
  onChanged?: (accountId: string, blocked: boolean) => void;
};

/** Confirm a block, and manage blocked accounts. */
export default function ShortsBlockedSheet({ userId, target = null, onClose, onChanged }: Props) {
  const [accounts, setAccounts] = useState<BlockedAccount[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(Boolean(target));
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function refresh() {
    try {
      const result = await loadBlockedAccounts(userId);
      setAccounts(result.accounts);
      setAvailable(result.available);
    } catch { setError("Fresh could not load your blocked accounts. Check your connection and try again."); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);

  async function confirmBlock() {
    if (!target || busy) return;
    setBusy(true);
    setNote(null);
    const outcome = await blockAccount(userId, target.id);
    setBusy(false);
    if (outcome === "blocked") { setConfirming(false); setNote(`${target.name} is blocked.`); onChanged?.(target.id, true); await refresh(); }
    else if (outcome === "unavailable") setNote("Blocking is not available yet. It will work once Fresh finishes setting it up.");
    else setNote("Fresh could not block this account. Try again.");
  }

  async function unblock(account: BlockedAccount) {
    setNote(null);
    if (await unblockAccount(userId, account.id)) {
      setAccounts((current) => (current ?? []).filter((item) => item.id !== account.id));
      onChanged?.(account.id, false);
    } else setNote("Fresh could not unblock this account. Try again.");
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Blocked accounts" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>{confirming && target ? `Block ${target.name}?` : "Blocked accounts"}</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {confirming && target ? (
          <div>
            <ul className="shorts-why-list">{BLOCK_EFFECTS.map((effect) => <li key={effect}>{effect}</li>)}</ul>
            <div className="shorts-history-confirm">
              <button type="button" disabled={busy} onClick={() => void confirmBlock()}>{busy ? "Blocking…" : "Block"}</button>
              <button type="button" onClick={() => setConfirming(false)}>Cancel</button>
            </div>
          </div>
        ) : null}
        {note ? <p role="status">{note}</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {!available ? <p className="shorts-why-note">Blocking is not available yet.</p> : null}
        {available && accounts === null && !error ? <p>Loading…</p> : null}
        {available && accounts && accounts.length === 0 && !confirming ? <p>You have not blocked anyone.</p> : null}
        {accounts && accounts.length > 0 ? (
          <ul className="shorts-history-list">
            {accounts.map((account) => (
              <li key={account.id}>
                <div className="shorts-history-row">
                  <div><strong>{account.name}</strong><span>Blocked {new Date(account.blockedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span></div>
                  <button type="button" className="shorts-history-unblock" onClick={() => void unblock(account)}>Unblock</button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
