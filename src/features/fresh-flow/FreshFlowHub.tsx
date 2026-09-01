import { useLayout } from "../../app/contexts/useLayout";
import FreshFlowShortsStream from "./components/FreshFlowShortsStream";
import EcosystemPlaceholder from "../workspaces/EcosystemPlaceholder";
import "./components/FreshFlow.css";

type FreshFlowSection =
  | "fresh-flow"
  | "fresh-flow-long-videos"
  | "fresh-flow-news-posts"
  | "fresh-flow-ar-vr"
  | "fresh-flow-podcasts"
  | "fresh-flow-more";

const SECTION_COPY: Record<Exclude<FreshFlowSection, "fresh-flow">, { name: string; description: string }> = {
  "fresh-flow-long-videos": {
    name: "Fresh Flow · Long Videos",
    description: "Long-form video watching, documentaries and series within Fresh Flow.",
  },
  "fresh-flow-news-posts": {
    name: "Fresh Flow · News / Posts",
    description: "News, posts, photos and discussions connected to the Fresh Flow experience.",
  },
  "fresh-flow-ar-vr": {
    name: "Fresh Flow · AR / VR",
    description: "Immersive AR and VR experiences connected to Fresh Flow.",
  },
  "fresh-flow-podcasts": {
    name: "Fresh Flow · Podcasts",
    description: "Podcast shows, conversations and listening experiences within Fresh Flow.",
  },
  "fresh-flow-more": {
    name: "Fresh Flow · Others",
    description: "Additional Fresh Flow ecosystems and connected experiences.",
  },
};

/**
 * Fresh Flow is a standalone ecosystem page. Its six navigable controls live
 * in the global bottom shell: Home is the universal return point and the
 * other five controls switch the Fresh Flow workspace. No duplicate tab bar
 * is rendered here.
 *
 * The existing Short Flow remains the Home surface of Fresh Flow and keeps
 * its own discovery ranking and horizontal previous/next gesture model.
 */
export default function FreshFlowHub() {
  const { activeRoute } = useLayout();
  const section = (activeRoute || "fresh-flow") as FreshFlowSection;

  if (section === "fresh-flow") {
    return (
      <div className="fresh-flow-hub" aria-label="Fresh Flow">
        <FreshFlowShortsStream />
      </div>
    );
  }

  const copy = SECTION_COPY[section];

  return (
    <div className="fresh-flow-hub" aria-label="Fresh Flow ecosystem">
      {copy ? (
        <EcosystemPlaceholder {...copy} />
      ) : (
        <EcosystemPlaceholder
          name="Fresh Flow"
          description="Select a Fresh Flow ecosystem from the bottom navigation."
        />
      )}
    </div>
  );
}
