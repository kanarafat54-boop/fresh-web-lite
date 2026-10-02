import { useEffect, useState } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import "./DownloadCenter.css";

export default function DownloadCenter() {
  const { setActiveRoute } = useLayout();
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    const onInstallAvailable = () => setInstallable(true);
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    return () => window.removeEventListener("beforeinstallprompt", onInstallAvailable);
  }, []);

  return (
    <main className="fresh-downloads">
      <header>
        <button type="button" onClick={() => setActiveRoute("feed")} aria-label="Back to Fresh Home">←</button>
        <span>Fresh Web Lite</span>
      </header>
      <section>
        <p className="fresh-downloads-overline">GET FRESH</p>
        <h1>Fresh, wherever you are.</h1>
        <p>Use Fresh Web Lite as an installable app or get the Android package from the official release channel.</p>
        <div className="fresh-download-grid">
          <article>
            <span className="fresh-download-icon">◈</span>
            <h2>Install the web app</h2>
            <p>Install the current Fresh Web Lite experience directly from a supported browser.</p>
            <span className="fresh-download-muted">{installable ? "Install option available in this browser." : "Use your browser's Install app / Add to Home Screen command."}</span>
          </article>
          <article>
            <span className="fresh-download-icon">▣</span>
            <h2>Android APK</h2>
            <p>Download the Android build from Fresh Web Lite's official release channel.</p>
            <a href="https://github.com/kanarafat54-boop/fresh-web-lite/releases/latest" target="_blank" rel="noreferrer">Open Android releases ↗</a>
          </article>
        </div>
        <p className="fresh-download-note">Android releases are published separately from the web deployment so a web deployment can never silently replace the APK.</p>
      </section>
    </main>
  );
}
