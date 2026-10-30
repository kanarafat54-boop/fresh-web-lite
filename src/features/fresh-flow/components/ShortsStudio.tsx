import { lazy, Suspense, useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";
import { formatCount, requestOpenShort } from "../core/shortsExplore";
import { loadStudio, rate, type StudioData } from "../core/shortsStudio";
import { timeAgo } from "../core/shortsActivity";
import "./ShortsStudio.css";

// The full creator workspace (publish, drafts, remix/duet intents) already exists; it lives under "Create & drafts".
const CreatorStudioDashboard = lazy(() => import("../../creator/CreatorStudioDashboard"));

type Tab = "overview" | "videos" | "analytics" | "earnings" | "create";
const TABS: Array<{ id: Tab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "videos", label: "Videos" },
  { id: "analytics", label: "Analytics" },
  { id: "earnings", label: "Earnings" },
  { id: "create", label: "Create & drafts" },
];

function openCreate(action: "create" | "upload") {
  try { sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify({ action, requestedAt: new Date().toISOString() })); } catch { /* ignore */ }
}

/** Shorts Studio (creator tools): real numbers from your own rows; anything without a data source says so. */
export default function ShortsStudio() {
  const { user, isGuest } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<StudioData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const signedIn = Boolean(user && !isGuest);

  useEffect(() => {
    if (!user || isGuest) { setData(null); return; }
    let cancelled = false;
    setError(null);
    loadStudio(user.id).then((result) => { if (!cancelled) setData(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load Studio."); });
    return () => { cancelled = true; };
  }, [user?.id, isGuest]);

  const create = (action: "create" | "upload") => { openCreate(action); setActiveRoute(signedIn ? "creator" : "auth-signin"); };
  const maxDay = Math.max(1, ...(data?.daily.map((d) => d.plays) ?? [1]));

  return (
    <section className="shorts-studio" aria-label="Shorts Studio">
      <header className="shorts-studio-head">
        <div><h2>Creator Studio</h2><p>Edit, publish, track.</p></div>
        <button type="button" className="shorts-studio-back" onClick={() => setActiveRoute("fresh-flow-shorts")}>‹ Shorts</button>
      </header>
      <nav className="shorts-studio-tabs" aria-label="Studio sections">
        {TABS.map((item) => <button key={item.id} type="button" className={tab === item.id ? "active" : ""} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </nav>

      {tab !== "create" && !signedIn && <p className="shorts-studio-note">Sign in to see your Studio numbers. <button type="button" onClick={() => setActiveRoute("auth-signin")}>Sign in</button></p>}
      {error && <p className="shorts-studio-note" role="alert">{error}</p>}
      {tab !== "create" && signedIn && !data && !error && <p className="shorts-studio-note">Loading Studio…</p>}

      {signedIn && data && tab === "overview" && (
        <>
          <dl className="shorts-studio-stats">
            <div><dd>{formatCount(data.shortViews)}</dd><dt>Total views</dt></div>
            <div><dd>{formatCount(data.followers)}</dd><dt>Followers</dt></div>
            <div><dd>{formatCount(data.shortLikes)}</dd><dt>Likes</dt></div>
            <div><dd>{formatCount(data.shortCount)}</dd><dt>Shorts</dt></div>
          </dl>
          <div className="shorts-studio-actions">
            <button type="button" className="primary" onClick={() => create("create")}>Create New Short</button>
            <button type="button" onClick={() => create("upload")}>Upload Video</button>
          </div>
          <h3>Recent Shorts</h3>
          {data.shorts.length === 0 ? <p className="shorts-studio-note">You haven't published a Short yet.</p> : (
            <ul className="shorts-studio-list">
              {data.shorts.slice(0, 5).map((short) => (
                <li key={short.id}><button type="button" onClick={() => { requestOpenShort(short.id); setActiveRoute("fresh-flow-shorts"); }}>
                  <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
                  <span><strong>{short.caption || "Fresh Short"}</strong><small>{formatCount(short.views)} views · {timeAgo(short.createdAt)}</small></span><span aria-hidden="true">›</span>
                </button></li>
              ))}
            </ul>
          )}
        </>
      )}

      {signedIn && data && tab === "videos" && (data.shorts.length === 0 ? <p className="shorts-studio-note">No Shorts yet.</p> : (
        <ul className="shorts-studio-list">
          {data.shorts.map((short) => (
            <li key={short.id}><button type="button" onClick={() => { requestOpenShort(short.id); setActiveRoute("fresh-flow-shorts"); }}>
              <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
              <span><strong>{short.caption || "Fresh Short"}</strong><small>{formatCount(short.views)} views · {formatCount(short.likes)} likes · {formatCount(short.comments)} comments</small></span><span aria-hidden="true">›</span>
            </button></li>
          ))}
        </ul>
      ))}

      {signedIn && data && tab === "analytics" && (
        <>
          <h3>Last 28 days</h3>
          {!data.hasWindowData ? <p className="shorts-studio-note">No watch data has been recorded for your Shorts in the last 28 days yet. Impressions, plays and completions appear here as viewers watch.</p> : (
            <>
              <dl className="shorts-studio-stats">
                <div><dd>{formatCount(data.window.impressions)}</dd><dt>Impressions</dt></div>
                <div><dd>{formatCount(data.window.plays)}</dd><dt>Plays</dt></div>
                <div><dd>{rate(data.window.completions, data.window.plays)}</dd><dt>Completion rate</dt></div>
                <div><dd>{rate(data.window.skips, data.window.plays)}</dd><dt>Skip rate</dt></div>
                <div><dd>{formatCount(data.window.saves)}</dd><dt>Saves</dt></div>
                <div><dd>{formatCount(data.window.shares)}</dd><dt>Shares</dt></div>
              </dl>
              <div className="shorts-studio-bars" role="img" aria-label="Plays per day">
                {data.daily.map((d) => <i key={d.date} style={{ height: `${Math.max(4, (d.plays / maxDay) * 100)}%` }} title={`${d.date}: ${d.plays} plays`} />)}
              </div>
            </>
          )}
        </>
      )}

      {signedIn && data && tab === "earnings" && (
        <>
          <dl className="shorts-studio-stats">
            <div><dd>{formatCount(data.giftsCount)}</dd><dt>Gifts received</dt></div>
            <div><dd>{formatCount(data.giftsMinor)}</dd><dt>Gift value (Fresh Coin, minor units)</dt></div>
          </dl>
          <p className="shorts-studio-note">Gift totals come from your Fresh wallet ledger. Payouts, ad revenue and creator-fund earnings need a connected payout service; none is connected, so no earnings figure is shown for them.</p>
        </>
      )}

      {tab === "create" && (
        <Suspense fallback={<p className="shorts-studio-note">Loading creator tools…</p>}>
          <CreatorStudioDashboard />
        </Suspense>
      )}
    </section>
  );
}
