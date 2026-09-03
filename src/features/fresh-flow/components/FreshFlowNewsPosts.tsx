import { FeedModule } from "../../feed/components/FeedModule";

/**
 * Fresh Flow's News / Posts surface.
 *
 * This intentionally reuses the existing FeedModule so the proven posts,
 * image uploads, reactions, comments, saves and sharing behavior remains
 * intact while the experience is entered through Fresh Flow.
 */
export default function FreshFlowNewsPosts() {
  return (
    <section className="fresh-flow-news-posts" aria-label="Fresh Flow News and Posts">
      <FeedModule />
    </section>
  );
}
