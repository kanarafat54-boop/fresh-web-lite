import { FeedModule } from "../../feed/components/FeedModule";

type Props = {
  /** Layer B discovery for News / Posts world. */
  discoveryId?: string;
};

/**
 * Fresh Flow's News / Posts surface.
 * FeedModule applies discovery filters (news / posts / following / trending / …).
 */
export default function FreshFlowNewsPosts({ discoveryId = "news" }: Props) {
  return (
    <section
      className="fresh-flow-news-posts"
      aria-label="Fresh Flow News and Posts"
      data-discovery={discoveryId}
    >
      <FeedModule discoveryId={discoveryId} />
    </section>
  );
}
