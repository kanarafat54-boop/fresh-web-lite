import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { formatCount, loadExploreSets, requestOpenShort, type ExploreSets } from "../core/shortsExplore";
import type { Short } from "../../shorts/types/short";
import "./ShortsExplore.css";

type Tab = "for-you" | "trending" | "following" | "categories";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "for-you", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "following", label: "Following" },
  { id: "categories", label: "Categories" },
];
const TOPIC_ICONS = ["✦", "◈", "◎", "❖", "✧", "◆"];

type Props = { onOpenShort: (shortId: string) => void; onSearchTopic: (tag: string) => void };

function Thumb({ short, onOpen }: { short: Short; onOpen: (id: string) => void }) {
  return (
    <button type="button" className="shorts-explore-card" onClick={() => { requestOpenShort(short.id); onOpen(short.id); }} aria-label={`Open Short: ${short.caption || "Fresh Short"}`}>
      <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
      <strong>{short.caption || "Fresh Short"}</strong>
      <small>▷ {formatCount(short.viewCount)} · @{short.authorUsername}</small>
    </button>
  );
}

/** Explore home for Fresh Shorts (shown in search before a query). Real Shorts and real caption topics only. */
export default function ShortsExplore({ onOpenShort, onSearchTopic }: Props) {
  const { user, isGuest } = useFreshId();
  const [tab, setTab] = useState<Tab>("for-you");
  const [sets, setSets] = useState<ExploreSets | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadExploreSets(user?.id ?? null, isGuest).then((result) => { if (!cancelled) setSets(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load Explore."); });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);

  const topicGrid = (limit?: number) => sets && sets.topics.length > 0 ? (
    <div className="shorts-explore-topics">
      {sets.topics.slice(0, limit).map((topic, index) => (
        <button key={topic.tag} type="button" onClick={() => onSearchTopic(topic.tag)}>
          <span aria-hidden="true">{TOPIC_ICONS[index % TOPIC_ICONS.length]}</span> #{topic.tag}
        </button>
      ))}
    </div>
  ) : <p className="shorts-explore-note">Topics appear here once several Shorts share the same words or hashtags.</p>;

  return (
    <section className="shorts-explore" aria-label="Explore Fresh Shorts">
      <nav className="shorts-explore-tabs" aria-label="Explore sections">
        {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>
      {error && <p className="shorts-explore-note" role="alert">{error}</p>}
      {!sets && !error && <p className="shorts-explore-note">Loading Explore…</p>}
      {sets && tab === "for-you" && (
        <>
          <h3>Trending Now</h3>
          {sets.trending.length === 0 ? <p className="shorts-explore-note">No Shorts to show yet.</p> : (
            <div className="shorts-explore-row">{sets.trending.slice(0, 8).map((s) => <Thumb key={s.id} short={s} onOpen={onOpenShort} />)}</div>
          )}
          <h3>Explore Categories</h3>
          {topicGrid(6)}
        </>
      )}
      {sets && tab === "trending" && (sets.trending.length === 0 ? <p className="shorts-explore-note">Nothing is trending yet.</p> : <div className="shorts-explore-grid">{sets.trending.map((s) => <Thumb key={s.id} short={s} onOpen={onOpenShort} />)}</div>)}
      {sets && tab === "following" && (isGuest || !user
        ? <p className="shorts-explore-note">Sign in to see Shorts from creators you follow.</p>
        : sets.following.length === 0 ? <p className="shorts-explore-note">Follow creators to fill this tab.</p> : <div className="shorts-explore-grid">{sets.following.map((s) => <Thumb key={s.id} short={s} onOpen={onOpenShort} />)}</div>)}
      {sets && tab === "categories" && topicGrid()}
    </section>
  );
}
