import type { ReactNode } from "react";
import "./FreshFlowMediaWorkspace.css";

type MediaWorkspaceProps = {
  kind: "long-videos" | "ar-vr" | "podcasts" | "others";
  title: string;
  description: string;
  icon: string;
};

type Feature = { icon: string; title: string; description: string };

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

export default function FreshFlowMediaWorkspace({ kind, title, description, icon }: MediaWorkspaceProps) {
  return (
    <section className="fresh-flow-media-workspace" aria-label={`${title} media experience`}>
      <div className="fresh-flow-media-workspace-hero">
        <span className="fresh-flow-media-workspace-icon" aria-hidden="true">{icon}</span>
        <div>
          <span className="fresh-flow-media-workspace-eyebrow">Fresh Flow · Media experience</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="fresh-flow-media-feature-grid">
        {FEATURES[kind].map((feature) => <FeatureCard key={feature.title} feature={feature} />)}
      </div>
      <div className="fresh-flow-media-workspace-note">
        <strong>One Fresh Flow.</strong> This experience owns the main content stage while keeping Fresh Web Lite's global identity and universal interactions connected.
      </div>
    </section>
  );
}
