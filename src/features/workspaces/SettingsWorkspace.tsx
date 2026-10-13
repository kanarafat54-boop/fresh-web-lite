import { useEffect, useState, type FormEvent } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import type { FreshUser } from "../fresh-id/types/user";
import "./SettingsWorkspace.css";

type Theme = "dark" | "light";
type PrivacyPrefs = { discoverable: boolean; personalization: boolean; announcements: boolean };
const defaultPrivacy: PrivacyPrefs = { discoverable: false, personalization: true, announcements: false };
const getPrivacy = (): PrivacyPrefs => {
  try { return { ...defaultPrivacy, ...JSON.parse(window.localStorage.getItem("fresh-privacy-preferences") || "{}") }; }
  catch { return defaultPrivacy; }
};
const prettyDate = (value?: string | null) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
};

export default function SettingsWorkspace() {
  const { setActiveRoute } = useLayout();
  const { user, isAuthenticated, isGuest, loading, error, message, updateUser, logout, requestPasswordReset, passkeySupported, registerPasskey, listPasskeys, removePasskey, session } = useFreshId();
  const [theme, setTheme] = useState<Theme>("dark");
  const [textSize, setTextSize] = useState("normal");
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [privacy, setPrivacy] = useState<PrivacyPrefs>(defaultPrivacy);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [passkeys, setPasskeys] = useState<Array<{ id: string; friendly_name?: string; created_at: string }>>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("fresh-theme");
    const next: Theme = stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    const size = window.localStorage.getItem("fresh-text-size");
    if (size === "large" || size === "larger") setTextSize(size);
    setPrivacy(getPrivacy());
  }, []);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setUsername(user?.username ?? "");
    setLanguage(user?.preferences?.language ?? "en");
    setTimezone(user?.preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setEmailUpdates(user?.preferences?.emailNotifications ?? window.localStorage.getItem("fresh-notifications") !== "off");
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || isGuest) { setPasskeys([]); return; }
    void listPasskeys().then((items) => { if (!cancelled) setPasskeys(items); });
    return () => { cancelled = true; };
  }, [isAuthenticated, isGuest, listPasskeys]);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("fresh-theme", next);
  };
  const changeTextSize = (next: string) => {
    setTextSize(next);
    window.localStorage.setItem("fresh-text-size", next);
    document.documentElement.dataset.textSize = next;
  };
  const changePrivacy = (next: PrivacyPrefs) => {
    setPrivacy(next);
    window.localStorage.setItem("fresh-privacy-preferences", JSON.stringify(next));
    setStatus("Privacy choices saved on this device. Account-wide sync is not enabled for these controls yet.");
  };

  async function persistProfile() {
    if (!user || isGuest) { setStatus("Sign in with a registered Fresh ID to save account changes."); return; }
    if (!fullName.trim() || !username.trim()) { setStatus("Enter both a display name and username."); return; }
    setSaving(true);
    setStatus("");
    const patch: Partial<FreshUser> = {
      fullName: fullName.trim(),
      username: username.trim().replace(/^@/, ""),
      preferences: { ...user.preferences, language, timezone, emailNotifications: emailUpdates },
    };
    try {
      const saved = await updateUser(patch);
      setStatus(saved ? "Your account settings have been saved." : "We couldn't save your changes. Check your connection and permissions, then try again.");
    } catch {
      setStatus("We couldn't save your changes. Check your connection and permissions, then try again.");
    } finally { setSaving(false); }
  }
  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void persistProfile();
  }
  async function addPasskey() {
    setPasskeyBusy(true);
    try { const item = await registerPasskey(); if (item) setPasskeys((current) => [...current, item]); }
    finally { setPasskeyBusy(false); }
  }
  async function deletePasskey(id: string) {
    setPasskeyBusy(true);
    try { await removePasskey(id); setPasskeys(await listPasskeys()); }
    finally { setPasskeyBusy(false); }
  }
  async function sendPasswordReset() {
    if (!user?.email) return;
    await requestPasswordReset(user.email);
    setStatus("If an account exists for this email, a password-reset link will be sent.");
  }
  async function signOut() {
    await logout();
    setActiveRoute("auth-signin");
    window.history.replaceState({ freshRoute: "auth-signin" }, "", "/auth/sign-in");
  }

  const linked = user?.linkedAccounts ?? [];
  const providers = [
    { id: "google", label: "Google", connected: linked.some((a) => a.provider === "google") },
    { id: "apple", label: "Apple", connected: linked.some((a) => a.provider === "apple") },
    { id: "meta", label: "Meta", connected: false },
    { id: "x", label: "X", connected: linked.some((a) => a.provider === "x") },
    { id: "whatsapp", label: "WhatsApp", connected: false },
    { id: "telegram", label: "Telegram", connected: false },
    { id: "tiktok", label: "TikTok", connected: false },
  ];

  return <div className="fresh-settings-page">
    <header className="fresh-settings-header"><div><span className="fresh-settings-eyebrow">FRESH ID · ACCOUNT CONTROL</span><h1>Settings</h1><p>Manage your profile, security, privacy and accessibility in one place.</p></div><button type="button" onClick={() => setActiveRoute("feed")}>Back Home</button></header>
    {(!isAuthenticated || isGuest) && <section className="fresh-settings-notice" role="status"><strong>{isGuest ? "Guest session" : "Sign in to manage your account"}</strong><p>{isGuest ? "Guest changes are temporary and will not update a registered account." : "You can review settings, but profile and security changes require a registered Fresh ID."}</p><button type="button" onClick={() => setActiveRoute("auth-signin")}>Sign in to Fresh ID</button></section>}

    <form className="fresh-settings-card fresh-settings-profile-form" onSubmit={submitProfile}>
      <div className="fresh-settings-section-heading"><div><h2>Personal information</h2><p>Update the basic details attached to your Fresh ID.</p></div><span className={user?.verified ? "fresh-settings-status good" : "fresh-settings-status"}>{user?.verified ? "Email verified" : "Email not verified"}</span></div>
      <div className="fresh-settings-fields">
        <label>Display name<input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} disabled={!user || isGuest} required /></label>
        <label>Username<input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={32} disabled={!user || isGuest} required /><small>Choose a public name; avoid private information.</small></label>
        <label>Email address<input value={user?.email ?? ""} readOnly /><small>Email changes need a separate verification flow.</small></label>
        <label>Language<select value={language} onChange={(e) => setLanguage(e.target.value)}><option value="en">English</option><option value="sw">Kiswahili</option><option value="lg">Luganda</option><option value="fr">Français</option><option value="ar">العربية</option></select></label>
        <label>Time zone<input value={timezone} onChange={(e) => setTimezone(e.target.value)} maxLength={64} /></label>
      </div>
      <button className="fresh-settings-primary" type="submit" disabled={!user || isGuest || saving || loading}>{saving ? "Saving…" : "Save profile changes"}</button>
    </form>

    <section className="fresh-settings-card"><div className="fresh-settings-section-heading"><div><h2>Security and sign-in</h2><p>Review the current session and manage available credentials.</p></div><span className={isAuthenticated && !isGuest ? "fresh-settings-status good" : "fresh-settings-status"}>{session.accessLevel === "authenticated" ? "Signed in" : session.accessLevel === "guest" ? "Guest session" : "Signed out"}</span></div>
      <div className="fresh-settings-security-grid"><div><span>Session expires</span><strong>{prettyDate(session.expiresAt ? new Date(session.expiresAt * 1000).toISOString() : null)}</strong></div><div><span>Last refresh</span><strong>{prettyDate(session.lastRefreshedAt)}</strong></div><div><span>Passkey support</span><strong>{passkeySupported ? "Available on this device" : "Unavailable in this browser"}</strong></div></div>
      <div className="fresh-settings-actions"><button type="button" onClick={() => void sendPasswordReset()} disabled={!user || isGuest}>Send password reset link</button><button type="button" onClick={() => void addPasskey()} disabled={!user || isGuest || !passkeySupported || passkeyBusy}>{passkeyBusy ? "Working…" : "Add a passkey"}</button><button type="button" className="fresh-settings-danger" onClick={() => void signOut()} disabled={!user}>Sign out</button></div>
      <div className="fresh-settings-passkeys"><h3>Registered passkeys</h3>{passkeys.length === 0 ? <p>No passkeys are listed for this account yet.</p> : passkeys.map((item) => <div className="fresh-settings-passkey" key={item.id}><div><strong>{item.friendly_name || "Fresh ID passkey"}</strong><small>Added {prettyDate(item.created_at)}</small></div><button type="button" onClick={() => void deletePasskey(item.id)} disabled={passkeyBusy}>Remove</button></div>)}</div>
      {(error || message || status) && <p className={error ? "fresh-settings-feedback error" : "fresh-settings-feedback"} role="status">{error || status || message}</p>}
    </section>

    <section className="fresh-settings-card"><div><h2>Connected accounts</h2><p>Only verified profile links are marked connected. New provider linking is not yet enabled here.</p></div><div className="fresh-settings-provider-list">{providers.map((p) => <div className="fresh-settings-provider" key={p.id}><span className={"fresh-settings-provider-mark " + p.id}>{p.label.slice(0,1)}</span><strong>{p.label}</strong><span className={p.connected ? "fresh-settings-status good" : "fresh-settings-status"}>{p.connected ? "Connected" : "Not linked"}</span></div>)}</div></section>

    <section className="fresh-settings-card"><div><h2>Appearance and accessibility</h2><p>Make text easier to read and reduce visual strain.</p></div><div className="fresh-settings-choice-row"><button type="button" className={theme === "dark" ? "selected" : ""} onClick={() => changeTheme("dark")} aria-pressed={theme === "dark"}>◐ <span><strong>Dark</strong><small>Low-light appearance</small></span></button><button type="button" className={theme === "light" ? "selected" : ""} onClick={() => changeTheme("light")} aria-pressed={theme === "light"}>☼ <span><strong>Light</strong><small>Bright appearance</small></span></button></div><label className="fresh-settings-inline-field">Text size<select value={textSize} onChange={(e) => changeTextSize(e.target.value)}><option value="normal">Standard</option><option value="large">Large</option><option value="larger">Extra large</option></select></label></section>

    <section className="fresh-settings-card"><div><h2>Notifications</h2><p>Choose whether Fresh sends product updates to your account email.</p></div><button type="button" className={emailUpdates ? "fresh-settings-toggle on" : "fresh-settings-toggle"} aria-pressed={emailUpdates} onClick={() => setEmailUpdates(!emailUpdates)}><span aria-hidden="true" />{emailUpdates ? "Email updates on" : "Email updates off"}</button><button type="button" className="fresh-settings-primary" disabled={!user || isGuest || saving} onClick={() => void persistProfile()}>Save notification preference</button></section>

    <section className="fresh-settings-card"><div><h2>Privacy and data</h2><p>These privacy choices currently apply on this device only. Account-wide sync and data export/deletion need dedicated backend workflows.</p></div>
      <label className="fresh-settings-switch-row"><span><strong>Profile discoverability</strong><small>Allow your profile to be discoverable by other users.</small></span><input type="checkbox" checked={privacy.discoverable} onChange={(e) => changePrivacy({ ...privacy, discoverable: e.target.checked })} /></label>
      <label className="fresh-settings-switch-row"><span><strong>Personalization</strong><small>Save your local personalization preference.</small></span><input type="checkbox" checked={privacy.personalization} onChange={(e) => changePrivacy({ ...privacy, personalization: e.target.checked })} /></label>
      <label className="fresh-settings-switch-row"><span><strong>Product announcements</strong><small>Optional marketing and product news preference.</small></span><input type="checkbox" checked={privacy.announcements} onChange={(e) => changePrivacy({ ...privacy, announcements: e.target.checked })} /></label>
    </section>
    <footer className="fresh-settings-footer"><span>Fresh ID · Account settings</span><button type="button" onClick={() => setActiveRoute("trust")}>Trust and safety</button><button type="button" onClick={() => setActiveRoute("feed")}>Return to Fresh Home</button></footer>
  </div>;
}
