import { FeedModule } from "../../feed/components/FeedModule";

type Props = {
  /** Layer B discovery for News / Posts world. */
  discoveryId?: string;
};

/**
 * Fresh Flow's News / Posts surface.
 * Reuses FeedModule; discoveryId is exposed so the feed can branch without
 * breaking proven posts/reactions/comments/saves behavior.
 */
export default function FreshFlowNewsPosts({ discoveryId = "news" }: Props) {
  return (
    <section
      className="fresh-flow-news-posts"
      aria-label="Fresh Flow News and Posts"
      data-discovery={discoveryId}
    >
      <div className="fresh-flow-news-discovery-hint" aria-live="polite">
        <span>Discovery</span>
        <strong>{discoveryId.replace(/-/g, " ")}</strong>
      </div>
      <FeedModule />
    </section>
  );
}
