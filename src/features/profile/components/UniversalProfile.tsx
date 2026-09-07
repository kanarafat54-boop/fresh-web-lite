import { useEffect, useMemo, useState } from "react";
import "./UniversalProfile.css";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { loadRealUniversalProfile, saveRealProfileVisibility } from "../services/realProfileService";
import { loadCrossPlatformIdentity } from "../services/crossPlatformIdentityService";
import { curateSmartProfile } from "../services/profileIntelligence";
import { groupProfileActivity } from "../services/profileContentOrganizer";
import { loadProfileSuggestionCandidates } from "../services/profileConnectionCandidateService";
import { profileConnectionSuggestionEngine } from "../services/profileConnectionSuggestions";
import type { CrossPlatformIdentity } from "../models/crossPlatformIdentity";
import type { ProfileConnectionSuggestion } from "../models/profileConnectionSuggestions";
import type { ProfileVisibility, SmartProfileData, UniversalProfile } from "../types/profile";

const tabs = ["Overview", "Activity", "Identity", "Connections", "Insights"] as const;
type Tab = typeof tabs[number];

export default function UniversalProfile() {
  const { user } = useFreshId();
  const [profile, setProfile] = useState<UniversalProfile | null>(null);
  const [smart, setSmart] = useState<SmartProfileData | null>(null);
  const [crossPlatform, setCrossPlatform] = useState<CrossPlatformIdentity | null>(null);
  const [suggestions, setSuggestions] = useState<ProfileConnectionSuggestion[]>([]);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true); setError(null);
    Promise.all([loadRealUniversalProfile(user), loadCrossPlatformIdentity(user)])
      .then(([loaded, identity]) => {
        setProfile(loaded);
        setCrossPlatform(identity);
        setSmart(curateSmartProfile(loaded));
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Could not load Fresh ID profile."))
      .finally(() => setLoading(false));
  }, [user]);

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

  if (!user) return <div className="universal-profile empty-profile"><h2>Fresh ID</h2><p>Sign in to open your real universal profile.</p></div>;
  if (loading) return <div className="universal-profile empty-profile"><p>Loading your Fresh ID profile…</p></div>;
  if (!profile) return <div className="universal-profile empty-profile"><p>{error || "Profile unavailable."}</p></div>;

  const connected = profile.connections.filter((item) => item.connected);
  const enabledEcosystems = crossPlatform?.ecosystems.filter((item) => item.enabled) ?? [];

  return (
    <main className="universal-profile">
      {error && <div className="profile-error" role="alert">{error}</div>}
      <section className="profile-hero">
        <div className="profile-cover" style={profile.coverPhoto ? { backgroundImage: `url(${profile.coverPhoto})` } : undefined} />
        <div className="profile-identity-row">
          <div className="profile-avatar" style={profile.avatar ? { backgroundImage: `url(${profile.avatar})` } : undefined}>{!profile.avatar && initials}</div>
          <div className="profile-name-block"><div className="profile-title-line"><h1>{profile.displayName}</h1>{profile.verified && <span className="profile-badge">✓ Verified</span>}</div><p>@{profile.username} · {profile.freshId}</p>{profile.occupation && <span>{profile.occupation}{profile.company ? ` · ${profile.company}` : ""}</span>}</div>
        </div>
        {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        <div className="profile-stats"><span><strong>{profile.followerCount}</strong> followers</span><span><strong>{profile.followingCount}</strong> following</span><span><strong>{profile.postCount}</strong> posts</span><span><strong>{profile.shortCount}</strong> shorts</span><span><strong>{profile.reputationScore}</strong> reputation</span></div>
      </section>

      <nav className="profile-tabs" aria-label="Profile sections">{tabs.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>

      {tab === "Overview" && <div className="profile-grid">
        <section className="profile-card smart-card smart-ai-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>Smart profile</h2></div><span className="live-dot">LIVE DATA</span></div><p>{smart?.summary}</p>{smart?.interests.length ? <div className="smart-tags">{smart.interests.map((interest) => <span key={interest}>{interest}</span>)}</div> : <p className="muted">Add interests or publish content and Fresh Intelligence will organize signals here.</p>}<div className="smart-metrics"><div><strong>{smart?.highlights.length ?? 0}</strong><span>Highlights</span></div><div><strong>{connected.length}</strong><span>Connected identities</span></div><div><strong>{enabledEcosystems.length}</strong><span>Fresh ecosystems</span></div></div></section>
        <section className="profile-card"><div className="card-heading"><h2>AI-curated highlights</h2><button onClick={() => setTab("Activity")}>View all</button></div>{smart?.highlights.length ? smart.highlights.slice(0, 3).map((item) => <article className="activity-row" key={`${item.kind}-${item.id}`}><span className="activity-kind">{item.kind}</span><div><strong>{item.title}</strong><p>{item.text || "Media content"}</p></div><span className="highlight-score">{item.score}</span></article>) : <p className="muted">No real activity is available to curate yet.</p>}</section>
        <section className="profile-card"><div className="card-heading"><h2>Reputation</h2><span className="profile-score">{profile.reputationScore}</span></div><p>Fresh ID reputation is shown from the persisted account score. Fresh Intelligence does not invent credibility.</p></section>
        <section className="profile-card"><div className="card-heading"><h2>Privacy layers</h2><button disabled={savingPrivacy} onClick={() => setTab("Identity")}>Manage</button></div><p>Visibility is controlled by the Fresh identity rather than by a visual-only switch.</p><div className="privacy-summary"><span>Public {profile.visibility.public ? "On" : "Off"}</span><span>Connections {profile.visibility.connections ? "On" : "Off"}</span><span>Private {profile.visibility.private ? "On" : "Off"}</span></div></section>
        <section className="profile-card"><div className="card-heading"><h2>Fresh ecosystem</h2><span>{enabledEcosystems.length} active</span></div>{enabledEcosystems.length ? enabledEcosystems.slice(0, 4).map((item) => <div className="connection-row" key={item.ecosystemId}><span className="connection-icon">F</span><div><strong>{item.title || item.ecosystemId}</strong><p>{item.description || "Fresh ecosystem"}</p></div><span>Active</span></div>) : <p className="muted">No enabled ecosystem profile is stored for this Fresh ID yet.</p>}</section>
        <section className="profile-card"><div className="card-heading"><h2>Organized content</h2><span>{organizedGroups.length} themes</span></div>{organizedGroups.length ? <div className="smart-tags">{organizedGroups.slice(0, 6).map((group) => <button className="theme-chip" key={group.theme} onClick={() => setTab("Activity")}>{group.theme} · {group.count}</button>)}</div> : <p className="muted">Publish or save real activity and Fresh Intelligence will group it by theme.</p>}</section>
      </div>}

      {tab === "Activity" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>Organized activity</h2></div><span>{profile.activity.length} loaded</span></div>{organizedGroups.length === 0 ? <p className="muted">No activity stored yet.</p> : organizedGroups.map((group) => <section className="activity-theme" key={group.theme}><div className="activity-theme-heading"><h3>{group.theme}</h3><span>{group.count}</span></div>{group.items.slice(0, 12).map((item) => <article className="activity-row" key={`${item.kind}-${item.id}`}><span className="activity-kind">{item.kind}</span><div><strong>{item.title}</strong><p>{item.text || "Media content"}</p></div><time>{new Date(item.createdAt).toLocaleString()}</time></article>)}</section>)}</section>}

      {tab === "Identity" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH ID</span><h2>Identity & privacy</h2></div></div><div className="identity-details"><p><b>Fresh ID:</b> {profile.freshId}</p><p><b>Email:</b> {profile.email}</p><p><b>Joined:</b> {new Date(profile.joinedAt).toLocaleDateString()}</p><p><b>Location:</b> {profile.location || "Not provided"}</p><p><b>Website:</b> {profile.website || "Not provided"}</p><p><b>Skills:</b> {profile.skills.length ? profile.skills.join(", ") : "Not provided"}</p></div><div className="privacy-controls">{(["public", "connections", "private"] as const).map((key) => <button key={key} disabled={savingPrivacy} className={profile.visibility[key] ? "privacy-on" : "privacy-off"} onClick={() => void updateVisibility(key)}>{key}: {profile.visibility[key] ? "visible" : "hidden"}</button>)}</div></section>}

      {tab === "Connections" && <section className="profile-card full-card"><div className="card-heading"><div><span className="eyebrow">FRESH INTELLIGENCE</span><h2>People you may connect with</h2></div><span>{suggestions.length} matches</span></div>{loadingSuggestions ? <p className="muted">Finding relevant Fresh connections…</p> : suggestions.length ? <div className="suggestion-grid">{suggestions.map((item) => <article className="suggestion-card" key={item.id}><div className="suggestion-avatar" style={item.avatar ? { backgroundImage: `url(${item.avatar})` } : undefined}>{!item.avatar && item.displayName.slice(0, 1).toUpperCase()}</div><div className="suggestion-body"><strong>{item.displayName}</strong><span>@{item.username}</span><p>{item.reason}</p>{item.signals.length > 1 && <small>{item.signals.slice(0, 3).join(" · ")}</small>}</div><span className="suggestion-score">{item.score}%</span></article>)}</div> : <p className="muted">No strong connection match is available from the current Fresh data.</p>}<div className="card-heading ecosystem-heading"><h2>Cross-platform identities</h2><span>{connected.length} connected</span></div>{connected.length === 0 ? <p className="muted">No external identity is connected to this Fresh ID yet.</p> : connected.map((item) => <div className="connection-row" key={`${item.provider}-${item.handle}`}><span className="connection-icon">{item.provider.slice(0, 1).toUpperCase()}</span><div><strong>{item.provider}</strong><p>{item.handle || "Linked account"}</p></div><span>Connected</span></div>)}<div className="card-heading ecosystem-heading"><h2>Fresh ecosystems</h2><span>{crossPlatform?.ecosystems.length ?? 0} linked</span></div>{crossPlatform?.ecosystems.length ? crossPlatform.ecosystems.map((item) => <div className="connection-row" key={item.ecosystemId}><span className="connection-icon">F</span><div><strong>{item.title || item.ecosystemId}</strong><p>{item.description || "Fresh ecosystem"}</p></div><span>{item.enabled ? "Active" : "Disabled"}</span></div>) : <p className="muted">No ecosystem profile is linked yet.</p>}</section>}

      {tab === "Insights" && <section className="profile-card full-card"><div className="card-heading"><h2>Personal analytics</h2><span>Fresh Intelligence</span></div><div className="insight-grid">{smart?.insights.map((insight) => <div key={insight.label}><strong>{insight.value}</strong><span>{insight.label}</span><small>{insight.reason}</small></div>)}</div><p className="muted">These insights are calculated only from data currently stored for this Fresh ID. Deeper reach, views and impact analytics will require event-level engagement data.</p></section>}
    </main>
  );
}
