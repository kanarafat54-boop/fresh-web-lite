import type { ReactNode } from "react";
import "./FreshFlowMediaWorkspace.css";

type MediaWorkspaceProps = {
  kind: "long-videos" | "ar-vr" | "podcasts" | "others";
  title: string;
  description: string;
  icon: string;
};

type Feature = { icon: string; title: string; description: string };

type LongVideoCard = { title: string; creator: string; duration: string; meta: string; tone: string };

const LONG_VIDEOS: LongVideoCard[] = [
  { title: "Explore the world through Fresh", creator: "Fresh Originals", duration: "24:18", meta: "Documentary · 1.2M views", tone: "aurora" },
  { title: "The future of technology", creator: "Fresh Tech", duration: "41:06", meta: "Technology · 842K views", tone: "ocean" },
  { title: "Stories that changed a generation", creator: "Fresh Stories", duration: "18:42", meta: "Culture · 531K views", tone: "sunset" },
  { title: "Inside the creative process", creator: "Fresh Studio", duration: "32:10", meta: "Creator · 294K views", tone: "violet" },
  { title: "A journey beyond the city", creator: "Fresh Travel", duration: "27:55", meta: "Travel · 187K views", tone: "forest" },
];

const FEATURES: Record<MediaWorkspaceProps["kind"], Feature[]> = {
  "long-videos": [
    { icon: "▶", title: "Watch", description: "Long-form video takes the full content stage." },
    { icon: "◫", title: "Chapters", description: "Move through structured sections without leaving the experience." },
    { icon: "✦", title: "Discover", description: "Explore related long-form media through Fresh Flow." },
    { icon: "💬", title: "Discuss", description: "Use the universal Fresh interaction layer for conversation." },
  ],
  "ar-vr": [
    { icon: "◇", title: "Immersive", description: "AR and VR content gets the full Fresh Flow stage." },
    { icon: "⌁", title: "Spatial", description: "Prepare spatial media for supported devices and experiences." },
    { icon: "✦", title: "Explore", description: "Discover immersive experiences connected to Fresh Flow." },
    { icon: "↗", title: "Share", description: "Share immersive experiences through the universal interaction layer." },
  ],
  podcasts: [
    { icon: "♫", title: "Listen", description: "Podcast playback gets the full media stage." },
    { icon: "◷", title: "Episodes", description: "Navigate shows and episodes as a dedicated listening experience." },
    { icon: "✦", title: "Discover", description: "Explore podcast content without leaving Fresh Flow." },
    { icon: "💬", title: "Discuss", description: "React, comment, save and share through universal interactions." },
  ],
  others: [
    { icon: "▦", title: "More media", description: "A home for supported Fresh media formats beyond the primary directorates." },
    { icon: "✦", title: "Discover", description: "Keep emerging media experiences inside Fresh Flow." },
    { icon: "↗", title: "Connect", description: "Connect supported media to the universal interaction layer." },
    { icon: "⚙", title: "Extend", description: "New media types can join without creating another media ecosystem." },
  ],
};

function FeatureCard({ feature }: { feature: Feature }): ReactNode {
  return (
    <article className="fresh-flow-media-feature-card">
      <span className="fresh-flow-media-feature-icon" aria-hidden="true">{feature.icon}</span>
      <div>
        <h2>{feature.title}</h2>
        <p>{feature.description}</p>
      </div>
    </article>
  );
}

function LongVideoStage(): ReactNode {
  return (
    <section className="fresh-flow-long-video-stage" aria-label="Long Videos parallel discovery">
      <div className="fresh-flow-long-video-heading">
        <div>
          <span className="fresh-flow-media-workspace-eyebrow">Fresh Flow · Long Videos</span>
          <h3>Continue watching &amp; discover</h3>
        </div>
        <span className="fresh-flow-long-video-direction">← swipe →</span>
      </div>
      <div className="fresh-flow-long-video-rail" role="region" aria-label="Long video carousel">
        {LONG_VIDEOS.map((video) => (
          <article key={video.title} className="fresh-flow-long-video-card">
            <div className={`fresh-flow-long-video-thumb ${video.tone}`}>
              <span className="fresh-flow-long-video-play" aria-hidden="true">▶</span>
              <span className="fresh-flow-long-video-duration">{video.duration}</span>
            </div>
            <div className="fresh-flow-long-video-info">
              <strong>{video.title}</strong>
              <span>{video.creator}</span>
              <small>{video.meta}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function FreshFlowMediaWorkspace({ kind, title, description, icon }: MediaWorkspaceProps) {
  return (
    <section className={`fresh-flow-media-workspace fresh-flow-media-workspace-${kind}`} aria-label={`${title} media experience`}>
      <div className="fresh-flow-media-workspace-hero">
        <span className="fresh-flow-media-workspace-icon" aria-hidden="true">{icon}</span>
        <div>
          <span className="fresh-flow-media-workspace-eyebrow">Fresh Flow · Media experience</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      {kind === "long-videos" && <LongVideoStage />}
      <div className="fresh-flow-media-feature-grid">
        {FEATURES[kind].map((feature) => <FeatureCard key={feature.title} feature={feature} />)}
      </div>
      <div className="fresh-flow-media-workspace-note">
        <strong>One Fresh Flow.</strong> This experience owns the main content stage while keeping Fresh Web Lite's global identity and universal interactions connected.
      </div>
    </section>
  );
}
