import { useEffect, useState, type FormEvent } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { supabase } from "../../lib/supabase";
import type { FreshUser } from "../fresh-id/types/user";
import DeviceSecurityPanel from "./DeviceSecurityPanel";
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
  const [experienceMode, setExperienceMode] = useState<"simple" | "standard" | "advanced">("simple");
  const [workspaceMode, setWorkspaceMode] = useState<"personal" | "creator" | "business" | "developer" | "organization">("personal");
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
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [freshAccounts, setFreshAccounts] = useState<Array<{ id: string; account_type: string; display_name: string; slug: string | null; status: string }>>([]);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<"creator" | "business" | "developer" | "organization">("creator");
  const [accountBusy, setAccountBusy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("fresh_theme") ?? window.localStorage.getItem("fresh-theme");
    const next: Theme = stored === "light" || stored === "dark" ? stored : window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    const size = window.localStorage.getItem("fresh-text-size");
    if (size === "large" || size === "larger") setTextSize(size);
    setPrivacy(getPrivacy());
    const savedMode = window.localStorage.getItem("fresh-experience-mode");
    if (savedMode === "simple" || savedMode === "standard" || savedMode === "advanced") setExperienceMode(savedMode);
  }, []);

  useEffect(() => {
    setFullName(user?.fullName ?? "");
    setUsername(user?.username ?? "");
    setLanguage(user?.preferences?.language ?? "en");
    setTimezone(user?.preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
    setEmailUpdates(user?.preferences?.emailNotifications ?? window.localStorage.getItem("fresh-notifications") !== "off");
    if (user?.preferences?.theme === "light" || user?.preferences?.theme === "dark") {
      setTheme(user.preferences.theme);
      document.documentElement.dataset.theme = user.preferences.theme;
    }
    if (user?.preferences?.preferredWorkspaceMode) {
      setWorkspaceMode(user.preferences.preferredWorkspaceMode);
    }
    if (user?.preferences?.experienceMode) {
      setExperienceMode(user.preferences.experienceMode);
    }
    if (user?.preferences?.textSize) {
      setTextSize(user.preferences.textSize);
      document.documentElement.dataset.textSize = user.preferences.textSize;
    }
    // A registered account without saved privacy preferences starts from safe defaults.
    // Device-local choices are used only for signed-out/guest sessions so one account's
    // local choices are not accidentally presented as another account's saved settings.
    setPrivacy(user?.preferences?.privacy
      ? { ...defaultPrivacy, ...user.preferences.privacy }
      : isAuthenticated && !isGuest
        ? defaultPrivacy
        : getPrivacy());
  }, [user, isAuthenticated, isGuest]);

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || isGuest) { setFreshAccounts([]); return; }
    void supabase.from("fresh_id_accounts").select("id,account_type,display_name,slug,status").order("created_at", { ascending: false })
      .then(({ data, error: accountError }) => {
        if (cancelled) return;
        if (accountError) {
          setStatus(accountError.code === "42P01" || accountError.code === "PGRST205"
            ? "Workspace accounts are not available in this deployment yet. The database migration must be deployed first."
            : "Fresh ID couldn't load your workspaces. Check your connection and account permissions.");
          return;
        }
        setFreshAccounts((data ?? []) as typeof freshAccounts);
      });
    return () => { cancelled = true; };
  }, [isAuthenticated, isGuest]);

  async function createWorkspaceAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isGuest) { setStatus("Sign in with a registered Fresh ID before creating a workspace."); return; }
    if (!accountName.trim()) { setStatus("Enter a name for this workspace."); return; }
    setAccountBusy(true);
    setStatus("");
    try {
      const { data, error: rpcError } = await supabase.rpc("create_fresh_id_account", {
        p_account_type: accountType, p_display_name: accountName.trim(), p_slug: null,
      });
      if (rpcError) {
        setStatus(rpcError.code === "PGRST202" || rpcError.code === "42883"
          ? "Workspace creation is not enabled on this deployment yet. Apply the Fresh ID account migration, then retry."
          : "Fresh ID couldn't create this workspace. Check the name and your account permissions, then try again.");
        return;
      }
      if (!data) { setStatus("Fresh ID did not return a workspace ID. Please refresh and try again."); return; }
      const { data: rows, error: listError } = await supabase.from("fresh_id_accounts")
        .select("id,account_type,display_name,slug,status").order("created_at", { ascending: false });
      if (listError) {
        setStatus("Workspace was created, but the list could not refresh. Reload settings to see it.");
        return;
      }
      setFreshAccounts((rows ?? []) as typeof freshAccounts);
      setAccountName("");
      setStatus("Workspace created. You are its owner; membership and access remain enforced by Fresh ID.");
    } catch {
      setStatus("Fresh ID couldn't reach the workspace service. Check your connection and try again.");
    } finally { setAccountBusy(false); }
  }

  useEffect(() => {
    let cancelled = false;
    if (!isAuthenticated || isGuest) { setPasskeys([]); return; }
    void listPasskeys().then((items) => { if (!cancelled) setPasskeys(items); });
    return () => { cancelled = true; };
  }, [isAuthenticated, isGuest, listPasskeys]);

  async function persistPreferenceSettings(patch: Partial<FreshUser["preferences"]>) {
    if (!user || isGuest) {
      setStatus("This choice is saved on this device only. Sign in with Fresh ID to sync it across devices.");
      return;
    }
    try {
      const saved = await updateUser({ preferences: { ...user.preferences, ...patch } });
      setStatus(saved
        ? "Your preference has been saved to your Fresh ID."
        : "This preference could not be synced to your account. Your current device choice remains active.");
    } catch {
      setStatus("This preference could not be synced to your account. Your current device choice remains active.");
    }
  }

  const changeWorkspaceMode = (next: "personal" | "creator" | "business" | "developer" | "organization") => {
    setWorkspaceMode(next);
    void persistPreferenceSettings({ preferredWorkspaceMode: next });
  };

  const changeExperienceMode = (next: "simple" | "standard" | "advanced") => {
    setExperienceMode(next);
    window.localStorage.setItem("fresh-experience-mode", next);
    void persistPreferenceSettings({ experienceMode: next });
  };

  const changeTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("fresh-theme", next);
    window.localStorage.setItem("fresh_theme", next);
    void persistPreferenceSettings({ theme: next });
  };
  const changeTextSize = (next: string) => {
    const normalized = next === "large" || next === "larger" ? next : "normal";
    setTextSize(normalized);
    window.localStorage.setItem("fresh-text-size", normalized);
    document.documentElement.dataset.textSize = normalized;
    void persistPreferenceSettings({ textSize: normalized });
  };
  const changePrivacy = (next: PrivacyPrefs) => {
    setPrivacy(next);
    window.localStorage.setItem("fresh-privacy-preferences", JSON.stringify(next));
    void persistPreferenceSettings({ privacy: next });
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
  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user?.email || isGuest) {
      setStatus("Sign in with a registered Fresh ID before changing your password.");
      return;
    }
    if (newPassword.length < 12) {
      setStatus("Use at least 12 characters for your new password.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setStatus("The new passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setStatus("Choose a new password different from your current password.");
      return;
    }

    setPasswordBusy(true);
    setStatus("");
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        setStatus("Your current password could not be verified. Check it and try again.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setStatus("Fresh ID could not update your password. Please try again or use the password-reset email.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setStatus("Your password has been changed successfully.");
    } catch {
      setStatus("Fresh ID could not reach the password service. Check your connection and try again.");
    } finally {
      setPasswordBusy(false);
    }
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
      <form className="fresh-settings-password-form" onSubmit={(event) => void changePassword(event)}>
        <h3>Change password</h3>
        <p>Verify your current password before choosing a new one. Use at least 12 characters.</p>
        <label>Current password<input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
        <label>New password<input type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={12} required /></label>
        <label>Confirm new password<input type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} minLength={12} required /></label>
        <button className="fresh-settings-primary" type="submit" disabled={!user || isGuest || passwordBusy}>{passwordBusy ? "Updating password…" : "Change password"}</button>
      </form>
      {(error || message || status) && <p className={error ? "fresh-settings-feedback error" : "fresh-settings-feedback"} role="status">{error || status || message}</p>}
    </section>

    {isAuthenticated && !isGuest && user?.id && <DeviceSecurityPanel userId={user.id} onSignOut={signOut} />}

    <section className="fresh-settings-card"><div><h2>Connected accounts</h2><p>Only verified profile links are marked connected. New provider linking is not yet enabled here.</p></div><div className="fresh-settings-provider-list">{providers.map((p) => <div className="fresh-settings-provider" key={p.id}><span className={"fresh-settings-provider-mark " + p.id}>{p.label.slice(0,1)}</span><strong>{p.label}</strong><span className={p.connected ? "fresh-settings-status good" : "fresh-settings-status"}>{p.connected ? "Connected" : "Not linked"}</span></div>)}</div></section>

    <section className="fresh-settings-card"><div><h2>Preferred workspace mode</h2><p>Choose which Fresh experience you prefer. This changes a saved preference only; it does not create a business or organization account or grant permissions.</p></div><label className="fresh-settings-inline-field">Workspace mode<select value={workspaceMode} onChange={(e) => changeWorkspaceMode(e.target.value as typeof workspaceMode)}><option value="personal">Personal — everyday Fresh use</option><option value="creator">Creator — creator tools</option><option value="business">Business — business tools</option><option value="developer">Developer — developer tools</option><option value="organization">Organization — team tools</option></select></label><p className="fresh-settings-help">Separate workspaces and membership are managed independently by Fresh ID. Security roles and access are enforced by server-side policies.</p></section>

    <section className="fresh-settings-card fresh-settings-workspaces"><div><h2>Your Fresh ID workspaces</h2><p>Create a real creator, business, developer, or organization workspace. Creation runs through an authenticated RPC; choosing a preferred mode above does not create one.</p></div>
      {isAuthenticated && !isGuest && <form className="fresh-settings-workspace-form" onSubmit={(event) => void createWorkspaceAccount(event)}>
        <label>Workspace name<input value={accountName} onChange={(event) => setAccountName(event.target.value)} maxLength={80} required placeholder="e.g. Arafat Digital Services" /></label>
        <label>Workspace type<select value={accountType} onChange={(event) => setAccountType(event.target.value as typeof accountType)}><option value="creator">Creator</option><option value="business">Business</option><option value="developer">Developer</option><option value="organization">Organization</option></select></label>
        <button className="fresh-settings-primary" type="submit" disabled={accountBusy || loading}>{accountBusy ? "Creating workspace…" : "Create workspace"}</button>
      </form>}
      {(!isAuthenticated || isGuest) && <p className="fresh-settings-help">Sign in with Fresh ID to create and manage workspace accounts.</p>}
      {freshAccounts.length > 0 ? <div className="fresh-settings-account-list">{freshAccounts.map((account) => <article className="fresh-settings-account-item" key={account.id}><div><strong>{account.display_name}</strong><small>{account.account_type} workspace{account.slug ? " · " + account.slug : ""}</small></div><span className="fresh-settings-status good">{account.status}</span></article>)}</div> : isAuthenticated && !isGuest ? <p className="fresh-settings-help">No workspaces found yet. Create one above to establish its owner membership.</p> : null}
    </section>

    <section className="fresh-settings-card"><div><h2>How Fresh works for you</h2><p>Choose how much detail you want to see. You can change this at any time, and your other settings stay the same.</p></div><div className="fresh-settings-choice-row" role="group" aria-label="Experience level"><button type="button" className={experienceMode === "simple" ? "selected" : ""} onClick={() => changeExperienceMode("simple")} aria-pressed={experienceMode === "simple"}><span><strong>Simple</strong><small>Fewer choices and clearer steps</small></span></button><button type="button" className={experienceMode === "standard" ? "selected" : ""} onClick={() => changeExperienceMode("standard")} aria-pressed={experienceMode === "standard"}><span><strong>Standard</strong><small>More tools on your home screen</small></span></button><button type="button" className={experienceMode === "advanced" ? "selected" : ""} onClick={() => changeExperienceMode("advanced")} aria-pressed={experienceMode === "advanced"}><span><strong>Advanced</strong><small>More of the available controls</small></span></button></div><p className="fresh-settings-help">Simple mode does not remove your account or data. Use “Show more features” on Home whenever you need extra tools.</p></section>

    <section className="fresh-settings-card"><div><h2>Appearance and accessibility</h2><p>Make text easier to read and reduce visual strain.</p></div><div className="fresh-settings-choice-row"><button type="button" className={theme === "dark" ? "selected" : ""} onClick={() => changeTheme("dark")} aria-pressed={theme === "dark"}>◐ <span><strong>Dark</strong><small>Low-light appearance</small></span></button><button type="button" className={theme === "light" ? "selected" : ""} onClick={() => changeTheme("light")} aria-pressed={theme === "light"}>☼ <span><strong>Light</strong><small>Bright appearance</small></span></button></div><label className="fresh-settings-inline-field">Text size<select value={textSize} onChange={(e) => changeTextSize(e.target.value)}><option value="normal">Standard</option><option value="large">Large</option><option value="larger">Extra large</option></select></label></section>

    <section className="fresh-settings-card"><div><h2>Notifications</h2><p>Choose whether Fresh sends product updates to your account email.</p></div><button type="button" className={emailUpdates ? "fresh-settings-toggle on" : "fresh-settings-toggle"} aria-pressed={emailUpdates} onClick={() => setEmailUpdates(!emailUpdates)}><span aria-hidden="true" />{emailUpdates ? "Email updates on" : "Email updates off"}</button><button type="button" className="fresh-settings-primary" disabled={!user || isGuest || saving} onClick={() => void persistProfile()}>Save notification preference</button></section>

    <section className="fresh-settings-card"><div><h2>Privacy and data</h2><p>Your privacy choices now sync to your Fresh ID preferences when signed in. These are saved preferences, not yet universal enforcement switches; profile/search visibility enforcement and data export/deletion workflows remain separate engineering tasks.</p></div>
      <label className="fresh-settings-switch-row"><span><strong>Preferred profile discoverability</strong><small>Save whether you prefer your profile to be discoverable. This choice does not yet enforce visibility across every profile or search service.</small></span><input type="checkbox" checked={privacy.discoverable} onChange={(e) => changePrivacy({ ...privacy, discoverable: e.target.checked })} /></label>
      <label className="fresh-settings-switch-row"><span><strong>Personalization preference</strong><small>Save whether Fresh may personalize supported experiences. Service-by-service enforcement is still being completed.</small></span><input type="checkbox" checked={privacy.personalization} onChange={(e) => changePrivacy({ ...privacy, personalization: e.target.checked })} /></label>
      <label className="fresh-settings-switch-row"><span><strong>Product announcements</strong><small>Save your preference for optional marketing and product news; delivery enforcement still needs to be wired to each notification channel.</small></span><input type="checkbox" checked={privacy.announcements} onChange={(e) => changePrivacy({ ...privacy, announcements: e.target.checked })} /></label>
    </section>
    <footer className="fresh-settings-footer"><span>Fresh ID · Account settings</span><button type="button" onClick={() => setActiveRoute("trust")}>Trust and safety</button><button type="button" onClick={() => setActiveRoute("feed")}>Return to Fresh Home</button></footer>
  </div>;
}
