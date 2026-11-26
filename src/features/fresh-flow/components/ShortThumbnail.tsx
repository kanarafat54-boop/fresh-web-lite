import { useEffect, useRef, useState } from "react";
import { firstFrameSrc, formatShortDuration } from "../core/shortsThumbnail";
import { BrandPlayIcon } from "./shortsIcons";
import "./shortThumbnail.css";

type Props = {
  videoUrl?: string | null;
  /** Describes the Short for assistive tech; leave empty when the row beside it already names the Short. */
  label?: string;
  className?: string;
  showDuration?: boolean;
};

/**
 * First-frame thumbnail for a Short, made from the Short's own video. Fresh stores no poster image, so this reads
 * the first frame from `video_url` instead of needing a new column or a job that renders posters.
 *
 * Videos are only attached once the tile scrolls into view, and only their metadata is fetched, so a list of 100
 * Shorts does not open 100 downloads. The duration comes from that same metadata. If the file cannot be read
 * (deleted, blocked, offline) the tile shows a plain play mark and never a broken image.
 */
export default function ShortThumbnail({ videoUrl, label = "", className = "", showDuration = true }: Props) {
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const [near, setNear] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const usable = Boolean(videoUrl && videoUrl.trim()) && !failed;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !videoUrl) return undefined;
    if (typeof IntersectionObserver === "undefined") { setNear(true); return undefined; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNear(true); observer.disconnect(); }
    }, { rootMargin: "160px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, [videoUrl]);

  useEffect(() => { setFailed(false); setDuration(null); }, [videoUrl]);

  const durationText = showDuration ? formatShortDuration(duration) : null;
  return (
    <span ref={hostRef} className={`short-thumb${className ? ` ${className}` : ""}`} role={label ? "img" : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : true}>
      {usable && near ? (
        <video
          src={firstFrameSrc(videoUrl as string)}
          preload="metadata"
          muted
          playsInline
          tabIndex={-1}
          disablePictureInPicture
          disableRemotePlayback
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onError={() => setFailed(true)}
        />
      ) : null}
      {!usable || !near ? <span className="short-thumb-fallback"><BrandPlayIcon size={20} /></span> : null}
      {durationText ? <b className="short-thumb-duration">{durationText}</b> : null}
    </span>
  );
}
