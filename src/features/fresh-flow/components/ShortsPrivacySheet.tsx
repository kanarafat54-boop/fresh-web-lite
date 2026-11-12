import { useEffect, useRef, useState } from "react";
import { DEFAULT_PRIVACY, MAX_DAILY_LIMIT, MIN_DAILY_LIMIT, normalizeLimit, normalizeTime, parseKeywords, type AudienceChoice, type ShortsPrivacySettings } from "../core/shortsPrivacy";
import { loadPrivacy, loadRestricted, savePrivacy, unrestrictAccount, type RestrictedAccount } from "../core/shortsPrivacyService";
import "./shortsContextPanel.css";

type Props = {
  userId: string;
  onClose: () => void;
  onOpenBlocked: () => void;
  /** Called after settings were saved so the stream can apply Quiet Mode immediately. */
  onSaved?: (settings: ShortsPrivacySettings) => void;
};

const AUDIENCE_LABELS: Record<AudienceChoice, string> = { everyone: "Everyone", following: "Only people I follow", nobody: "Nobody" };

function AudiencePicker({ id, label, value, onChange }: { id: string; label: string; value: AudienceChoice; onChange: (next: AudienceChoice) => void }) {
  return (
    <label className="shorts-privacy-field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as AudienceChoice)}>
        {(Object.keys(AUDIENCE_LABELS) as AudienceChoice[]).map((key) => <option key={key} value={key}>{AUDIENCE_LABELS[key]}</option>)}
      </select>
    </label>
  );
}

/** Spec 10.4 and 10.5: comment controls, who can message, sound reuse, Quiet Mode, restricted and blocked accounts. */
export default function ShortsPrivacySheet({ userId, onClose, onOpenBlocked, onSaved }: Props) {
  const [settings, setSettings] = useState<ShortsPrivacySettings>({ ...DEFAULT_PRIVACY });
  const [keywordText, setKeywordText] = useState("");
  const [limitText, setLimitText] = useState("");
  const [synced, setSynced] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [restricted, setRestricted] = useState<RestrictedAccount[]>([]);
  const [restrictAvailable, setRestrictAvailable] = useState(true);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [privacy, accounts] = await Promise.all([loadPrivacy(userId), loadRestricted(userId)]);
        if (!alive) return;
        setSettings(privacy.settings);
        setKeywordText(privacy.settings.commentKeywords.join(", "));
        setLimitText(privacy.settings.dailyLimitMinutes === null ? "" : String(privacy.settings.dailyLimitMinutes));
        setSynced(privacy.synced);
        setRestricted(accounts.accounts);
        setRestrictAvailable(accounts.available);
        setLoaded(true);
      } catch { if (alive) setError("Fresh could not load your privacy settings. Check your connection and try again."); }
    })();
    return () => { alive = false; };
  }, [userId]);

  function patch(partial: Partial<ShortsPrivacySettings>) { setSettings((current) => ({ ...current, ...partial })); setNote(null); }

  async function save() {
    if (saving) return;
    const limit = limitText.trim() === "" ? null : normalizeLimit(limitText);
    if (limitText.trim() !== "" && limit === null) { setError(`Daily limit must be between ${MIN_DAILY_LIMIT} and ${MAX_DAILY_LIMIT} minutes, or empty for no limit.`); return; }
    if (settings.quietEnabled && (settings.quietFrom === null) !== (settings.quietUntil === null)) { setError("Set both a start and an end time for quiet hours, or neither."); return; }
    setError(null);
    setSaving(true);
    const next = { ...settings, commentKeywords: parseKeywords(keywordText), dailyLimitMinutes: limit };
    try {
      const result = await savePrivacy(userId, next);
      setSettings(next);
      setKeywordText(next.commentKeywords.join(", "));
      setSynced(result.synced);
      setNote(result.synced ? "Saved." : "Saved on this device only. It will sync to your account once Fresh finishes setting this up.");
      onSaved?.(next);
    } catch { setError("Fresh could not save these settings. Try again."); }
    setSaving(false);
  }

  async function unrestrict(account: RestrictedAccount) {
    if (await unrestrictAccount(userId, account.id)) setRestricted((current) => current.filter((item) => item.id !== account.id));
    else setError("Fresh could not remove that restriction. Try again.");
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet shorts-privacy-sheet" role="dialog" aria-modal="true" aria-label="Privacy and safety" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Privacy and safety</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {!loaded && !error ? <p>Loading…</p> : null}
        {loaded ? (
          <div className="shorts-privacy-body">
            {!synced ? <p className="shorts-why-note">These settings are saved on this device only until Fresh finishes setting up your account storage. Comment, message and restrict rules are not enforced for other people until then.</p> : null}

            <h4>Comments</h4>
            <AudiencePicker id="priv-comment" label="Who can comment on my Shorts" value={settings.whoCanComment} onChange={(whoCanComment) => patch({ whoCanComment })} />
            <label className="shorts-privacy-toggle"><input type="checkbox" checked={settings.holdComments} onChange={(event) => patch({ holdComments: event.target.checked })} /> Hold every new comment for my approval</label>
            <label className="shorts-privacy-field" htmlFor="priv-keywords">
              <span>Hold comments that contain these words (comma separated, up to 50)</span>
              <textarea id="priv-keywords" rows={2} value={keywordText} onChange={(event) => { setKeywordText(event.target.value); setNote(null); }} placeholder="spam, giveaway, …" />
            </label>
            <p className="shorts-why-note">Held comments are visible only to the person who wrote them and to you, until you approve or remove them. You can also change comments for a single Short from its menu.</p>

            <h4>Messages</h4>
            <AudiencePicker id="priv-message" label="Who can message me" value={settings.whoCanMessage} onChange={(whoCanMessage) => patch({ whoCanMessage })} />

            <h4>Sounds</h4>
            <label className="shorts-privacy-toggle"><input type="checkbox" checked={settings.soundReuseAllowed} onChange={(event) => patch({ soundReuseAllowed: event.target.checked })} /> Let others use the original sounds from my Shorts (with credit to me)</label>

            <h4>Quiet Mode</h4>
            <label className="shorts-privacy-toggle"><input type="checkbox" checked={settings.quietEnabled} onChange={(event) => patch({ quietEnabled: event.target.checked })} /> Turn on Quiet Mode</label>
            <div className="shorts-privacy-row">
              <label className="shorts-privacy-field" htmlFor="priv-from"><span>Quiet from</span><input id="priv-from" type="time" value={settings.quietFrom ?? ""} onChange={(event) => patch({ quietFrom: normalizeTime(event.target.value) })} /></label>
              <label className="shorts-privacy-field" htmlFor="priv-until"><span>until</span><input id="priv-until" type="time" value={settings.quietUntil ?? ""} onChange={(event) => patch({ quietUntil: normalizeTime(event.target.value) })} /></label>
            </div>
            <label className="shorts-privacy-field" htmlFor="priv-limit">
              <span>Daily watch limit in minutes (empty for none)</span>
              <input id="priv-limit" inputMode="numeric" value={limitText} onChange={(event) => { setLimitText(event.target.value.replace(/[^0-9]/g, "")); setNote(null); }} placeholder="e.g. 45" />
            </label>
            <p className="shorts-why-note">During quiet hours, or after your daily limit, Shorts pauses and shows a break screen. You can choose to continue for 10 more minutes. Counted on this device.</p>

            <div className="shorts-history-confirm">
              <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save settings"}</button>
            </div>
            {note ? <p role="status">{note}</p> : null}

            <h4>Restricted accounts</h4>
            {!restrictAvailable ? <p className="shorts-why-note">Restrict is not available yet.</p> : restricted.length === 0 ? <p>You have not restricted anyone. Restrict from a comment's menu: their comments on your Shorts are held for your approval, and they are not told.</p> : (
              <ul className="shorts-history-list">
                {restricted.map((account) => (
                  <li key={account.id}><div className="shorts-history-row"><div><strong>{account.name}</strong></div><button type="button" className="shorts-history-unblock" onClick={() => void unrestrict(account)}>Remove restriction</button></div></li>
                ))}
              </ul>
            )}

            <h4>Blocked accounts</h4>
            <button type="button" className="shorts-privacy-link" onClick={() => { onClose(); onOpenBlocked(); }}>Manage blocked accounts</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
