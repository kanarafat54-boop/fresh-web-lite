import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { loadShortsActivity, timeAgo, type ActivityItem, type ActivityKind } from "../core/shortsActivity";
import { requestOpenShort } from "../core/shortsExplore";
import "./ShortsNotifications.css";

type Tab = "all" | "like" | "comment" | "follow" | "gift";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "all", label: "All" },
  { id: "like", label: "Likes" },
  { id: "comment", label: "Comments" },
  { id: "follow", label: "Follows" },
  { id: "gift", label: "Gifts" },
];
const ICON: Record<ActivityKind, string> = { like: "❤", comment: "💬", follow: "＋", gift: "🎁", system: "🔔" };

type Props = { onClose: () => void; onOpenCreator: (authorId: string) => void };

/** Notifications for Fresh Shorts, built from real activity on your Shorts (likes, comments, follows, gifts) and your account notifications. */
export default function ShortsNotifications({ onClose, onOpenCreator }: Props) {
  const { user, isGuest } = useFreshId();
  const { setActiveRoute, openNotifications } = useLayout();
  const [tab, setTab] = useState<Tab>("all");
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isGuest) { setItems([]); return; }
    let cancelled = false;
    loadShortsActivity(user.id).then((result) => { if (!cancelled) setItems(result); }).catch((cause) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not load notifications."); setItems([]); } });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);

  const visible = (items ?? []).filter((item) => tab === "all" || item.kind === tab);

  const open = (item: ActivityItem) => {
    if (item.shortId) { requestOpenShort(item.shortId); onClose(); return; }
    if (item.kind === "follow" && item.actorId) { onClose(); onOpenCreator(item.actorId); }
  };

  return (
    <div className="shorts-notify" role="dialog" aria-modal="true" aria-label="Notifications">
      <header className="shorts-notify-bar">
        <button type="button" onClick={onClose} aria-label="Back to Shorts">←</button>
        <strong>Notifications</strong>
        <button type="button" className="shorts-notify-all" onClick={() => { onClose(); openNotifications(); }} aria-label="Open all Fresh notifications">All apps</button>
      </header>
      <nav className="shorts-notify-tabs" aria-label="Notification types">
        {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>
      <div className="shorts-notify-list">
        {error && <p className="shorts-notify-note" role="alert">{error}</p>}
        {items === null && <p className="shorts-notify-note">Loading…</p>}
        {items !== null && (isGuest || !user) && <p className="shorts-notify-note">Sign in to see likes, comments and follows on your Shorts. <button type="button" className="shorts-notify-link" onClick={() => { onClose(); setActiveRoute("auth-signin"); }}>Sign in</button></p>}
        {items !== null && !isGuest && user && visible.length === 0 && !error && <p className="shorts-notify-note">{tab === "all" ? "No activity on your Shorts yet." : "Nothing here yet."}</p>}
        <ul>
          {visible.map((item) => {
            const actionable = Boolean(item.shortId) || (item.kind === "follow" && Boolean(item.actorId));
            return (
              <li key={item.id} className={item.unread ? "unread" : ""}>
                <button type="button" disabled={!actionable} onClick={() => open(item)}>
                  <span className={`shorts-notify-icon ${item.kind}`} aria-hidden="true">{ICON[item.kind]}</span>
                  <span className="shorts-notify-text">
                    <strong>{item.text}</strong>
                    {item.detail && <em>{item.detail}</em>}
                    <small>{timeAgo(item.at)}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
