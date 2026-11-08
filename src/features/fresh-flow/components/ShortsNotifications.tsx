import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { ACTIVITY_TABS, loadShortsActivity, matchesTab, timeAgo, type ActivityItem, type ActivityKind, type ActivityTab } from "../core/shortsActivity";
import { requestOpenShort } from "../core/shortsExplore";
import { NOTIFICATION_CATEGORIES, applyState, clearAll, markAllRead, markRead, setCategoryEnabled, unreadCount, EMPTY_STATE, type NotificationState } from "../core/notificationState";
import { loadNotificationState, saveNotificationState, type StateSource } from "../core/notificationStateStore";
import "./ShortsNotifications.css";

const ICON: Record<ActivityKind, string> = { like: "❤", comment: "💬", reply: "↩", reaction: "✦", mention: "@", moderation: "⚑", "creator-update": "▶", repost: "🔁", remix: "✂", follow: "＋", gift: "🎁", system: "🔔" };

type Props = { onClose: () => void; onOpenCreator: (authorId: string) => void };

/** Notifications for Fresh Shorts, built from real activity on your Shorts (likes, comments, replies, reposts, remixes, follows, gifts) and your account notifications. */
export default function ShortsNotifications({ onClose, onOpenCreator }: Props) {
  const { user, isGuest } = useFreshId();
  const { setActiveRoute, openNotifications } = useLayout();
  const [tab, setTab] = useState<ActivityTab>("all");
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<NotificationState>(EMPTY_STATE);
  const [source, setSource] = useState<StateSource>("device");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [stateReady, setStateReady] = useState(false);

  useEffect(() => {
    if (!user || isGuest) { setItems([]); return; }
    let cancelled = false;
    loadNotificationState(user.id).then((loaded) => { if (!cancelled) { setState(loaded.state); setSource(loaded.source); setStateReady(true); } }).catch(() => { if (!cancelled) setStateReady(true); /* state falls back to empty; the feed still shows */ });
    loadShortsActivity(user.id).then((result) => { if (!cancelled) setItems(result); }).catch((cause) => { if (!cancelled) { setError(cause instanceof Error ? cause.message : "Could not load notifications."); setItems([]); } });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);

  const shown = applyState(items ?? [], state);
  const visible = shown.filter((item) => matchesTab(item.kind, tab));
  const unread = unreadCount(shown);

  const update = (next: NotificationState) => {
    if (!stateReady) return;
    setState(next);
    if (user) void saveNotificationState(user.id, next, source).then((where) => setSource(where));
  };

  const open = (item: ActivityItem) => {
    update(markRead(state, item.id));
    if (item.shortId) { requestOpenShort(item.shortId); onClose(); return; }
    if (item.kind === "follow" && item.actorId) { onClose(); onOpenCreator(item.actorId); }
  };

  return (
    <div className="shorts-notify" role="dialog" aria-modal="true" aria-label="Notifications">
      <header className="shorts-notify-bar">
        <button type="button" onClick={onClose} aria-label="Back to Shorts">←</button>
        <strong>Notifications{unread > 0 ? ` (${unread})` : ""}</strong>
        <button type="button" className="shorts-notify-all" onClick={() => { onClose(); openNotifications(); }} aria-label="Open all Fresh notifications">All apps</button>
      </header>
      {!isGuest && user ? (
        <div className="shorts-notify-actions">
          <button type="button" disabled={!stateReady || unread === 0} onClick={() => update(markAllRead(state, new Date(Math.max(Date.now(), ...(items ?? []).map((item) => Date.parse(item.at))))))}>Mark all read</button>
          <button type="button" disabled={!stateReady || shown.length === 0} onClick={() => update(clearAll(state, new Date(Math.max(Date.now(), ...(items ?? []).map((item) => Date.parse(item.at))))))}>Clear</button>
          <button type="button" aria-expanded={prefsOpen} onClick={() => setPrefsOpen((open) => !open)}>Preferences</button>
        </div>
      ) : null}
      {prefsOpen && !isGuest && user ? (
        <section className="shorts-notify-prefs" aria-label="Notification preferences">
          <p>Choose which categories appear here. This hides them from this list; it does not change what others can do.</p>
          {NOTIFICATION_CATEGORIES.map((category) => (
            <label key={category}>
              <input type="checkbox" checked={!state.disabledCategories.includes(category)} onChange={(event) => update(setCategoryEnabled(state, category, event.target.checked))} />
              {ACTIVITY_TABS.find((t) => t.id === category)?.label}
            </label>
          ))}
          <p className="shorts-notify-note">{source === "account" ? "Saved to your account." : "Saved on this device only for now. It will not follow you to another device until Fresh finishes setting up notification storage."}</p>
        </section>
      ) : null}
      <nav className="shorts-notify-tabs" aria-label="Notification types">
        {ACTIVITY_TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>
      <div className="shorts-notify-list">
        {error && <p className="shorts-notify-note" role="alert">{error}</p>}
        {items === null && <p className="shorts-notify-note">Loading…</p>}
        {items !== null && (isGuest || !user) && <p className="shorts-notify-note">Sign in to see likes, comments and follows on your Shorts. <button type="button" className="shorts-notify-link" onClick={() => { onClose(); setActiveRoute("auth-signin"); }}>Sign in</button></p>}
        {items !== null && !isGuest && user && visible.length === 0 && !error && <p className="shorts-notify-note">{(items ?? []).length > 0 && shown.length === 0 ? "You cleared your notifications. New activity will appear here." : tab === "all" ? "No activity on your Shorts yet." : "Nothing here yet."}</p>}
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
