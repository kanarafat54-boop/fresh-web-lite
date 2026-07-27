/**
 * Fresh Web Lite
 * Video Trimmer — client-side trim via MediaRecorder re-capture
 */

import { useEffect, useRef, useState } from "react";

interface VideoTrimmerProps {
  file: File;
  onCancel: () => void;
  onTrimmed: (trimmedFile: File) => void;
}

export function VideoTrimmer({ file, onCancel, onTrimmed }: VideoTrimmerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sourceUrl] = useState(() => URL.createObjectURL(file));
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setEnd(video.duration);
  }

  async function applyTrim() {
    const video = videoRef.current;
    if (!video) return;

    if (end - start < 0.5) {
      setError("Trimmed clip must be at least half a second.");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const stream = (video as any).captureStream
        ? (video as any).captureStream()
        : (video as any).mozCaptureStream();

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      video.currentTime = start;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });

      recorder.start();
      await video.play();

      const durationMs = (end - start) * 1000;
      await new Promise((resolve) => setTimeout(resolve, durationMs));

      video.pause();
      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: "video/webm" });
      const trimmedFile = new File([blob], `trimmed-${Date.now()}.webm`, { type: "video/webm" });

      setProcessing(false);
      onTrimmed(trimmedFile);
    } catch (err: any) {
      setError(`Trim failed: ${err.message ?? "unknown error"}`);
      setProcessing(false);
    }
  }

  return (
    <div className="comment-panel-backdrop" onClick={onCancel}>
      <div className="comment-panel trimmer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Trim Video</h3>
          <button className="back-btn" onClick={onCancel}>✕</button>
        </div>

        <video
          ref={videoRef}
          src={sourceUrl}
          onLoadedMetadata={handleLoadedMetadata}
          controls
          muted={false}
          className="video-preview"
        />

        {duration > 0 && (
          <div className="trim-controls">
            <label>
              Start: {start.toFixed(1)}s
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={start}
                onChange={(e) => {
                  const v = Math.min(Number(e.target.value), end - 0.5);
                  setStart(v);
                  if (videoRef.current) videoRef.current.currentTime = v;
                }}
              />
            </label>
            <label>
              End: {end.toFixed(1)}s
              <input
                type="range"
                min={0}
                max={duration}
                step={0.1}
                value={end}
                onChange={(e) => {
                  const v = Math.max(Number(e.target.value), start + 0.5);
                  setEnd(v);
                }}
              />
            </label>
            <p className="empty-state">Selected length: {(end - start).toFixed(1)}s</p>
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="add-note-btn" onClick={applyTrim} disabled={processing || duration === 0}>
          {processing ? "Trimming..." : "Apply Trim"}
        </button>
      </div>
    </div>
  );
}
