import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { publishFreshShort } from "../../creator/core/publishFreshShort";
import { markFeedRefresh } from "../../creator/core/createIntent";
import "./ShortsCreateCamera.css";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_SECONDS = 60;
const ALLOWED = ["video/mp4", "video/webm", "video/quicktime"];
const FILTERS: Array<{ id: string; label: string; css: string }> = [
  { id: "none", label: "Normal", css: "none" },
  { id: "warm", label: "Warm", css: "sepia(.35) saturate(1.3) brightness(1.05)" },
  { id: "cool", label: "Cool", css: "hue-rotate(185deg) saturate(1.1)" },
  { id: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { id: "vivid", label: "Vivid", css: "saturate(1.6) contrast(1.08)" },
];
const BEAUTY_CSS = "blur(.6px) brightness(1.06) contrast(.96) saturate(1.05)";

type Props = { initialMode?: "create" | "camera"; onClose: () => void; onOpenTemplates: () => void };
type Panel = "none" | "filters";

/**
 * Create Short (design screen 5). Records with the device camera into a canvas so Filters and Beauty are baked
 * into the saved file, or takes an uploaded video, then publishes through the canonical Shorts write path.
 */
export default function ShortsCreateCamera({ initialMode = "create", onClose, onOpenTemplates }: Props) {
  const { user, isGuest } = useFreshId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const rafRef = useRef(0);
  const settingsRef = useRef({ filter: "none", beauty: false });
  const tickRef = useRef<number | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [filter, setFilter] = useState("none");
  const [beauty, setBeauty] = useState(false);
  const [timer, setTimer] = useState<0 | 3 | 10>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>("none");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { settingsRef.current = { filter, beauty }; }, [filter, beauty]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError("Camera is not available in this browser. Use Upload instead."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing }, width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => undefined);
      const draw = () => {
        const canvas = canvasRef.current;
        if (canvas && video.videoWidth) {
          if (canvas.width !== video.videoWidth) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; }
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const { filter: f, beauty: b } = settingsRef.current;
            const css = [FILTERS.find((item) => item.id === f)?.css ?? "none", b ? BEAUTY_CSS : ""].filter((part) => part && part !== "none").join(" ");
            ctx.filter = css || "none";
            if (facing === "user") { ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); ctx.drawImage(video, 0, 0); ctx.restore(); }
            else ctx.drawImage(video, 0, 0);
          }
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (cause) {
      setCameraError(cause instanceof Error && cause.name === "NotAllowedError" ? "Camera access was blocked. Allow it in your browser, or use Upload." : "Could not open the camera. Use Upload instead.");
    }
  }, [facing, stopCamera]);

  useEffect(() => {
    if (file) return undefined;
    void startCamera();
    return stopCamera;
  }, [file, startCamera, stopCamera]);

  useEffect(() => () => { stopCamera(); if (tickRef.current) window.clearInterval(tickRef.current); }, [stopCamera]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const takeFile = (next: File | null | undefined) => {
    if (!next) return;
    if (!ALLOWED.includes(next.type)) { setMessage("Use an MP4, WebM or QuickTime video."); return; }
    if (next.size > MAX_BYTES) { setMessage("This free storage project supports videos up to 50 MiB. Choose a smaller video."); return; }
    setMessage(null);
    stopCamera();
    setFile(next);
    setPreviewUrl(URL.createObjectURL(next));
  };

  const finishRecording = () => {
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const beginRecording = () => {
    const canvas = canvasRef.current;
    const stream = streamRef.current;
    if (!canvas || !stream || typeof MediaRecorder === "undefined") { setMessage("Recording is not supported here. Use Upload instead."); return; }
    const out = canvas.captureStream(30);
    stream.getAudioTracks().forEach((track) => out.addTrack(track));
    const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"].find((type) => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(out, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
    recorder.onstop = () => {
      const type = (recorder.mimeType || "video/webm").split(";")[0];
      takeFile(new File([new Blob(chunksRef.current, { type })], `short-${Date.now()}.${type.includes("mp4") ? "mp4" : "webm"}`, { type }));
    };
    recorderRef.current = recorder;
    recorder.start(250);
    setSeconds(0);
    setRecording(true);
    tickRef.current = window.setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= MAX_SECONDS) { finishRecording(); return MAX_SECONDS; }
        return value + 1;
      });
    }, 1000);
  };

  const onRecordPress = () => {
    if (recording) { finishRecording(); return; }
    if (countdown !== null) return;
    if (!timer) { beginRecording(); return; }
    let left: number = timer;
    setCountdown(left);
    const id = window.setInterval(() => {
      left -= 1;
      if (left <= 0) { window.clearInterval(id); setCountdown(null); beginRecording(); } else setCountdown(left);
    }, 1000);
  };

  const discard = () => { setFile(null); setPreviewUrl(null); setCaption(""); setMessage(null); };

  const publish = async () => {
    if (!file) return;
    if (!user || isGuest) { setMessage("Sign in with Fresh ID to publish a Short."); return; }
    setPublishing(true);
    setMessage(null);
    try {
      const path = `${user.id}/short-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("post-videos").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("post-videos").getPublicUrl(path);
      const short = await publishFreshShort({ authorId: user.id, caption, videoUrl: data.publicUrl });
      markFeedRefresh(short.id);
      onClose();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not publish the Short.");
    } finally {
      setPublishing(false);
    }
  };

  const cycleTimer = () => setTimer((value) => (value === 0 ? 3 : value === 3 ? 10 : 0));
  const mm = `0:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="shorts-create" role="dialog" aria-modal="true" aria-label="Create Short" data-intent={initialMode}>
      <button type="button" className="shorts-create-close" onClick={() => { stopCamera(); onClose(); }} aria-label="Close">✕</button>
      {file && previewUrl ? (
        <div className="shorts-create-review">
          <video src={previewUrl} controls playsInline loop autoPlay muted className="shorts-create-stage" />
          <div className="shorts-create-form">
            <input value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} placeholder="Describe your Short… #hashtags" aria-label="Caption" />
            <div className="shorts-create-form-actions">
              <button type="button" onClick={discard} disabled={publishing}>Retake</button>
              <button type="button" className="primary" onClick={() => void publish()} disabled={publishing}>{publishing ? "Publishing…" : "Publish Short"}</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <video ref={videoRef} className="shorts-create-source" muted playsInline />
          <canvas ref={canvasRef} className="shorts-create-stage" />
          {cameraError && <p className="shorts-create-note" role="alert">{cameraError}</p>}
          {countdown !== null && <div className="shorts-create-countdown" aria-live="assertive">{countdown}</div>}
          {recording && <div className="shorts-create-rec" aria-live="polite">● {mm}</div>}
          <div className="shorts-create-tools" aria-label="Camera tools">
            <button type="button" onClick={() => setFacing((value) => (value === "user" ? "environment" : "user"))} disabled={recording}><span aria-hidden="true">⟲</span>Flip</button>
            <button type="button" disabled title="Needs the video worker connection to re-time footage"><span aria-hidden="true">⏲</span>Speed</button>
            <button type="button" onClick={() => setPanel((value) => (value === "filters" ? "none" : "filters"))} aria-pressed={panel === "filters" || filter !== "none"}><span aria-hidden="true">✺</span>Filters</button>
            <button type="button" onClick={() => setBeauty((value) => !value)} aria-pressed={beauty}><span aria-hidden="true">✦</span>Beauty</button>
            <button type="button" onClick={cycleTimer} disabled={recording} aria-pressed={timer !== 0}><span aria-hidden="true">◷</span>{timer ? `${timer}s` : "Timer"}</button>
          </div>
          {panel === "filters" && (
            <div className="shorts-create-filters" role="group" aria-label="Filters">
              {FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
            </div>
          )}
          {message && <p className="shorts-create-note" role="status">{message}</p>}
          <div className="shorts-create-bar">
            <label className="shorts-create-side"><input hidden type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(event) => takeFile(event.target.files?.[0])} /><span aria-hidden="true">⬆</span>Upload</label>
            <button type="button" className={`shorts-create-record${recording ? " recording" : ""}`} onClick={onRecordPress} aria-label={recording ? "Stop recording" : "Start recording"} disabled={!!cameraError} />
            <button type="button" className="shorts-create-side" onClick={() => { stopCamera(); onOpenTemplates(); }}><span aria-hidden="true">▣</span>Templates</button>
          </div>
        </>
      )}
    </div>
  );
}
