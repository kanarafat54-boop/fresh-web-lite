import { useLayout } from "../../app/contexts/useLayout";
import "./DownloadCenter.css";

export default function DownloadCenter() {
  const { setActiveRoute } = useLayout();
  return (
    <main className="fresh-downloads">
      <header>
        <button type="button" onClick={() => setActiveRoute("feed")} aria-label="Back to Fresh Home">←</button>
        <span>Fresh Web Lite</span>
      </header>
      <section>
        <p className="fresh-downloads-overline">GET FRESH</p>
        <h1>Fresh, wherever you are.</h1>
        <p>Install Fresh Web Lite as a web app or download the Android package from the official release channel.</p>
        <div className="fresh-download-grid">
          <article>
            <span className="fresh-download-icon">◈</span>
            <h2>Web app</h2>
            <p>Use your browser's Install app or Add to Home Screen command on a supported device.</p>
          </article>
          <article>
            <span className="fresh-download-icon">▣</span>
            <h2>Android APK</h2>
            <p>Download the current Android build from Fresh Web Lite's official release channel.</p>
            <a href="https://github.com/kanarafat54-boop/fresh-web-lite/releases/latest" target="_blank" rel="noreferrer">Download Android APK ↗</a>
          </article>
        </div>
        <p className="fresh-download-note">Android builds are published separately from the web deployment.</p>
      </section>
    </main>
  );
}
