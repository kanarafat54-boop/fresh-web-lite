import { useEffect, useMemo, useRef, useState } from "react";
import "./UniversalProfile.css";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { loadRealUniversalProfile, saveRealProfileVisibility } from "../services/realProfileService";
import { loadCrossPlatformIdentity } from "../services/crossPlatformIdentityService";
import { curateSmartProfile } from "../services/profileIntelligence";
import { groupProfileActivity } from "../services/profileContentOrganizer";
import { loadProfileSuggestionCandidates } from "../services/profileConnectionCandidateService";
import { profileConnectionSuggestionEngine } from "../services/profileConnectionSuggestions";
import { uploadAvatar, uploadCover, isVideoUrl } from "../services/profileMediaService";
import type { CrossPlatformIdentity } from "../models/crossPlatformIdentity";
import type { ProfileConnectionSuggestion } from "../models/profileConnectionSuggestions";
import type { ProfileVisibility, SmartProfileData, UniversalProfile } from "../types/profile";

const tabs = ["Overview", "Activity", "Identity", "Professional", "Connections", "Insights", "Account"] as const;
type Tab = typeof tabs[number];

type AnalyticsRow = {
  short_count?: number | null;
  short_views?: number | null;
  short_likes?: number | null;
  short_reposts?: number | null;
  post_count?: number | null;
  post_likes?: number | null;
  gifts_received_count?: number | null;
  gifts_received_minor?: number | null;
  follower_count?: number | null;
  following_count?: number | null;
};

const emptyProfessional = { occupation: "", company: "", location: "", website: "", bio: "", pronouns: "" };

export default function UniversalProfile() {
  const { user, updateUser, registerPasskey, listPasskeys, removePasskey } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [profile, setProfile] = useState<UniversalProfile | null>(null);
  const [smart, setSmart] = useState<SmartProfileData | null>(null);
  const [crossPlatform, setCrossPlatform] = useState<CrossPlatformIdentity | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileConnectionSuggestion[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingMedia, setSavingMedia] = useState(false);
  const [editing, setEditing] = useState(false);
  const [professional, setProfessional] = useState(emptyProfessional);
  const [passkeys, setPasskeys] = useState<Array<{ id?: string; name?: string }>>([]);
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; friendly_name?: string; status?: string }>>([]);
  const [mfaSetup, setMfaSetup] = useState<{ id: string; qr: string; secret: string; code: string } | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  async function refresh() {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [loaded, identity, analyticsResult] = await Promise.all([
        loadRealUniversalProfile(user),
        loadCrossPlatformIdentity(user),
        supabase.from("user_content_analytics").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      setProfile(loaded);
      setCrossPlatform(identity);
      setSmart(curateSmartProfile(loaded));
      setAnalytics((analyticsResult.data ?? null) as AnalyticsRow | null);
      setProfessional({
        occupation: loaded.occupation,
        company: loaded.company,
        location: loaded.location,
        website: loaded.website,
        bio: loaded.bio,
        pronouns: loaded.pronouns,
      });
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not load Fresh ID profile.");
    } finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, [user]);

  useEffect(() => {
    if (!user || !profile) return;
    setLoadingSuggestions(true);
    loadProfileSuggestionCandidates(user.id)
      .then((candidates) => setSuggestions(profileConnectionSuggestionEngine.suggest(profile, candidates)))
      .catch(() => setSuggestions([]))
      .finally(() => setLoadingSuggestions(false));
  }, [user, profile]);

  const initials = useMemo(() => (profile?.displayName || "F").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase(), [profile?.displayName]);
  const organizedGroups = useMemo(() => profile ? groupProfileActivity(profile) : [], [profile]);
  const connected = profile?.connections.filter((item) => item.connected) ?? [];
  const enabledEcosystems = crossPlatform?.ecosystems.filter((item) => item.enabled) ?? [];

  async function updateVisibility(key: keyof ProfileVisibility) {
    if (!user || !profile) return;
    const next = { ...profile.visibility, [key]: !profile.visibility[key] };
    setSavingPrivacy(true); setError(null);
    try {
      await saveRealProfileVisibility(user.id, user.identity, next);
      setProfile((current) => current ? { ...current, visibility: next } : current);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save privacy settings.");
    } finally { setSavingPrivacy(false); }
  }

  async function handleAvatarUpload(file: File) {
    if (!user || !profile) return;
    setSavingMedia(true); setError(null);
    try {
      const url = await uploadAvatar(user.id, file);
      setProfile((current) => current ? { ...current, avatar: url } : current);
      setMessage("Profile picture updated.");
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Could not upload avatar."); }
    finally { setSavingMedia(false); }
  }

  async function handleCoverUpload(file: File) {
    if (!user || !profile) return;
    setSavingMedia(true); setError(null);
    try {
      const result = await uploadCover(user.id, file);
      setProfile((current) => current ? { ...current, coverPhoto: result.url } : current);
      setMessage(result.isVideo ? "Profile video cover updated." : "Profile cover updated.");
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Could not upload cover."); }
    finally { setSavingMedia(false); }
  }

  async function saveProfessionalProfile() {
    if (!user || !profile) return;
    setSavingMedia(true); setError(null);
    try {
      const { error: userError } = await supabase.from("users").update({
        full_name: profile.displayName.trim(),
        username: profile.username.trim().toLowerCase(),
        identity: {
          ...(user.identity && typeof user.identity === "object" ? user.identity : {}),
          occupation: professional.occupation.trim(),
          company: professional.company.trim(),
          location: professional.location.trim(),
          website_url: professional.website.trim(),
          bio: professional.bio.trim(),
          pronouns: professional.pronouns.trim(),
        },
      }).eq("id", user.id);
      if (userError) throw userError;
      const { error: detailsError } = await supabase.from("profile_details").upsert({
        user_id: user.id,
        bio: professional.bio.trim(),
        location: professional.location.trim(),
        website_url: professional.website.trim(),
        occupation: professional.occupation.trim(),
        company: professional.company.trim(),
        pronouns: professional.pronouns.trim(),
      }, { onConflict: "user_id" });
      if (detailsError) throw detailsError;
      updateUser({
        fullName: profile.displayName.trim(),
        username: profile.username.trim().toLowerCase(),
        bio: professional.bio.trim(),
        location: professional.location.trim(),
        websiteUrl: professional.website.trim(),
      });
      setEditing(false);
      setMessage("Professional profile saved to Fresh ID.");
      await refresh();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Could not save professional profile."); }
    finally { setSavingMedia(false); }
  }

  async function shareProfile() {
    if (!profile) return;
    const url = window.location.origin + "/profile";
    try {
      if (navigator.share) await navigator.share({ title: profile.displayName, text: "Fresh ID profile", url });
      else await navigator.clipboard.writeText(url);
      setMessage("Profile link copied/shared.");
    } catch { /* user cancelled share */ }
  }

  async function openPasskeys() {
    try { setPasskeys(await listPasskeys()); } catch { setPasskeys([]); }
  }

  async function refreshMfa() {
    const { data, error: factorError } = await supabase.auth.mfa.listFactors();
    if (factorError) { setError(factorError.message); return; }
    setMfaFactors([...(data?.totp ?? []), ...(data?.phone ?? [])] as Array<{ id: string; friendly_name?: string; status?: string }>);
  }

  async function startMfaSetup() {
    setMfaBusy(true); setError(null); setMessage(null);
    try {
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Fresh ID Authenticator" });
      if (enrollError || !data) throw enrollError ?? new Error("Could not start two-factor setup.");
      setMfaSetup({ id: data.id, qr: data.totp.qr_code, secret: data.totp.secret, code: "" });
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Could not start two-factor setup."); }
    finally { setMfaBusy(false); }
  }

  async function verifyMfaSetup() {
    const currentUser = user;
    if (!currentUser || !mfaSetup || mfaSetup.code.trim().length < 6) return;
    setMfaBusy(true); setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaSetup.id });
      if (challengeError || !challenge) throw challengeError ?? new Error("Could not create MFA challenge.");
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: mfaSetup.id, challengeId: challenge.id, code: mfaSetup.code.trim() });
      if (verifyError) throw verifyError;
      await supabase.from("users").update({ security: { ...(currentUser.security ?? {}), twoFactorEnabled: true } }).eq("id", currentUser.id);
      setMfaSetup(null); setMessage("Two-factor authentication is now enabled on Fresh ID."); await refreshMfa();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Two-factor verification failed."); }
    finally { setMfaBusy(false); }
  }

  async function removeMfa(factorId: string) {
    const currentUser = user;
    if (!currentUser) return;
    setMfaBusy(true); setError(null);
    try {
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
      if (unenrollError) throw unenrollError;
      await supabase.from("users").update({ security: { ...(currentUser.security ?? {}), twoFactorEnabled: false } }).eq("id", currentUser.id);
      setMessage("Two-factor authentication factor removed."); await refreshMfa();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : "Could not remove MFA factor."); }
    finally { setMfaBusy(false); }
  }

  async function exportAccountData() {
    const currentUser = user;
    if (!currentUser || !profile) return;
    const payload = { exportedAt: new Date().toISOString(), profile, analytics, connectedIdentities: connected, activity: profile.activity, subscription: currentUser.subscription, security: { twoFactorEnabled: currentUser.security.twoFactorEnabled, passkeyCount: passkeys.length } };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `fresh-id-${profile.username}-export.json`; link.click(); URL.revokeObjectURL(url); setMessage("Fresh ID account export created.");
  }

  if (!user) return <div className="universal-profile empty-profile"><h2>Fresh ID</h2><p>Sign in to open your real universal profile.</p></div>;
  if (loading) return <div className="universal-profile empty-profile"><p>Loading your Fresh ID profile…</p></div>;
  if (!profile) return <div className="universal-profile empty-profile"><p>{error || "Profile unavailable."}</p></div>;

  return (
    <main className="universal-profile">
      {error && <div className="profile-error" role="alert">{error}</div>}
      {message && <div className="profile-success" role="status">{message}</div>}

      <section className="profile-hero">
        {profile.coverPhoto && isVideoUrl(profile.coverPhoto)
          ? <video className="profile-cover profile-cover-video" src={profile.coverPhoto} autoPlay muted loop playsInline aria-label="Profile cover video" />
          : <div className="profile-cover" style={profile.coverPhoto ? { backgroundImage: `url(${profile.coverPhoto})` } : undefined} />}
        <div className="profile-cover-actions">
          <input ref={coverInputRef} className="profile-file-input" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void handleCoverUpload(file); }} />
          <button type="button" disabled={savingMedia} onClick={() => coverInputRef.current?.click()}>＋ Cover</button>
        </div>
        <div className="profile-identity-row">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar" style={profile.avatar ? { backgroundImage: `url(${profile.avatar})` } : undefined}>{!profile.avatar && initials}</div>
            <input ref={avatarInputRef} className="profile-file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) void handleAvatarUpload(file); }} />
            <button className="profile-avatar-add" type="button" aria-label="Change profile picture" disabled={savingMedia} onClick={() => avatarInputRef.current?.click()}>＋</button>
          </div>
          <div className="profile-name-block">
            <div className="profile-title-line"><h1>{profile.displayName}</h1>{profile.verified && <span className="profile-badge">✓ Verified</span>}</div>
            <p>@{profile.username} · {profile.freshId}</p>
            {profile.occupation && <span>{profile.occupation}{profile.company ? ` · ${profile.company}` : ""}</span>}
          </div>
        </div>
        <div className="profile-primary-actions">
          <button type="button" onClick={() => setEditing((value) => !value)}>✎ Edit profile</button>
          <button type="button" onClick={() => setTab("Professional")}>▣ Professional</button>
          <button type="button" onClick={() => setTab("Account")}>⚿ Account</button>
          <button type="button" onClick={() => setActiveRoute("creator")}>＋ Create</button>
          <button type="button" onClick={() => void shareProfile()}>↗ Share</button>
        </div>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <div className="profile-stats">
          <span><strong>{profile.followerCount}</strong> followers</span>
          <span><strong>{profile.followingCount}</strong> following</span>
          <span><strong>{profile.postCount}</strong> posts</span>
          <span><strong>{profile.shortCount}</strong> shorts</span>
          <span><strong>{profile.reputationScore}</strong> reputation</span>
        </div>
      </section>

      {editing && <section className="profile-card profile-editor">
        <div className="card-heading"><div><span className="eyebrow">FRESH ID EDITOR</span><h2>Identity, professional and public profile</h2></div><button onClick={() => setEditing(false)}>Close</button></div>
        <div className="profile-editor-grid">
          <label>Display name<input value={profile.displayName} onChange={(e) => setProfile((p) => p ? { ...p, displayName: e.target.value } : p)} /></label>
          <label>Username<input value={profile.username} onChange={(e) => setProfile((p) => p ? { ...p, username: e.target.value } : p)} /></label>
          <label>Profession<input value={professional.occupation} onChange={(e) => setProfessional((p) => ({ ...p, occupation: e.target.value }))} /></label>
          <label>Company / organization<input value={professional.company} onChange={(e) => setProfessional((p) => ({ ...p, company: e.target.value }))} /></label>
          <label>Location<input value={professional.location} onChange={(e) => setProfessional((p) => ({ ...p, location: e.target.value }))} /></label>
          <label>Website<input value={professional.website} onChange={(e) => setProfessional((p) => ({ ...p, website: e.target.value }))} /></label>
          <label>Pronouns<input value={professional.pronouns} onChange={(e) => setProfessional((p) => ({ ...p, pronouns: e.target.value }))} /></label>
          <label className="wide">Bio<textarea value={professional.bio} onChange={(e) => setProfessional((p) => ({ ...p, bio: e.target.value }))} rows={3} /></label>
        </div>
        <button className="profile-save-button" disabled={savingMedia} onClick={() => void saveProfessionalProfile()}>{savingMedia ? "Saving…" : "Save changes"}</button>
      </section>}

      <nav className="profile-tabs" aria-label="Profile sections">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === "Overview" && <div className="profile-grid">
        <section className="profile-card smart-card smart-ai-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>Smart profile</h2></div><span className="live-dot">LIVE DATA</span></div><p>{smart?.summary}</p>{smart?.interests.length ? <div className="smart-tags">{smart.interests.map((interest) => <span key={interest}>{interest}</span>)}</div> : <p className="muted">Add interests or publish content and Fresh Intelligence will organize signals here.</p>}<div className="smart-metrics"><div><strong>{smart?.highlights.length ?? 0}</strong><span>Highlights</span></div><div><strong>{connected.length}</strong><span>Connected identities</span></div><div><strong>{enabledEcosystems.length}</strong><span>Fresh ecosystems</span></div></div></section>
        <section className="profile-card"><div className="card-heading"><h2>AI-curated highlights</h2><button onClick={() => setTab("Activity")}>View all</button></div>{smart?.highlights.length ? smart.highlights.slice(0, 3).map((item) => <article className="activity-row" key={`${item.kind}-${item.id}`}><span className="activity-kind">{item.kind}</span><div><strong>{item.title}</strong><p>{item.text || "Media content"}</p></div><span className="highlight-score">{item.score}</span></article>) : <p className="muted">No real activity is available to curate yet.</p>}</section>
        <section className="profile-card"><div className="card-heading"><h2>Reputation & trust</h2><span className="profile-score">{profile.reputationScore}</span></div><p>Fresh ID reputation is shown from persisted account data. Fresh Intelligence does not invent credibility.</p><div className="smart-tags"><span>{profile.verified ? "Verified identity" : "Identity not verified"}</span><span>{profile.connections.length} linked identities</span></div></section>
        <section className="profile-card"><div className="card-heading"><h2>Privacy layers</h2><button disabled={savingPrivacy} onClick={() => setTab("Identity")}>Manage</button></div><p>Visibility is controlled by the Fresh identity rather than a visual-only switch.</p><div className="privacy-summary"><span>Public {profile.visibility.public ? "On" : "Off"}</span><span>Connections {profile.visibility.connections ? "On" : "Off"}</span><span>Private {profile.visibility.private ? "On" : "Off"}</span></div></section>
        <section className="profile-card"><div className="card-heading"><h2>Fresh ecosystems</h2><span>{enabledEcosystems.length} active</span></div>{enabledEcosystems.length ? enabledEcosystems.slice(0, 4).map((item) => <div className="connection-row" key={item.ecosystemId}><span className="connection-icon">F</span><div><strong>{item.title || item.ecosystemId}</strong><p>{item.description || "Fresh ecosystem"}</p></div><span>Active</span></div>) : <p className="muted">No enabled ecosystem profile is stored yet.</p>}</section>
        <section className="profile-card"><div className="card-heading"><h2>Content performance</h2><button onClick={() => setTab("Insights")}>Open analytics</button></div><div className="smart-metrics"><div><strong>{analytics?.short_views ?? 0}</strong><span>Short views</span></div><div><strong>{analytics?.short_likes ?? analytics?.post_likes ?? 0}</strong><span>Likes</span></div><div><strong>{analytics?.short_reposts ?? 0}</strong><span>Reposts</span></div></div></section>
      </div>}

      {tab === "Activity" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>Organized activity</h2></div><span>{profile.activity.length} loaded</span></div>{organizedGroups.length === 0 ? <p className="muted">No activity stored yet.</p> : organizedGroups.map((group) => <section className="activity-theme" key={group.theme}><div className="activity-theme-heading"><h3>{group.theme}</h3><span>{group.count}</span></div>{group.items.slice(0, 20).map((item) => <article className="activity-row" key={`${item.kind}-${item.id}`}><span className="activity-kind">{item.kind}</span><div><strong>{item.title}</strong><p>{item.text || "Media content"}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}</section>)}</section>}

      {tab === "Identity" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH ID</span><h2>Identity & privacy</h2></div></div><div className="identity-details"><p><b>Fresh ID:</b> {profile.freshId}</p><p><b>Email:</b> {profile.email}</p><p><b>Joined:</b> {new Date(profile.joinedAt).toLocaleDateString()}</p><p><b>Location:</b> {profile.location || "Not provided"}</p><p><b>Website:</b> {profile.website || "Not provided"}</p><p><b>Skills:</b> {profile.skills.length ? profile.skills.join(", ") : "Not provided"}</p><p><b>Language:</b> {profile.languages.length ? profile.languages.join(", ") : "Not provided"}</p><p><b>Verification:</b> {user.identity.verificationLevel ?? "none"}</p></div><div className="privacy-controls">{(["public", "connections", "private"] as const).map((key) => <button key={key} disabled={savingPrivacy} className={profile.visibility[key] ? "privacy-on" : "privacy-off"} onClick={() => void updateVisibility(key)}>{key}: {profile.visibility[key] ? "visible" : "hidden"}</button>)}</div></section>}

      {tab === "Professional" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">PROFESSIONAL IDENTITY</span><h2>Career, portfolio and public credibility</h2></div><button onClick={() => setEditing(true)}>Edit</button></div><div className="professional-grid"><div><span>Role</span><strong>{profile.occupation || "Add your profession"}</strong></div><div><span>Organization</span><strong>{profile.company || "Add your organization"}</strong></div><div><span>Location</span><strong>{profile.location || "Add location"}</strong></div><div><span>Website</span><strong>{profile.website || "Add website"}</strong></div><div><span>Skills</span><strong>{profile.skills.length ? profile.skills.join(" · ") : "Add skills"}</strong></div><div><span>Reputation</span><strong>{profile.reputationScore}</strong></div></div><div className="professional-actions"><button onClick={() => window.dispatchEvent(new CustomEvent("fresh-route", { detail: "creator" }))}>Open Creator Studio</button><button onClick={() => setTab("Insights")}>View professional analytics</button><button onClick={() => void shareProfile()}>Share professional profile</button></div></section>}

      {tab === "Connections" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>People & identities</h2></div><span>{suggestions.length} suggestions</span></div>{loadingSuggestions ? <p className="muted">Finding relevant Fresh connections…</p> : suggestions.length ? <div className="suggestion-grid">{suggestions.map((item) => <article className="suggestion-card" key={item.id}><div className="suggestion-avatar" style={item.avatar ? { backgroundImage: `url(${item.avatar})` } : undefined}>{!item.avatar && item.displayName.slice(0, 1).toUpperCase()}</div><div className="suggestion-body"><strong>{item.displayName}</strong><span>@{item.username}</span><p>{item.reason}</p>{item.signals.length > 1 && <small>{item.signals.slice(0, 3).join(" · ")}</small>}</div><span className="suggestion-score">{item.score}%</span></article>)}</div> : <p className="muted">No strong connection match is available from current Fresh data.</p>}<div className="card-heading ecosystem-heading"><h2>Cross-platform identities</h2><span>{connected.length} connected</span></div>{connected.length ? connected.map((item) => <div className="connection-row" key={`${item.provider}-${item.handle}`}><span className="connection-icon">{item.provider.slice(0, 1).toUpperCase()}</span><div><strong>{item.provider}</strong><p>{item.handle || "Linked account"}</p></div><span>Connected</span></div>) : <p className="muted">No external identity is connected to this Fresh ID yet.</p>}</section>}

      {tab === "Insights" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">REAL CONTENT ANALYTICS</span><h2>Professional dashboard</h2></div><button onClick={() => window.dispatchEvent(new CustomEvent("fresh-route", { detail: "creator" }))}>Creator Studio</button></div><div className="analytics-big-grid"><div><strong>{analytics?.post_count ?? profile.postCount}</strong><span>Posts</span></div><div><strong>{analytics?.short_count ?? profile.shortCount}</strong><span>Shorts</span></div><div><strong>{analytics?.short_views ?? 0}</strong><span>Short views</span></div><div><strong>{analytics?.short_likes ?? analytics?.post_likes ?? 0}</strong><span>Likes</span></div><div><strong>{analytics?.short_reposts ?? 0}</strong><span>Reposts</span></div><div><strong>{analytics?.gifts_received_count ?? 0}</strong><span>Gifts received</span></div><div><strong>{analytics?.follower_count ?? profile.followerCount}</strong><span>Followers</span></div><div><strong>{analytics?.following_count ?? profile.followingCount}</strong><span>Following</span></div></div><p className="muted">Metrics are read from Fresh content and account data. Missing event-level metrics remain zero rather than being invented.</p></section>}

      {tab === "Account" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">ULTIMATE ACCOUNT CENTER</span><h2>Security, access and account controls</h2></div><span>{user.subscription.tier.toUpperCase()}</span></div><div className="account-grid"><div><span>Subscription</span><strong>{user.subscription.tier}</strong><small>{user.subscription.renewsAt ? `Renews ${new Date(user.subscription.renewsAt).toLocaleDateString()}` : "No renewal date stored"}</small></div><div><span>Verification</span><strong>{user.identity.verificationLevel ?? "none"}</strong><small>{user.verified ? "Account verified" : "Verification available when enabled"}</small></div><div><span>Two-factor</span><strong>{user.security.twoFactorEnabled ? "Enabled" : "Not enabled"}</strong><small>Stored account security state</small></div><div><span>Linked accounts</span><strong>{user.linkedAccounts.length}</strong><small>Cross-platform identity links</small></div><div><span>Presence</span><strong>{user.presence}</strong><small>Current Fresh ID state</small></div><div><span>Account age</span><strong>{Math.max(1, Math.floor((Date.now()-Date.parse(user.createdAt))/86400000))} days</strong><small>Based on account creation date</small></div></div><div className="account-actions"><button onClick={() => void openPasskeys()}>Manage passkeys</button><button onClick={() => void registerPasskey()}>＋ Add this device passkey</button><button onClick={() => void refreshMfa()}>Manage 2FA</button><button onClick={() => void startMfaSetup()}>＋ Set up TOTP 2FA</button><button onClick={() => void exportAccountData()}>↓ Export my data</button><button onClick={() => setActiveRoute("settings")}>Open settings</button></div>{mfaSetup && <div className="mfa-setup"><strong>Set up authenticator app</strong><p>Scan the QR code with your authenticator app, then enter the 6-digit code.</p><img src={`data:image/svg+xml;utf8,${encodeURIComponent(mfaSetup.qr)}`} alt="Fresh ID authenticator QR code" /><code>{mfaSetup.secret}</code><input inputMode="numeric" maxLength={6} value={mfaSetup.code} onChange={(e) => setMfaSetup((current) => current ? { ...current, code: e.target.value.replace(/\\D/g, "") } : current)} placeholder="123456" /><div><button disabled={mfaBusy} onClick={() => void verifyMfaSetup()}>Verify & enable</button><button disabled={mfaBusy} onClick={() => setMfaSetup(null)}>Cancel</button></div></div>}{mfaFactors.length > 0 && <div className="passkey-list"><strong>Two-factor factors</strong>{mfaFactors.map((factor) => <div key={factor.id}><span>🛡️ {factor.friendly_name || "Authenticator"} · {factor.status || "active"}</span><button disabled={mfaBusy} onClick={() => void removeMfa(factor.id)}>Remove</button></div>)}</div>}{passkeys.length > 0 && <div className="passkey-list">{passkeys.map((key) => <div key={key.id}><span>🔐 {key.name || "Fresh ID passkey"}</span>{key.id && <button onClick={() => void removePasskey(key.id!)}>Remove</button>}</div>)}</div>}<p className="muted">Fresh ID keeps account controls separate from public profile presentation. Destructive account operations remain behind explicit authorization.</p></section>}
    </main>
  );
}
