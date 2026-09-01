import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { BackIcon, SearchIcon } from "../../../components/Icons";

interface ProfileData {
  id: string;
  fullName: string;
  username: string;
  role: string;
  verified: boolean;
  email: string;
}

interface ProfileDetails {
  bio: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  location: string;
  websiteUrl: string;
  occupation: string;
  company: string;
  pronouns: string;
}

interface ProfileLink { id: string; label: string; url: string; position: number }
interface ProfileWork { id: string; title: string; description: string; url: string | null; imageUrl: string | null; position: number }
interface PostSummary { id: string; content: string; imageUrl: string | null; videoUrl: string | null; createdAt: string }
interface ShortSummary { id: string; videoUrl: string; likeCount: number; createdAt: string }

type ProfileSection = "overview" | "posts" | "shorts" | "media" | "projects" | "portfolio" | "about";

const PROFILE_SECTIONS: Array<{ id: ProfileSection; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "posts", label: "Posts", icon: "✎" },
  { id: "shorts", label: "Shorts", icon: "▶" },
  { id: "media", label: "Media", icon: "▧" },
  { id: "projects", label: "Projects", icon: "◇" },
  { id: "portfolio", label: "Portfolio", icon: "▤" },
  { id: "about", label: "About", icon: "ⓘ" },
];

const EMPTY_DETAILS: ProfileDetails = {
  bio: "",
  avatarUrl: null,
  coverUrl: null,
  location: "",
  websiteUrl: "",
  occupation: "",
  company: "",
  pronouns: "",
};

export function ProfileView({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { user, updateUser, logout } = useFreshId();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [details, setDetails] = useState<ProfileDetails>(EMPTY_DETAILS);
  const [links, setLinks] = useState<ProfileLink[]>([]);
  const [projects, setProjects] = useState<ProfileWork[]>([]);
  const [portfolio, setPortfolio] = useState<ProfileWork[]>([]);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [shorts, setShorts] = useState<ShortSummary[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeSection, setActiveSection] = useState<ProfileSection>("overview");
  const [profileSearch, setProfileSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [workEditor, setWorkEditor] = useState<"projects" | "portfolio" | null>(null);
  const [workDraft, setWorkDraft] = useState({ title: "", description: "", url: "", imageUrl: "" });

  const isOwner = Boolean(user && user.id === userId);

  useEffect(() => { void loadProfile(); }, [userId]);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    setMessage(null);

    const { data: profileData, error: profileError } = await supabase
      .from("users")
      .select("id, full_name, username, role, verified, email")
      .eq("id", userId)
      .maybeSingle();

    if (profileError || !profileData) {
      setError(profileError?.message ?? "Couldn't load this profile.");
      setLoading(false);
      return;
    }

    setProfile({
      id: profileData.id,
      fullName: profileData.full_name ?? "Fresh User",
      username: profileData.username ?? "user",
      role: profileData.role ?? "user",
      verified: Boolean(profileData.verified),
      email: profileData.email ?? "",
    });

    const detailsResult = await supabase.from("profile_details").select("bio, avatar_url, cover_url, location, website_url, occupation, company, pronouns").eq("user_id", userId).maybeSingle();
    if (!detailsResult.error && detailsResult.data) {
      setDetails({
        bio: detailsResult.data.bio ?? "",
        avatarUrl: detailsResult.data.avatar_url ?? null,
        coverUrl: detailsResult.data.cover_url ?? null,
        location: detailsResult.data.location ?? "",
        websiteUrl: detailsResult.data.website_url ?? "",
        occupation: detailsResult.data.occupation ?? "",
        company: detailsResult.data.company ?? "",
        pronouns: detailsResult.data.pronouns ?? "",
      });
    } else {
      const identity = (profileData as { identity?: Record<string, unknown> }).identity ?? {};
      setDetails({
        bio: String(identity.bio ?? ""),
        avatarUrl: typeof identity.avatar_url === "string" ? identity.avatar_url : null,
        coverUrl: typeof identity.cover_url === "string" ? identity.cover_url : null,
        location: String(identity.location ?? ""),
        websiteUrl: String(identity.website_url ?? ""),
        occupation: String(identity.occupation ?? ""),
        company: String(identity.company ?? ""),
        pronouns: String(identity.pronouns ?? ""),
      });
    }

    const [linksResult, projectsResult, portfolioResult, postsResult, shortsResult] = await Promise.all([
      supabase.from("profile_links").select("id, label, url, position").eq("user_id", userId).order("position", { ascending: true }),
      supabase.from("profile_projects").select("id, title, description, url, image_url, position").eq("user_id", userId).order("position", { ascending: true }),
      supabase.from("profile_portfolio_items").select("id, title, description, url, image_url, position").eq("user_id", userId).order("position", { ascending: true }),
      supabase.from("posts").select("id, content, image_url, video_url, created_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("shorts").select("id, video_url, like_count, created_at").eq("author_id", userId).order("created_at", { ascending: false }).limit(50),
    ]);

    if (!linksResult.error) setLinks((linksResult.data ?? []) as ProfileLink[]);
    if (!projectsResult.error) setProjects((projectsResult.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", url: item.url ?? null, imageUrl: item.image_url ?? null, position: item.position ?? 0 })));
    if (!portfolioResult.error) setPortfolio((portfolioResult.data ?? []).map((item) => ({ id: item.id, title: item.title, description: item.description ?? "", url: item.url ?? null, imageUrl: item.image_url ?? null, position: item.position ?? 0 })));
    if (!postsResult.error) setPosts((postsResult.data ?? []).map((item) => ({ id: item.id, content: item.content ?? "", imageUrl: item.image_url ?? null, videoUrl: item.video_url ?? null, createdAt: item.created_at })));
    if (!shortsResult.error) setShorts((shortsResult.data ?? []).map((item) => ({ id: item.id, videoUrl: item.video_url, likeCount: item.like_count ?? 0, createdAt: item.created_at })));

    const [followers, following] = await Promise.all([
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("followed_id", userId),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    ]);
    setFollowerCount(followers.count ?? 0);
    setFollowingCount(following.count ?? 0);

    if (user && user.id !== userId) {
      const { data: followRow } = await supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("followed_id", userId).maybeSingle();
      setIsFollowing(Boolean(followRow));
    } else {
      setIsFollowing(false);
    }
    setLoading(false);
  }

  async function saveProfile() {
    if (!isOwner || !profile) return;
    const fullName = profile.fullName.trim();
    const username = profile.username.trim().toLowerCase();
    if (!fullName || !username) { setError("Full name and username are required."); return; }

    setSaving(true); setError(null); setMessage(null);
    const identityPatch = {
      bio: details.bio.trim(), avatar_url: details.avatarUrl?.trim() || null, cover_url: details.coverUrl?.trim() || null,
      location: details.location.trim(), website_url: details.websiteUrl.trim(), occupation: details.occupation.trim(),
      company: details.company.trim(), pronouns: details.pronouns.trim(),
    };

    const { error: userError } = await supabase.from("users").update({ full_name: fullName, username }).eq("id", userId);
    if (userError) {
      setError(userError.code === "23505" ? "That username is already taken." : userError.message);
      setSaving(false); return;
    }

    const detailsResult = await supabase.from("profile_details").upsert({ user_id: userId, ...identityPatch }, { onConflict: "user_id" });
    if (detailsResult.error) {
      // Keep profile editing usable before the profile migration is applied by persisting the same information in users.identity.
      const { data: currentUser } = await supabase.from("users").select("identity").eq("id", userId).maybeSingle();
      const currentIdentity = (currentUser?.identity as Record<string, unknown> | null) ?? {};
      const fallback = await supabase.from("users").update({ identity: { ...currentIdentity, ...identityPatch } }).eq("id", userId);
      if (fallback.error) { setError(fallback.error.message); setSaving(false); return; }
    }

    setProfile((current) => current ? { ...current, fullName, username } : current);
    updateUser({ fullName, username });
    setEditing(false); setSaving(false); setMessage("Profile updated successfully.");
  }

  async function toggleFollow() {
    if (!user || user.id === userId) return;
    setError(null);
    if (isFollowing) {
      const { error: deleteError } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", userId);
      if (deleteError) { setError(deleteError.message); return; }
      setIsFollowing(false); setFollowerCount((count) => Math.max(0, count - 1));
    } else {
      const { error: insertError } = await supabase.from("follows").insert({ follower_id: user.id, followed_id: userId });
      if (insertError) { setError(insertError.message); return; }
      setIsFollowing(true); setFollowerCount((count) => count + 1);
    }
  }

  async function deleteWork(kind: "projects" | "portfolio", id: string) {
    if (!isOwner) return;
    const table = kind === "projects" ? "profile_projects" : "profile_portfolio_items";
    const { error: deleteError } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
    if (deleteError) { setError(deleteError.message); return; }
    if (kind === "projects") setProjects((items) => items.filter((item) => item.id !== id));
    else setPortfolio((items) => items.filter((item) => item.id !== id));
  }

  async function saveWork() {
    if (!isOwner || !workEditor || !workDraft.title.trim()) return;
    const table = workEditor === "projects" ? "profile_projects" : "profile_portfolio_items";
    const current = workEditor === "projects" ? projects : portfolio;
    const payload = {
      user_id: userId,
      title: workDraft.title.trim(),
      description: workDraft.description.trim(),
      url: workDraft.url.trim() || null,
      image_url: workDraft.imageUrl.trim() || null,
      position: current.length,
    };
    const { data, error: insertError } = await supabase.from(table).insert(payload).select("id, title, description, url, image_url, position").single();
    if (insertError || !data) { setError(insertError?.message ?? `Couldn't save ${workEditor}. Apply the profile database migration first.`); return; }
    const item: ProfileWork = { id: data.id, title: data.title, description: data.description ?? "", url: data.url ?? null, imageUrl: data.image_url ?? null, position: data.position ?? current.length };
    if (workEditor === "projects") setProjects((items) => [...items, item]); else setPortfolio((items) => [...items, item]);
    setWorkEditor(null); setWorkDraft({ title: "", description: "", url: "", imageUrl: "" }); setMessage(`${workEditor === "projects" ? "Project" : "Portfolio item"} added.`);
  }

  const visibleSections = useMemo(() => {
    const query = profileSearch.trim().toLowerCase();
    return query ? PROFILE_SECTIONS.filter((section) => section.label.toLowerCase().includes(query)) : PROFILE_SECTIONS;
  }, [profileSearch]);

  const media = useMemo(() => posts.filter((post) => post.imageUrl || post.videoUrl), [posts]);
  const initials = (profile?.fullName ?? "F").trim().split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="profile-view" style={{ maxWidth: 980, margin: "0 auto", paddingBottom: 48 }}>
      <div className="profile-header-bar" style={{ position: "sticky", top: 0, zIndex: 4, backdropFilter: "blur(16px)" }}>
        <button className="back-btn" onClick={onClose} aria-label="Close profile"><BackIcon size={20} /></button>
        <div style={{ flex: 1 }}><strong>{profile ? `@${profile.username}` : "Profile"}</strong></div>
        {isOwner && <button className="auth-tab" onClick={() => setEditing((value) => !value)}>{editing ? "Close editor" : "Edit"}</button>}
        {isOwner && <button className="auth-tab" onClick={() => void logout()}>Log out</button>}
      </div>

      {loading && <p className="empty-state">Loading your Fresh profile...</p>}
      {error && <p className="auth-error" role="alert">{error}</p>}
      {message && <p className="empty-state" role="status">{message}</p>}

      {!loading && profile && (
        <>
          <section style={{ borderRadius: 24, overflow: "hidden", border: "1px solid var(--border-color, #ddd)", background: "var(--card-background, #fff)" }}>
            <div style={{ height: 190, background: details.coverUrl ? `center / cover no-repeat url(${details.coverUrl})` : "linear-gradient(135deg, #101828, #344054 55%, #667085)" }} />
            <div style={{ padding: "0 24px 24px", position: "relative" }}>
              <div style={{ display: "flex", gap: 18, alignItems: "flex-end", marginTop: -58, flexWrap: "wrap" }}>
                <div style={{ width: 116, height: 116, borderRadius: "50%", border: "5px solid var(--card-background, #fff)", background: details.avatarUrl ? `center / cover no-repeat url(${details.avatarUrl})` : "#eef2f6", display: "grid", placeItems: "center", fontSize: 34, fontWeight: 800 }} aria-label="Profile avatar">{!details.avatarUrl && initials}</div>
                <div style={{ flex: 1, minWidth: 230, paddingBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <h1 style={{ margin: 0, fontSize: 28 }}>{profile.fullName}</h1>
                    {profile.verified && <span className="fresh-id-tier">Verified</span>}
                    {profile.role === "admin" && <span className="fresh-id-tier">Admin</span>}
                  </div>
                  <div className="post-username" style={{ fontSize: 15 }}>@{profile.username}</div>
                  {(details.occupation || details.company) && <div style={{ marginTop: 5 }}>{details.occupation}{details.company ? ` · ${details.company}` : ""}</div>}
                </div>
                {!isOwner && user && <button className={isFollowing ? "follow-chip following profile-follow-btn" : "follow-chip profile-follow-btn"} onClick={() => void toggleFollow()}>{isFollowing ? "Following" : "Follow"}</button>}
              </div>

              {details.bio && <p style={{ maxWidth: 760, lineHeight: 1.6, margin: "18px 0 10px" }}>{details.bio}</p>}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 14, opacity: .82 }}>
                {details.location && <span>⌖ {details.location}</span>}
                {details.websiteUrl && <a href={details.websiteUrl} target="_blank" rel="noreferrer">↗ Website</a>}
                {details.pronouns && <span>{details.pronouns}</span>}
              </div>
              {links.length > 0 && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>{links.map((link) => <a key={link.id} className="auth-tab" href={link.url} target="_blank" rel="noreferrer">{link.label}</a>)}</div>}

              <div className="profile-stats-row" style={{ marginTop: 22 }}>
                <div><strong>{followerCount}</strong><span>Followers</span></div>
                <div><strong>{followingCount}</strong><span>Following</span></div>
                <div><strong>{posts.length}</strong><span>Posts</span></div>
                <div><strong>{shorts.length}</strong><span>Shorts</span></div>
              </div>
            </div>
          </section>

          {editing && isOwner && (
            <section className="profile-edit-form" style={{ marginTop: 18, padding: 20, borderRadius: 20, border: "1px solid var(--border-color, #ddd)" }}>
              <h3 style={{ marginTop: 0 }}>Edit your Fresh identity</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                <input className="auth-input" value={profile.fullName} onChange={(event) => setProfile((current) => current ? { ...current, fullName: event.target.value } : current)} placeholder="Full name" />
                <input className="auth-input" value={profile.username} onChange={(event) => setProfile((current) => current ? { ...current, username: event.target.value } : current)} placeholder="Username" />
                <input className="auth-input" value={details.occupation} onChange={(event) => setDetails((current) => ({ ...current, occupation: event.target.value }))} placeholder="Role / profession" />
                <input className="auth-input" value={details.company} onChange={(event) => setDetails((current) => ({ ...current, company: event.target.value }))} placeholder="Company / organization" />
                <input className="auth-input" value={details.location} onChange={(event) => setDetails((current) => ({ ...current, location: event.target.value }))} placeholder="Location" />
                <input className="auth-input" value={details.pronouns} onChange={(event) => setDetails((current) => ({ ...current, pronouns: event.target.value }))} placeholder="Pronouns (optional)" />
                <input className="auth-input" value={details.websiteUrl} onChange={(event) => setDetails((current) => ({ ...current, websiteUrl: event.target.value }))} placeholder="Website URL" />
                <input className="auth-input" value={details.avatarUrl ?? ""} onChange={(event) => setDetails((current) => ({ ...current, avatarUrl: event.target.value || null }))} placeholder="Avatar image URL" />
                <input className="auth-input" value={details.coverUrl ?? ""} onChange={(event) => setDetails((current) => ({ ...current, coverUrl: event.target.value || null }))} placeholder="Cover image URL" />
              </div>
              <textarea className="note-input" value={details.bio} onChange={(event) => setDetails((current) => ({ ...current, bio: event.target.value }))} placeholder="Tell people who you are, what you build, and what you care about..." maxLength={500} style={{ width: "100%", marginTop: 10, minHeight: 110 }} />
              <div style={{ display: "flex", gap: 10, marginTop: 10 }}><button className="auth-submit-btn" onClick={() => void saveProfile()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button><button className="auth-tab" onClick={() => setEditing(false)} disabled={saving}>Cancel</button></div>
            </section>
          )}

          <div className="profile-section-search" style={{ marginTop: 18 }}><SearchIcon size={16} /><input value={profileSearch} onChange={(event) => setProfileSearch(event.target.value)} placeholder="Find a profile section..." className="auth-input" /></div>
          <div className="profile-section-tabs" style={{ overflowX: "auto" }}>
            {visibleSections.map((section) => <button key={section.id} className={activeSection === section.id ? "nav-btn active" : "nav-btn"} onClick={() => setActiveSection(section.id)}><span>{section.icon}</span><span>{section.label}</span></button>)}
          </div>

          <section style={{ marginTop: 18 }}>
            {activeSection === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
                <InfoCard title="About" value={details.bio || "Add a short bio to tell the Fresh community who you are."} />
                <InfoCard title="Fresh activity" value={`${posts.length} posts · ${shorts.length} Shorts · ${media.length} media posts`} />
                <InfoCard title="Professional" value={details.occupation || details.company ? `${details.occupation}${details.company ? ` at ${details.company}` : ""}` : "Add your role or organization."} />
                <InfoCard title="Projects" value={`${projects.length} projects · ${portfolio.length} portfolio items`} />
              </div>
            )}

            {activeSection === "posts" && <PostGrid posts={posts} />}
            {activeSection === "shorts" && <ShortGrid shorts={shorts} />}
            {activeSection === "media" && <MediaGrid posts={media} />}

            {(activeSection === "projects" || activeSection === "portfolio") && (
              <WorkSection title={activeSection === "projects" ? "Projects" : "Portfolio"} items={activeSection === "projects" ? projects : portfolio} owner={isOwner} onAdd={() => { setWorkEditor(activeSection); setWorkDraft({ title: "", description: "", url: "", imageUrl: "" }); }} onDelete={(id) => void deleteWork(activeSection, id)} />
            )}

            {activeSection === "about" && (
              <div style={{ display: "grid", gap: 12 }}>
                <InfoCard title="Fresh ID" value={`@${profile.username} · ${profile.role}${profile.verified ? " · Verified" : ""}`} />
                <InfoCard title="Contact" value={isOwner ? profile.email || "No public email" : "Contact is protected by Fresh ID."} />
                <InfoCard title="Member since" value={user?.createdAt && user.id === userId ? new Date(user.createdAt).toLocaleDateString() : "Fresh community member"} />
              </div>
            )}
          </section>

          {workEditor && isOwner && (
            <div style={{ position: "fixed", inset: 0, zIndex: 20, background: "rgba(0,0,0,.5)", display: "grid", placeItems: "center", padding: 18 }}>
              <div style={{ width: "min(560px,100%)", background: "var(--card-background,#fff)", borderRadius: 22, padding: 22 }}>
                <h3 style={{ marginTop: 0 }}>{workEditor === "projects" ? "Add project" : "Add portfolio item"}</h3>
                <input className="auth-input" value={workDraft.title} onChange={(event) => setWorkDraft((draft) => ({ ...draft, title: event.target.value }))} placeholder="Title" />
                <textarea className="note-input" value={workDraft.description} onChange={(event) => setWorkDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Description" style={{ width: "100%", marginTop: 10, minHeight: 110 }} />
                <input className="auth-input" value={workDraft.url} onChange={(event) => setWorkDraft((draft) => ({ ...draft, url: event.target.value }))} placeholder="Project URL" style={{ marginTop: 10 }} />
                <input className="auth-input" value={workDraft.imageUrl} onChange={(event) => setWorkDraft((draft) => ({ ...draft, imageUrl: event.target.value }))} placeholder="Preview image URL" style={{ marginTop: 10 }} />
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}><button className="auth-submit-btn" onClick={() => void saveWork()}>Add</button><button className="auth-tab" onClick={() => setWorkEditor(null)}>Cancel</button></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function InfoCard({ title, value }: { title: string; value: string }) {
  return <article style={{ padding: 18, borderRadius: 18, border: "1px solid var(--border-color,#ddd)" }}><strong>{title}</strong><p style={{ marginBottom: 0, lineHeight: 1.55, opacity: .8 }}>{value}</p></article>;
}

function PostGrid({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <p className="empty-state">No posts yet.</p>;
  return <div style={{ display: "grid", gap: 12 }}>{posts.map((post) => <article key={post.id} className="post-item"><div className="post-time">{new Date(post.createdAt).toLocaleString()}</div>{post.content && <p className="post-content">{post.content}</p>}{post.imageUrl && <img src={post.imageUrl} alt="Post media" className="post-image" />}{post.videoUrl && <video src={post.videoUrl} controls preload="metadata" className="post-video" />}</article>)}</div>;
}

function ShortGrid({ shorts }: { shorts: ShortSummary[] }) {
  if (shorts.length === 0) return <p className="empty-state">No Shorts published yet.</p>;
  return <div className="profile-shorts-grid">{shorts.map((short) => <article key={short.id}><video src={short.videoUrl} className="profile-grid-video" muted controls preload="metadata" /><small>{short.likeCount} reactions · {new Date(short.createdAt).toLocaleDateString()}</small></article>)}</div>;
}

function MediaGrid({ posts }: { posts: PostSummary[] }) {
  if (posts.length === 0) return <p className="empty-state">No media published yet.</p>;
  return <div className="profile-shorts-grid">{posts.map((post) => post.videoUrl ? <video key={post.id} src={post.videoUrl} className="profile-grid-video" controls preload="metadata" /> : post.imageUrl ? <img key={post.id} src={post.imageUrl} alt="Profile media" className="profile-grid-video" style={{ objectFit: "cover" }} /> : null)}</div>;
}

function WorkSection({ title, items, owner, onAdd, onDelete }: { title: string; items: ProfileWork[]; owner: boolean; onAdd: () => void; onDelete: (id: string) => void }) {
  return <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><h2 style={{ margin: 0 }}>{title}</h2>{owner && <button className="auth-submit-btn" onClick={onAdd}>+ Add</button>}</div>{items.length === 0 ? <p className="empty-state">Nothing here yet.{owner ? " Add your first item." : ""}</p> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>{items.map((item) => <article key={item.id} style={{ border: "1px solid var(--border-color,#ddd)", borderRadius: 18, overflow: "hidden" }}>{item.imageUrl && <img src={item.imageUrl} alt="" style={{ width: "100%", height: 150, objectFit: "cover" }} />}<div style={{ padding: 16 }}><h3 style={{ marginTop: 0 }}>{item.title}</h3><p style={{ opacity: .8 }}>{item.description}</p>{item.url && <a href={item.url} target="_blank" rel="noreferrer">Open ↗</a>}{owner && <button className="auth-tab" onClick={() => onDelete(item.id)} style={{ marginLeft: 8 }}>Delete</button>}</div></article>)}</div>}</div>;
}
