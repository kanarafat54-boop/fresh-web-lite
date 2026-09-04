import { useLayout } from "../contexts/useLayout";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import FeatureLoader from "../services/featureLoader";
import { ShortsModule } from "../../features/shorts/components/ShortsModule";
import "./DedicatedMediaView.css";

const MEDIA_META: Record<string, { title: string; description: string }> = {
  "long-videos": { title: "Long Videos", description: "Watch full-length Fresh video experiences." },
  "news-posts": { title: "News / Posts", description: "Follow current stories, posts and conversations." },
  "vr-ar": { title: "AR / VR", description: "Explore immersive Fresh experiences." },
  podcasts: { title: "Podcasts", description: "Listen, follow and discover conversations." },
  others: { title: "Others", description: "Explore more media experiences across Fresh." },
};

export default function DedicatedMediaView() {
  const { activeRoute, setActiveRoute } = useLayout();

  if (activeRoute === "shorts") {
    return <ShortsModule onExit={() => setActiveRoute("fresh-flow")} />;
  }

  const feature = activeRoute ? FeatureRegistry.getFeature(activeRoute) : undefined;
  if (feature) return <FeatureLoader feature={feature} />;

  const meta = MEDIA_META[activeRoute ?? "others"] ?? MEDIA_META.others;

  return (
    <section className="dedicated-media-view" aria-label={`${meta.title} media experience`}>
      <div className="dedicated-media-content">
        <span className="dedicated-media-kicker">FRESH MEDIA</span>
        <h1>{meta.title}</h1>
        <p>{meta.description}</p>
        <button type="button" onClick={() => setActiveRoute("fresh-flow")}>
          Back to Fresh Flow
        </button>
      </div>
    </section>
  );
}
