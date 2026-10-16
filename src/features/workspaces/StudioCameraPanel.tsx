import { useEffect, useRef, useState } from "react";

type Props = {
  onCaptured: (file: File) => void;
  onClose: () => void;
};

export default function StudioCameraPanel({ onCaptured, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Camera is off until you choose Start camera.");

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser does not support camera access. You can import a video instead.");
        return;
      }
      try {
        setError("");
        setStatus("Requesting camera permission…");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setStatus("Camera ready. Check framing, then record.");
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : "Permission or camera error.";
        setError(detail);
        setStatus("Camera unavailable.");
      }
    };
    void startCamera();
    return () => {
      cancelled = true;
      if (recorderRef.current) {
        recorderRef.current.onstop = null;
        if (recorderRef.current.state !== "inactive") recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [facingMode]);

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      setStatus("Finishing recording…");
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      setError("Start the camera successfully before recording.");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("Recording is not supported by this browser. Import an existing video instead.");
      return;
    }
    const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
    try {
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onerror = () => {
        setRecording(false);
        setError("Recording failed. Check camera permissions and available device storage.");
        setStatus("Recording failed.");
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
        if (!blob.size) {
          setError("No video data was captured. Please try again.");
          setStatus("No recording created.");
          return;
        }
        const file = new File([blob], `fresh-camera-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`, {
          type: blob.type || "video/webm",
        });
        setStatus("Recording captured. Opening it in the editor…");
        onCaptured(file);
      };
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setError("");
      setStatus("Recording. Keep the subject in frame; tap Stop when finished.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start recording.");
    }
  };

  return (
    <section className="studio-camera" aria-label="Fresh Studio camera">
      <div className="studio-camera-heading">
        <div>
          <span className="workspace-eyebrow">FRESH CAMERA</span>
          <h2>Capture a new video</h2>
          <p>Camera permission is requested by your browser. Video stays in this editing session until you choose to export or publish.</p>
        </div>
        <button type="button" onClick={onClose} disabled={recording}>Close camera</button>
      </div>
      <video ref={videoRef} className="studio-camera-preview" autoPlay muted playsInline aria-label="Live camera preview" />
      <p className="studio-camera-status" role="status">{status}</p>
      {error && <p className="studio-camera-error" role="alert">{error}</p>}
      <div className="studio-camera-actions">
        <button type="button" onClick={() => setFacingMode((current) => current === "environment" ? "user" : "environment")} disabled={recording}>
          Flip camera
        </button>
        <button type="button" className={recording ? "studio-camera-stop" : "studio-btn-primary"} onClick={toggleRecording}>
          {recording ? "Stop recording" : "Record video"}
        </button>
      </div>
      <p className="studio-camera-note">For best results, use good light, clean the lens, and keep the phone steady. Actual resolution and audio quality depend on your device and browser.</p>
    </section>
  );
}
