import { useEffect, useMemo, useRef, useState } from "react";
import "./CreatorStudioDashboard.css";
import { supabase } from "../../lib/supabase";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { useLayout } from "../../app/contexts/useLayout";
import { buildCreatorSuggestions } from "./creatorSuggestions";
import { publishFreshMedia, listCreatorPublishedMedia, saveCreatorDraft } from "./core/freshMediaRepository";
import {
  readCreateIntent,
  clearCreateIntent,
  markFeedRefresh,
  isShortCreateAction,
  type FreshFlowCreateIntent,
} from "./core/createIntent";
import CreatorProductionPanels from "./CreatorProductionPanels";

type Draft = {
  id: string;
  kind: "post" | "short";
  content: string;
  media_url: string | null;
  status: string;
  created_at: string;
};
type MediaItem = {
  id: string;
  kind: "post" | "short";
  title: string;
  text: string;
  mediaUrl: string | null;
  createdAt: string;
};

type StudioTab = "publish" | "analytics" | "distribute" | "design" | "audio" | "monetize";

const TABS: { id: StudioTab; label: string }[] = [
  { id: "publish", label: "Publish" },
  { id: "analytics", label: "Analytics" },
  { id: "distribute", label: "Distribute" },
  { id: "design", label: "Design" },
  { id: "audio", label: "Audio" },
  { id: "monetize", label: "Monetize" },
];

const LOCAL_DRAFTS_KEY = "fresh.creator.localDrafts";

function loadLocalDrafts(): Draft[] {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Draft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalDrafts(list: Draft[]) {
  try {
    localStorage.setItem(LOCAL_DRAFTS_KEY, JSON.stringify(list.slice(0, 40)));
  } catch {
    /* quota */
  }
}

async function uploadMedia(userId: string, file: File): Promise<{ url: string; kind: "image" | "video" }> {
  const isVideo = file.type.startsWith("video/");
  const bucket = isVideo ? "post-videos" : "post-images";
  const path = `${userId}/creator-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, kind: isVideo ? "video" : "image" };
}

export default function CreatorStudioDashboard() {
  const { user } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [tab, setTab] = useState<StudioTab>("publish");
  const [mode, setMode] = useState<"post" | "short">("post");
  const [content, setContent] = useState("");
  const [media, setMedia] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ReturnType<typeof buildCreatorSuggestions>>([]);
  const [intentMeta, setIntentMeta] = useState<FreshFlowCreateIntent | null>(null);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const intentConsumedRef = useRef(false);

  useEffect(() => {
    if (intentConsumedRef.current) return;
    intentConsumedRef.current = true;
    const intent = readCreateIntent();
    if (!intent) return;
    clearCreateIntent();
    setIntentMeta(intent);
    setTab("publish");
    if (isShortCreateAction(intent.action)) {
      setMode("short");
      if (intent.sourceCaption) {
        const prefix =
          intent.action === "remix"
            ? "Remix: "
            : intent.action === "duet"
              ? "Duet: "
              : intent.action === "quote"
                ? "Quote: "
                : "";
        setContent(`${prefix}${intent.sourceCaption}`);
      }
      requestAnimationFrame(() => editorRef.current?.focus());
    }
  }, []);

  async function load() {
    if (!user) {
      setLoading(false);
      setDrafts(loadLocalDrafts());
      setItems([]);
      setAnalytics({});
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [draftResult, libraryResult, analyticsResult] = await Promise.all([
        supabase
          .from("creator_drafts")
          .select("id,kind,content,media_url,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(30),
        listCreatorPublishedMedia(user.id).catch(() => []),
        supabase.from("user_content_analytics").select("*").eq("user_id", user.id).maybeSingle(),
      ]);
      if (draftResult.error) setError(draftResult.error.message);
      const remote = (draftResult.data ?? []) as Draft[];
      const local = loadLocalDrafts();
      const remoteIds = new Set(remote.map((d) => d.id));
      setDrafts([...local.filter((d) => !remoteIds.has(d.id)), ...remote]);
      setItems(
        (libraryResult ?? []).map((item) => ({ ...item, title: item.kind === "short" ? "Short" : "Post" })),
      );
      setAnalytics((analyticsResult.data ?? {}) as Record<string, number>);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not load creator data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  useEffect(() => {
    setSuggestions(
      buildCreatorSuggestions({
        postCount: analytics.post_count ?? items.filter((i) => i.kind === "post").length,
        shortCount: analytics.short_count ?? items.filter((i) => i.kind === "short").length,
        shortViews: analytics.short_views ?? 0,
        followers: analytics.follower_count ?? user?.stats?.followerCount ?? 0,
        drafts,
      }),
    );
  }, [analytics, drafts, items, user]);

  async function saveDraft() {
    if (!content.trim() && !media) {
      setError("Add text or media before saving a draft.");
      return;
    }
    setError(null);
    setMessage(null);

    if (!user) {
      const draft: Draft = {
        id: `local-${crypto.randomUUID()}`,
        kind: mode,
        content: content.trim(),
        media_url: media?.url ?? null,
        status: "draft",
        created_at: new Date().toISOString(),
      };
      const next = [draft, ...loadLocalDrafts()].slice(0, 40);
      saveLocalDrafts(next);
      setDrafts(next);
      setContent("");
      setMedia(null);
      setMessage("Draft saved on this device. Sign in to sync across devices.");
      return;
    }

    try {
      const data = await saveCreatorDraft({
        userId: user.id,
        kind: mode,
        content,
        mediaUrl: media?.url,
        mediaKind: media?.kind ?? null,
      });
      setDrafts((c) => [data as Draft, ...c]);
      setContent("");
      setMedia(null);
      setMessage("Draft saved.");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Could not save draft.");
    }
  }

  async function publishNow() {
    if (!user) {
      setError("Sign in with Fresh ID to publish to Fresh Flow.");
      return;
    }
    if (!content.trim() && !media) {
      setError("Add text or media before publishing.");
      return;
    }
    if (mode === "short" && media?.kind !== "video") {
      setError("A Short requires a video upload.");
      return;
    }
    setPublishing(true);
    setError(null);
    setMessage(null);
    try {
      const published = await publishFreshMedia(mode, {
        authorId: user.id,
        content,
        mediaUrl: media?.url ?? null,
        mediaKind: media?.kind ?? null,
        remixOfShortId: intentMeta?.action === "remix" ? intentMeta.sourceShortId ?? null : null,
        duetOfShortId: intentMeta?.action === "duet" ? intentMeta.sourceShortId ?? null : null,
      });
      setContent("");
      setMedia(null);
      setIntentMeta(null);
      if (published.kind === "short") {
        markFeedRefresh(published.id);
        setMessage("Short published to Fresh Flow.");
      } else {
        setMessage("Post published to Fresh Flow.");
      }
      await load();
      window.setTimeout(() => setActiveRoute("fresh-flow"), 400);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Publishing failed.");
    } finally {
      setPublishing(false);
    }
  }

  async function deleteDraft(id: string) {
    if (id.startsWith("local-") || !user) {
      const next = loadLocalDrafts().filter((d) => d.id !== id);
      saveLocalDrafts(next);
      setDrafts((c) => c.filter((d) => d.id !== id));
      setMessage("Draft deleted.");
      return;
    }
    const { error: deleteError } = await supabase.from("creator_drafts").delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) setError(deleteError.message);
    else {
      setDrafts((c) => c.filter((d) => d.id !== id));
      setMessage("Draft deleted.");
    }
  }

  function restoreDraft(draft: Draft) {
    setMode(draft.kind);
    setContent(draft.content);
    setMedia(
      draft.media_url ? { url: draft.media_url, kind: draft.kind === "short" ? "video" : "image" } : null,
    );
    setTab("publish");
    setMessage("Draft restored.");
  }

  function goSignIn() {
    try {
      setActiveRoute("profile");
    } catch {
      setMessage("Open My profile to sign in with Fresh ID.");
    }
  }

  const kpis = useMemo(
    () => [
      ["Posts", analytics.post_count ?? items.filter((i) => i.kind === "post").length],
      ["Shorts", analytics.short_count ?? items.filter((i) => i.kind === "short").length],
      ["Short views", analytics.short_views ?? 0],
      ["Likes", analytics.short_likes ?? analytics.post_likes ?? 0],
      ["Reposts", analytics.short_reposts ?? 0],
      ["Followers", analytics.follower_count ?? user?.stats?.followerCount ?? 0],
    ],
    [analytics, items, user],
  );

  return (
    <section className="creator-studio-dashboard">
      <header className="creator-studio-hero">
        <div>
          <span className="workspace-eyebrow">CREATOR PRODUCTION</span>
          <h1>Creator Studio</h1>
          <p>
            Publish for real. Analytics, distribution, brand, audio, and monetization start here — Studio holds the NLE
            timeline.
          </p>
          {intentMeta?.action && (
            <p className="creator-note">
              Opened from Fresh Flow{intentMeta.action !== "create" ? ` · ${intentMeta.action}` : ""}.
            </p>
          )}
        </div>
        <div className="creator-hero-actions">
          <button type="button" onClick={() => setActiveRoute("studio")}>
            Open Studio NLE
          </button>
          <button type="button" onClick={() => setActiveRoute("fresh-flow")}>
            Fresh Flow
          </button>
          <button type="button" onClick={() => void load()}>
            Refresh data
          </button>
          {!user && (
            <button type="button" className="publish" onClick={goSignIn}>
              Sign in
            </button>
          )}
        </div>
      </header>

      {!user && (
        <div className="creator-auth-banner" role="status">
          <strong>Local drafts, Design, Audio, Monetize & Distribute work now.</strong>
          <span>Sign in with Fresh ID only when you are ready to publish live or sync drafts.</span>
          <button type="button" className="publish" onClick={goSignIn}>
            Sign in with Fresh ID
          </button>
        </div>
      )}

      <div className="creator-kpis">
        {kpis.map(([label, value]) => (
          <div key={String(label)}>
            <strong>{value}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <nav className="creator-mode-tabs" aria-label="Creator sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "publish" && (
        <>
          {suggestions.length > 0 && user && (
            <section className="creator-panel creator-suggestions" aria-label="Suggestions">
              <div className="creator-section-heading">
                <div>
                  <span className="workspace-eyebrow">FRESH AI</span>
                  <h2>Suggested next</h2>
                </div>
              </div>
              <div className="creator-suggestion-grid">
                {suggestions.map((s) => (
                  <article className="creator-suggestion-card" key={s.id}>
                    <div>
                      <strong>{s.title}</strong>
                      <p>{s.reason}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (s.action === "post") setMode("post");
                        else if (s.action === "short") setMode("short");
                        else if (s.action === "drafts")
                          document.getElementById("creator-drafts")?.scrollIntoView({ behavior: "smooth" });
                        else void load();
                      }}
                    >
                      {s.action === "refresh" ? "Review" : s.action === "drafts" ? "Drafts" : s.action === "short" ? "Short" : "Post"}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="creator-studio-grid">
            <section className="creator-editor">
              <div className="creator-section-heading">
                <div>
                  <span className="workspace-eyebrow">PUBLISH</span>
                  <h2>Create media</h2>
                </div>
                <div className="creator-mode-switch">
                  <button type="button" className={mode === "post" ? "active" : ""} onClick={() => setMode("post")}>
                    Post
                  </button>
                  <button type="button" className={mode === "short" ? "active" : ""} onClick={() => setMode("short")}>
                    Short
                  </button>
                </div>
              </div>
              <textarea
                ref={editorRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={mode === "post" ? "Write a post…" : "Short caption…"}
              />
              {media && (
                <div className="creator-media-preview">
                  {media.kind === "video" ? <video src={media.url} controls /> : <img src={media.url} alt="" />}
                  <button type="button" onClick={() => setMedia(null)}>
                    Remove media
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={
                  mode === "short"
                    ? "video/mp4,video/webm,video/quicktime"
                    : "image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                }
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (!file) return;
                  try {
                    setError(null);
                    if (!user) {
                      const isVideo = file.type.startsWith("video/");
                      const url = URL.createObjectURL(file);
                      setMedia({ url, kind: isVideo ? "video" : "image" });
                      setMessage("Media attached on this device. Sign in to upload for publish.");
                      return;
                    }
                    setMedia(await uploadMedia(user.id, file));
                    setMessage("Media uploaded.");
                  } catch (reason: unknown) {
                    setError(reason instanceof Error ? reason.message : "Upload failed.");
                  }
                }}
              />
              <div className="creator-editor-actions">
                <button type="button" onClick={() => fileRef.current?.click()}>
                  ＋ Media
                </button>
                <button type="button" onClick={() => void saveDraft()} disabled={!content.trim() && !media}>
                  Save draft
                </button>
                <button
                  type="button"
                  className="publish"
                  onClick={() => void publishNow()}
                  disabled={publishing || (!content.trim() && !media)}
                >
                  {publishing ? "Publishing…" : user ? "Publish now" : "Sign in to publish"}
                </button>
              </div>
              {error && <p className="creator-error">{error}</p>}
              {message && <p className="creator-message">{message}</p>}
            </section>

            <section className="creator-panel" id="creator-drafts">
              <div className="creator-section-heading">
                <div>
                  <span className="workspace-eyebrow">WORKSPACE</span>
                  <h2>Drafts</h2>
                </div>
                <span>{drafts.length}</span>
              </div>
              {loading ? (
                <p>Loading…</p>
              ) : drafts.length ? (
                drafts.map((d) => (
                  <article className="draft-row" key={d.id}>
                    <div>
                      <strong>
                        {d.kind === "short" ? "Short" : "Post"} draft
                        {d.id.startsWith("local-") ? " · local" : ""}
                      </strong>
                      <p>{d.content || "Media-only draft"}</p>
                      <small>{new Date(d.created_at).toLocaleString()}</small>
                    </div>
                    <div>
                      <button type="button" onClick={() => restoreDraft(d)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => void deleteDraft(d.id)}>
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <p className="creator-muted">
                  {user ? "No drafts yet." : "No local drafts yet — Save draft works without sign-in."}
                </p>
              )}
            </section>
          </div>

          <section className="creator-panel">
            <div className="creator-section-heading">
              <div>
                <span className="workspace-eyebrow">LIBRARY</span>
                <h2>Published</h2>
              </div>
              <span>{items.length}</span>
            </div>
            {!user ? (
              <p className="creator-muted">Sign in to load your published library from Fresh.</p>
            ) : items.length ? (
              <div className="creator-library">
                {items.slice(0, 30).map((item) => (
                  <article key={`${item.kind}-${item.id}`}>
                    <div className="creator-library-media">
                      {item.mediaUrl ? (
                        item.kind === "short" || /\.(mp4|webm|mov)(\?.*)?$/i.test(item.mediaUrl) ? (
                          <video src={item.mediaUrl} muted />
                        ) : (
                          <img src={item.mediaUrl} alt="" />
                        )
                      ) : (
                        <span>{item.kind === "short" ? "▶" : "✎"}</span>
                      )}
                    </div>
                    <div>
                      <span className="creator-kind">{item.kind}</span>
                      <strong>{item.text || "Media"}</strong>
                      <small>{new Date(item.createdAt).toLocaleString()}</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="creator-muted">Publish your first piece — it appears here from live data.</p>
            )}
          </section>
        </>
      )}

      {tab !== "publish" && (
        <CreatorProductionPanels
          tab={tab}
          analytics={analytics}
          caption={content}
          hasMedia={!!media}
          isShort={mode === "short"}
          onOpenStudio={() => setActiveRoute("studio")}
          onApplyCaption={(text) => {
            setContent(text);
            setTab("publish");
          }}
        />
      )}
    </section>
  );
}
