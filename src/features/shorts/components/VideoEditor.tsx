/**
 * Fresh Web Lite
 * Video Editor — rotate, mirror, speed, reverse, text overlay
 * Renders via canvas + MediaRecorder to bake effects into a new file.
 * Note: reverse is frame-stepped (lower frame rate) — a real browser limitation,
 * not a bug, since HTML5 video can't play backwards natively.
 */

import { useRef, useState } from "react";
import { RotateIcon, FlipHorizontalIcon, GaugeIcon, RewindIcon, TypeIcon, CloseIcon } from "../../../components/Icons";

interface VideoEditorProps {
  file: File;
  onCancel: () => void;
  onEdited: (file: File) => void;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export function VideoEditor({ file, onCancel, onEdited }: VideoEditorProps) {
  const [sourceUrl] = useState(() => URL.createObjectURL(file));
  const [rotation, setRotation] = useState(0);
  const [mirrored, setMirrored] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [reverse, setReverse] = useState(false);
  const [overlayText, setOverlayText] = useState("");
  const [overlayPos, setOverlayPos] = useState<"top" | "center" | "bottom">("bottom");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  function previewTransform() {
    let t = `rotate(${rotation}deg)`;
    if (mirrored) t += " scaleX(-1)";
    return t;
  }

  function drawFrame(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, w: number, h: number) {
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (mirrored) ctx.scale(-1, 1);

    const drawW = rotation % 180 === 0 ? w : h;
    const drawH = rotation % 180 === 0 ? h : w;
    ctx.drawImage(video, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    if (overlayText.trim()) {
      ctx.font = `bold ${Math.round(w / 14)}px sans-serif`;
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 4;
      ctx.textAlign = "center";
      const y = overlayPos === "top" ? h * 0.12 : overlayPos === "center" ? h / 2 : h * 0.88;
      ctx.strokeText(overlayText, w / 2, y);
      ctx.fillText(overlayText, w / 2, y);
    }
  }

  async function applyEdits() {
    const video = videoRef.current;
    if (!video) return;

    setProcessing(true);
    setError(null);
    setProgress(0);

    try {
      const canvas = document.createElement("canvas");
      const isSideways = rotation % 180 !== 0;
      canvas.width = isSideways ? video.videoHeight : video.videoWidth;
      canvas.height = isSideways ? video.videoWidth : video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      if (reverse) {
        const totalDuration = video.duration;
        const stepSec = 1 / 12; // 12fps sampling for reverse
        let t = totalDuration;
        while (t >= 0) {
          video.currentTime = t;
          await new Promise<void>((resolve) => {
            video.onseeked = () => resolve();
          });
          drawFrame(ctx, video, canvas.width, canvas.height);
          setProgress(Math.round((1 - t / totalDuration) * 100));
          await new Promise((r) => setTimeout(r, (stepSec * 1000) / speed));
          t -= stepSec;
        }
      } else {
        video.currentTime = 0;
        video.playbackRate = speed;
        await video.play();

        await new Promise<void>((resolve) => {
          function frameLoop() {
            if (video.ended || video.paused) {
              resolve();
              return;
            }
            drawFrame(ctx, video, canvas.width, canvas.height);
            setProgress(Math.round((video.currentTime / video.duration) * 100));
            requestAnimationFrame(frameLoop);
          }
          frameLoop();
        });
      }

      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: "video/webm" });
      const editedFile = new File([blob], `edited-${Date.now()}.webm`, { type: "video/webm" });

      setProcessing(false);
      onEdited(editedFile);
    } catch (err: any) {
      setError(`Edit failed: ${err.message ?? "unknown error"}`);
      setProcessing(false);
    }
  }

  return (
    <div className="comment-panel-backdrop" onClick={onCancel}>
      <div className="comment-panel video-editor-panel" onClick={(e) => e.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Edit Video</h3>
          <button className="back-btn" onClick={onCancel}><CloseIcon size={20} /></button>
        </div>

        <div className="editor-preview-wrap">
          <video
            ref={videoRef}
            src={sourceUrl}
            muted
            playsInline
            className="editor-preview-video"
            style={{ transform: previewTransform() }}
          />
          {overlayText.trim() && (
            <div className={`editor-text-overlay pos-${overlayPos}`}>{overlayText}</div>
          )}
        </div>

        <div className="editor-controls">
          <button className="icon-btn-outline" onClick={() => setRotation((r) => (r + 90) % 360)}>
            <RotateIcon size={16} /> Rotate
          </button>
          <button className="icon-btn-outline" onClick={() => setMirrored((m) => !m)}>
            <FlipHorizontalIcon size={16} /> {mirrored ? "Unmirror" : "Mirror"}
          </button>
          <button className="icon-btn-outline" onClick={() => setReverse((r) => !r)}>
            <RewindIcon size={16} /> {reverse ? "Reverse: On" : "Reverse: Off"}
          </button>
        </div>

        <div className="editor-speed-row">
          <GaugeIcon size={16} />
          {SPEEDS.map((s) => (
            <button
              key={s}
              className={speed === s ? "quick-reaction-chip speed-active" : "quick-reaction-chip"}
              onClick={() => setSpeed(s)}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="editor-text-row">
          <TypeIcon size={16} />
          <input
            type="text"
            value={overlayText}
            onChange={(e) => setOverlayText(e.target.value)}
            placeholder="Add text overlay..."
            className="auth-input"
          />
        </div>
        {overlayText.trim() && (
          <div className="editor-controls">
            {(["top", "center", "bottom"] as const).map((pos) => (
              <button
                key={pos}
                className={overlayPos === pos ? "quick-reaction-chip speed-active" : "quick-reaction-chip"}
                onClick={() => setOverlayPos(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="add-note-btn" onClick={applyEdits} disabled={processing}>
          {processing ? `Processing... ${progress}%` : "Apply Edits"}
        </button>
      </div>
    </div>
  );
}
