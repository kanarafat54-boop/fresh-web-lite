import { useEffect, useState } from "react";
import { loadShortAudience, SHORT_AUDIENCE_OPTIONS, setShortAudience, type ShortAudience } from "../core/shortsAudienceService";
import ShortThumbnail from "./ShortThumbnail";
import ShortsBottomSheet from "./ShortsBottomSheet";
import ShortsInfoStrip from "./ShortsInfoStrip";
import { GlobeIcon, LockIcon } from "./shortsIcons";
import "./shortsYourShort.css";

type Props = {
  userId: string;
  shortId: string;
  videoUrl: string;
  caption: string;
  viewCount: number;
  allowDownload: boolean;
  onToggleDownload: () => void;
  onAddToCollection: () => void;
  onClose: () => void;
};

/** The creator's own controls for one Short: who can watch it, downloads, and collections. */
export default function ShortsYourShortSheet({ userId, shortId, videoUrl, caption, viewCount, allowDownload, onToggleDownload, onAddToCollection, onClose }: Props) {
  const [audience, setAudience] = useState<ShortAudience | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadShortAudience(shortId).then((value) => { if (!cancelled) setAudience(value); });
    return () => { cancelled = true; };
  }, [shortId]);

  async function choose(next: ShortAudience) {
    if (saving || next === audience) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const saved = await setShortAudience(userId, shortId, next);
      setAudience(saved);
      setMessage(saved === "public" ? "Anyone can watch this Short." : saved === "followers" ? "Only your followers can watch this Short." : "Only you can watch this Short.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fresh could not save that. Try again.");
    } finally { setSaving(false); }
  }

  return (
    <ShortsBottomSheet title="Your Short" onClose={onClose} className="shorts-your-short">
      <div className="shorts-your-short-summary">
        <ShortThumbnail videoUrl={videoUrl} showDuration={false} className="shorts-your-short-thumb" />
        <div><strong>{caption.trim() || "Untitled Short"}</strong><span>{viewCount.toLocaleString()} {viewCount === 1 ? "view" : "views"}</span></div>
      </div>

      <h4>Who can watch</h4>
      <div className="shorts-your-short-audience" role="radiogroup" aria-label="Who can watch this Short">
        {SHORT_AUDIENCE_OPTIONS.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={audience === option.id} disabled={saving || audience === null} className={audience === option.id ? "active" : ""} onClick={() => void choose(option.id)}>
            {option.id === "public" ? <GlobeIcon size={18} /> : <LockIcon size={18} />}
            <strong>{option.label}</strong>
            <small>{option.hint}</small>
          </button>
        ))}
      </div>
      {message ? <p role="status">{message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      <div className="shorts-your-short-row">
        <div><strong>Allow downloads</strong><span>Viewers can use Fresh's official download action.</span></div>
        <button type="button" role="switch" aria-checked={allowDownload} onClick={onToggleDownload}>{allowDownload ? "On" : "Off"}</button>
      </div>
      <button type="button" className="shorts-your-short-link" onClick={onAddToCollection}>Add to Collection</button>
      <ShortsInfoStrip kind="notice">Followers-only and Only me hide this Short from the feed, search and your profile for everyone else. You always see your own Shorts.</ShortsInfoStrip>
    </ShortsBottomSheet>
  );
}
