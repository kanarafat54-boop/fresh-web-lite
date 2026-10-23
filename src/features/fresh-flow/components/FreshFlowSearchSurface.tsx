import { useEffect, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import {
  searchVideos, searchPosts, searchNews, searchWebInfo, searchPeople, searchTopics, searchExternalImages, searchArchiveVideos,
  type VideoResult, type PostResult, type PersonResult, type TopicResult, type ExternalImageResult, type ArchiveVideoResult,
} from "../core/searchService";
import type { IntelligenceResponse } from "../../ai/intelligence";
import "./FreshFlowSearchSurface.css";

type SearchTab = "videos" | "posts" | "news" | "web" | "images" | "archive-videos" | "people" | "topics";

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "videos", label: "Videos" },
  { id: "posts", label: "Posts" },
  { id: "news", label: "News" },
  { id: "web", label: "Web Info" },
  { id: "images", label: "Images" },
  { id: "archive-videos", label: "Archive Videos" },
  { id: "people", label: "People" },
  { id: "topics", label: "Topics" },
];

type FreshFlowSearchSurfaceProps = {
  onClose: () => void;
  initialTab?: SearchTab;
  initialQuery?: string;
};

export default function FreshFlowSearchSurface({ onClose, initialTab, initialQuery }: FreshFlowSearchSurfaceProps) {
  const { setActiveRoute } = useLayout();
  const [tab, setTab] = useState<SearchTab>(initialTab ?? "videos");
  const [query, setQuery] = useState(initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [news, setNews] = useState<PostResult[]>([]);
  const [webInfo, setWebInfo] = useState<IntelligenceResponse | null>(null);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [topics, setTopics] = useState<TopicResult[]>([]);
  const [images, setImages] = useState<ExternalImageResult[]>([]);
  const [archiveVideos, setArchiveVideos] = useState<ArchiveVideoResult[]>([]);
  const [searched, setSearched] = useState(false);

  const run = async (activeTab: SearchTab, q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      if (activeTab === "videos") setVideos(await searchVideos(q));
      else if (activeTab === "posts") setPosts(await searchPosts(q));
      else if (activeTab === "news") setNews(await searchNews(q));
      else if (activeTab === "web") setWebInfo(await searchWebInfo(q));
      else if (activeTab === "images") setImages(await searchExternalImages(q));
      else if (activeTab === "archive-videos") setArchiveVideos(await searchArchiveVideos(q));
      else if (activeTab === "people") setPeople(await searchPeople(q));
      else if (activeTab === "topics") setTopics(await searchTopics(q));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  const selectTab = (next: SearchTab) => {
    setTab(next);
    if (query.trim()) void run(next, query);
  };

  useEffect(() => {
    if (initialQuery?.trim()) void run(initialTab ?? "videos", initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fresh-flow-search-surface" role="dialog" aria-modal="true" aria-label="Fresh search">
      <header className="fresh-flow-search-header">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void run(tab, query)}
          placeholder="Search anything on Fresh..."
          aria-label="Search anything on Fresh"
        />
        <button onClick={() => void run(tab, query)} aria-label="Search">⌕</button>
        <button onClick={onClose} aria-label="Close search">×</button>
      </header>

      <nav className="fresh-flow-search-tabs" aria-label="Search categories">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`fresh-flow-search-tab ${tab === item.id ? "active" : ""} ${item.id === "videos" ? "dominant" : ""}`}
            onClick={() => selectTab(item.id)}
            aria-pressed={tab === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="fresh-flow-search-results">
        {loading && <p className="fresh-flow-empty">Searching…</p>}
        {error && <p className="fresh-flow-empty" role="alert">{error}</p>}
        {!loading && !error && searched && tab === "videos" && (
          videos.length === 0 ? <p className="fresh-flow-empty">No videos found.</p> : (
            <div className="fresh-flow-search-video-grid">
              {videos.map((v) => (
                <button key={v.id} className="fresh-flow-search-video-card" onClick={() => { setActiveRoute("fresh-flow"); onClose(); }}>
                  <video src={v.videoUrl} muted />
                  <div><strong>{v.authorName}</strong><p>{v.caption}</p><small>{v.likeCount} likes</small></div>
                </button>
              ))}
            </div>
          )
        )}
        {!loading && !error && searched && tab === "posts" && (
          posts.length === 0 ? <p className="fresh-flow-empty">No posts found.</p> : (
            <ul className="fresh-flow-search-list">
              {posts.map((p) => <li key={p.id}><strong>{p.authorName}</strong><p>{p.content}</p></li>)}
            </ul>
          )
        )}
        {!loading && !error && searched && tab === "news" && (
          news.length === 0 ? <p className="fresh-flow-empty">No results found.</p> : (
            <ul className="fresh-flow-search-list">
              {news.map((p) => <li key={p.id}><strong>{p.authorName}</strong><p>{p.content}</p></li>)}
            </ul>
          )
        )}
        {!loading && !error && searched && tab === "web" && webInfo && (
          <div className="fresh-flow-search-web">
            <p>{webInfo.text}</p>
            {webInfo.sources?.map((s) => (
              <a key={`${s.url}-${s.title}`} href={s.url} target="_blank" rel="noreferrer">
                <span>{s.title}</span>{s.snippet && <small>{s.snippet}</small>}
              </a>
            ))}
          </div>
        )}
        {!loading && !error && searched && tab === "images" && (
          images.length === 0 ? <p className="fresh-flow-empty">No matching Wikimedia Commons images found. Try a broader search.</p> : (
            <section className="fresh-flow-external-media">
              <p className="fresh-flow-provider-note">Images from Wikimedia Commons. Open each source page for creator and license details.</p>
              <div className="fresh-flow-image-grid">
                {images.map((item) => (
                  <article className="fresh-flow-image-card" key={item.sourceUrl}>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source page for ${item.title}`}>
                      <img src={item.thumbnailUrl} alt={item.description || item.title} loading="lazy" />
                    </a>
                    <div><strong>{item.title}</strong><small>{item.author} · {item.license}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source and license</a></div>
                  </article>
                ))}
              </div>
            </section>
          )
        )}
        {!loading && !error && searched && tab === "archive-videos" && (
          archiveVideos.length === 0 ? <p className="fresh-flow-empty">No playable Internet Archive videos found. Try another query.</p> : (
            <section className="fresh-flow-external-media">
              <p className="fresh-flow-provider-note">Playable video files from the Internet Archive. This is a focused archive index, not the entire public video web.</p>
              <div className="fresh-flow-archive-video-list">
                {archiveVideos.map((item) => (
                  <article className="fresh-flow-archive-video-card" key={item.id}>
                    <video controls preload="metadata" poster={item.thumbnailUrl} src={item.videoUrl} />
                    <div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}<small>{item.creator}{item.date ? ` · ${item.date}` : ""} · Internet Archive</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source record</a></div>
                  </article>
                ))}
              </div>
            </section>
          )
        )}
        {!loading && !error && searched && tab === "people" && (
          people.length === 0 ? <p className="fresh-flow-empty">No people found.</p> : (
            <ul className="fresh-flow-search-list">
              {people.map((p) => <li key={p.id}><strong>{p.fullName || p.username}</strong><small>@{p.username}</small></li>)}
            </ul>
          )
        )}
        {!loading && !error && searched && tab === "topics" && (
          topics.length === 0 ? <p className="fresh-flow-empty">No matching topics found.</p> : (
            <ul className="fresh-flow-search-list">
              {topics.map((t, i) => <li key={`${t.sourceKind}-${t.sourceId}-${i}`}><strong>#{t.tag}</strong><p>{t.sampleCaption}</p></li>)}
            </ul>
          )
        )}
        {!searched && <p className="fresh-flow-empty">Search Videos, Posts, News, Web Info, People and Topics across Fresh.</p>}
      </div>
    </div>
  );
}
