import { useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import {
  searchVideos, searchPosts, searchNews, searchWebInfo, searchPeople, searchTopics,
  type VideoResult, type PostResult, type PersonResult, type TopicResult,
} from "../core/searchService";
import type { IntelligenceResponse } from "../../ai/intelligence";
import "./FreshFlowSearchSurface.css";

type SearchTab = "videos" | "posts" | "news" | "web" | "people" | "topics";

const TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "videos", label: "Videos" },
  { id: "posts", label: "Posts" },
  { id: "news", label: "News" },
  { id: "web", label: "Web Info" },
  { id: "people", label: "People" },
  { id: "topics", label: "Topics" },
];

export default function FreshFlowSearchSurface({ onClose }: { onClose: () => void }) {
  const { setActiveRoute } = useLayout();
  const [tab, setTab] = useState<SearchTab>("videos");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [news, setNews] = useState<PostResult[]>([]);
  const [webInfo, setWebInfo] = useState<IntelligenceResponse | null>(null);
  const [people, setPeople] = useState<PersonResult[]>([]);
  const [topics, setTopics] = useState<TopicResult[]>([]);
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
