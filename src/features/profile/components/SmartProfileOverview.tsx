import type { Dispatch, SetStateAction } from "react";
import type { ProfileConnectionSuggestion } from "../models/profileConnectionSuggestions";
import type { SmartProfileData, UniversalProfile } from "../types/profile";

type ProfessionalDraft = {
  occupation: string;
  company: string;
  location: string;
  website: string;
  bio: string;
  pronouns: string;
  education: string;
  workInterests: string;
};

type ProfileLink = { id: string; label: string; url: string; position: number };

type Tab = "Overview" | "Activity" | "Identity" | "Professional" | "Connections" | "Insights" | "Account";

type Props = {
  profile: UniversalProfile;
  smart: SmartProfileData | null;
  professional: ProfessionalDraft;
  setProfessional: Dispatch<SetStateAction<ProfessionalDraft>>;
  setProfile: Dispatch<SetStateAction<UniversalProfile | null>>;
  editing: boolean;
  setEditing: Dispatch<SetStateAction<boolean>>;
  savingMedia: boolean;
  saveProfessionalProfile: () => Promise<void>;
  profileLinks: ProfileLink[];
  suggestions: ProfileConnectionSuggestion[];
  loadingSuggestions: boolean;
  setTab: Dispatch<SetStateAction<Tab>>;
};

/** World-class Fresh ID Overview — outcomes only, no internal architecture. */
export default function SmartProfileOverview({
  profile,
  smart,
  professional,
  setProfessional,
  setProfile,
  editing,
  setEditing,
  savingMedia,
  saveProfessionalProfile,
  profileLinks,
  suggestions,
  loadingSuggestions,
  setTab,
}: Props) {
  function addChip(field: "interests" | "skills" | "workInterests" | "achievements", value: string) {
    const v = value.trim();
    if (!v) return;
    if (field === "workInterests") {
      const list = professional.workInterests.split(",").map((s) => s.trim()).filter(Boolean);
      if (list.map((x) => x.toLowerCase()).includes(v.toLowerCase())) return;
      setProfessional((p) => ({ ...p, workInterests: [...list, v].join(", ") }));
      return;
    }
    const current = profile[field] || [];
    if (current.map((x) => x.toLowerCase()).includes(v.toLowerCase())) return;
    setProfile({ ...profile, [field]: [...current, v] });
  }

  function removeChip(field: "interests" | "skills" | "achievements", value: string) {
    setProfile({ ...profile, [field]: (profile[field] || []).filter((x) => x !== value) });
  }

  const workList = professional.workInterests
    ? professional.workInterests.split(",").map((s) => s.trim()).filter(Boolean)
    : profile.workInterests || [];

  return (
    <div className="profile-grid smart-overview">
      <section className="profile-card smart-card smart-ai-card full-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">SMART PROFILE</span>
            <h2>How you show up</h2>
          </div>
          <span className="live-dot">CONTEXT AWARE</span>
        </div>
        <p className="smart-summary">
          {smart?.summary ||
            "Your profile adapts from what you share — bio, work, creations, and activity — without exposing private account details."}
        </p>
        <div className="credibility-strip" aria-label="Credibility signals">
          <span className={profile.verified ? "cred-pill on" : "cred-pill"}>
            {profile.verified ? "✓ Verified" : "Verification optional"}
          </span>
          <span className="cred-pill">Reputation {profile.reputationScore}</span>
          <span className="cred-pill">{profile.connections.filter((c) => c.connected).length} linked</span>
          <span className="cred-pill">{(profile.achievements || []).length} achievements</span>
        </div>
      </section>

      <section className="profile-card full-card intro-card">
        <div className="card-heading">
          <div>
            <span className="eyebrow">INTRO</span>
            <h2>Smart bio & background</h2>
          </div>
          <button type="button" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done" : "＋ Edit"}
          </button>
        </div>
        {editing ? (
          <div className="intro-edit-grid">
            <label>Display name<input value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} /></label>
            <label>Username<input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} /></label>
            <label className="span-2">Bio<textarea rows={3} value={professional.bio} onChange={(e) => setProfessional((p) => ({ ...p, bio: e.target.value }))} placeholder="A clear intro — who you are and what you do" /></label>
            <label>Education<input value={professional.education} onChange={(e) => setProfessional((p) => ({ ...p, education: e.target.value }))} placeholder="School, degree, or program" /></label>
            <label>Work title<input value={professional.occupation} onChange={(e) => setProfessional((p) => ({ ...p, occupation: e.target.value }))} placeholder="Role or craft" /></label>
            <label>Organization<input value={professional.company} onChange={(e) => setProfessional((p) => ({ ...p, company: e.target.value }))} placeholder="Company or team" /></label>
            <label>Location<input value={professional.location} onChange={(e) => setProfessional((p) => ({ ...p, location: e.target.value }))} /></label>
            <label>Website<input value={professional.website} onChange={(e) => setProfessional((p) => ({ ...p, website: e.target.value }))} placeholder="https://" /></label>
            <label>Pronouns<input value={professional.pronouns} onChange={(e) => setProfessional((p) => ({ ...p, pronouns: e.target.value }))} /></label>
            <div className="span-2 intro-actions">
              <button type="button" disabled={savingMedia} onClick={() => void saveProfessionalProfile()}>Save intro</button>
            </div>
          </div>
        ) : (
          <div className="intro-read">
            <p className="intro-bio">{professional.bio || profile.bio || "Add a short bio so people know how to connect with you."}</p>
            <div className="intro-facts">
              {(professional.education || profile.education) ? <div><span className="fact-label">Education</span><strong>{professional.education || profile.education}</strong></div> : null}
              {(professional.occupation || profile.occupation) ? <div><span className="fact-label">Work</span><strong>{professional.occupation || profile.occupation}{(professional.company || profile.company) ? ` · ${professional.company || profile.company}` : ""}</strong></div> : null}
              {(professional.location || profile.location) ? <div><span className="fact-label">Location</span><strong>{professional.location || profile.location}</strong></div> : null}
              {(professional.website || profile.website) ? <div><span className="fact-label">Web</span><strong><a href={professional.website || profile.website} target="_blank" rel="noreferrer">{professional.website || profile.website}</a></strong></div> : null}
            </div>
          </div>
        )}
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">INTERESTS</span><h2>Personal & creative</h2></div></div>
        <div className="chip-row">
          {(profile.interests || []).map((item) => (
            <button type="button" className="chip" key={`int-${item}`} onClick={() => editing && removeChip("interests", item)}>{item}{editing ? " ×" : ""}</button>
          ))}
          {editing && (
            <form className="chip-add" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chip") as HTMLInputElement; addChip("interests", input.value); input.value = ""; }}>
              <input name="chip" placeholder="Add interest" aria-label="Add interest" /><button type="submit">＋</button>
            </form>
          )}
          {!editing && !(profile.interests || []).length && <p className="muted">Add interests to shape suggestions and discovery.</p>}
        </div>
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">WORK FOCUS</span><h2>Professional interests</h2></div></div>
        <div className="chip-row">
          {workList.map((item) => <span className="chip work" key={`wi-${item}`}>{item}</span>)}
          {editing && (
            <form className="chip-add" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chip") as HTMLInputElement; addChip("workInterests", input.value); input.value = ""; }}>
              <input name="chip" placeholder="Add work focus" aria-label="Add work interest" /><button type="submit">＋</button>
            </form>
          )}
          {!editing && !workList.length && <p className="muted">Add work interests for professional matches and opportunities.</p>}
        </div>
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">SKILLS</span><h2>What you bring</h2></div></div>
        <div className="chip-row">
          {(profile.skills || []).map((item) => (
            <button type="button" className="chip skill" key={`sk-${item}`} onClick={() => editing && removeChip("skills", item)}>{item}{editing ? " ×" : ""}</button>
          ))}
          {editing && (
            <form className="chip-add" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chip") as HTMLInputElement; addChip("skills", input.value); input.value = ""; }}>
              <input name="chip" placeholder="Add skill" aria-label="Add skill" /><button type="submit">＋</button>
            </form>
          )}
        </div>
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">ACHIEVEMENTS</span><h2>Optional highlights</h2></div></div>
        <div className="chip-row">
          {(profile.achievements || []).map((item) => (
            <button type="button" className="chip achieve" key={`ac-${item}`} onClick={() => editing && removeChip("achievements", item)}>{item}{editing ? " ×" : ""}</button>
          ))}
          {editing && (
            <form className="chip-add" onSubmit={(e) => { e.preventDefault(); const input = e.currentTarget.elements.namedItem("chip") as HTMLInputElement; addChip("achievements", input.value); input.value = ""; }}>
              <input name="chip" placeholder="Add achievement" aria-label="Add achievement" /><button type="submit">＋</button>
            </form>
          )}
          {!editing && !(profile.achievements || []).length && <p className="muted">Optional — awards, certifications, milestones you choose to show.</p>}
        </div>
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">LINKS</span><h2>Web & presence</h2></div><button type="button" onClick={() => setTab("Professional")}>＋ Manage</button></div>
        <div className="link-list">
          {(professional.website || profile.website) && (
            <a className="profile-link-row" href={professional.website || profile.website} target="_blank" rel="noreferrer"><span>Website</span><strong>{professional.website || profile.website}</strong></a>
          )}
          {profileLinks.map((link) => (
            <a className="profile-link-row" key={link.id} href={link.url} target="_blank" rel="noreferrer"><span>{link.label}</span><strong>{link.url}</strong></a>
          ))}
          {!profileLinks.length && !(professional.website || profile.website) && <p className="muted">Add website and professional links from Professional.</p>}
        </div>
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">CURATED</span><h2>Relevant activity</h2></div><button type="button" onClick={() => setTab("Activity")}>All</button></div>
        {smart?.highlights?.length ? smart.highlights.slice(0, 4).map((item) => (
          <article className="activity-row" key={`${item.kind}-${item.id}`}>
            <span className="activity-kind">{item.kind}</span>
            <div><strong>{item.title}</strong><p>{item.text || "Shared content"}</p></div>
          </article>
        )) : <p className="muted">Publish posts or shorts — highlights appear from your real activity.</p>}
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">SUGGESTIONS</span><h2>People & next steps</h2></div><button type="button" onClick={() => setTab("Connections")}>Open</button></div>
        {loadingSuggestions ? <p className="muted">Finding relevant connections…</p> : suggestions.length ? (
          <div className="suggestion-grid">
            {suggestions.slice(0, 4).map((s) => (
              <div className="suggestion-card" key={s.id}>
                <div className="suggestion-body">
                  <strong>{s.displayName || s.username || "Member"}</strong>
                  <p>{s.reason || "May share interests or professional focus with you."}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">Suggestions appear when there are real, privacy-safe matches.</p>}
      </section>

      <section className="profile-card">
        <div className="card-heading"><div><span className="eyebrow">GOVERNANCE</span><h2>Privacy · Security · Portability</h2></div><button type="button" onClick={() => setTab("Account")}>Manage</button></div>
        <div className="governance-grid">
          <div><strong>Privacy</strong><p>Public {profile.visibility.public ? "on" : "off"} · Connections {profile.visibility.connections ? "on" : "off"}</p></div>
          <div><strong>Security</strong><p>Passkeys & 2FA on Account — protect your Fresh ID.</p></div>
          <div><strong>Portability</strong><p>Export your profile data anytime from Account.</p></div>
          <div><strong>Authenticity</strong><p>Only real activity and data you control — nothing invented for show.</p></div>
        </div>
      </section>
    </div>
  );
}
