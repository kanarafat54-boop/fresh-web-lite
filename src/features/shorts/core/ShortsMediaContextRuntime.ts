import { supabase } from "../../../lib/supabase";
import { createShortMediaContext } from "./ShortMediaContextAdapter";
import type { Short } from "../types/short";

const DEFAULT_SHORT: Omit<Short, "id" | "authorId" | "caption" | "createdAt"> = {
  authorName: "",
  authorUsername: "",
  soundName: null,
  videoUrl: "",
  likeCount: 0,
  commentCount: 0,
  viewCount: 0,
  repostCount: 0,
  myReaction: null,
  repostedByMe: false,
  isFollowingAuthor: false,
  reactionBreakdown: {},
  isHot: false,
  chapters: [],
};

/**
 * Bridges the mature Shorts DOM to the Fresh Media OS without changing the
 * ShortsModule data contract. It hydrates only the context fields that the
 * existing feed can truthfully provide today.
 */
export class ShortsMediaContextRuntime {
  private observer: MutationObserver | null = null;
  private pending = new Set<string>();
  private scheduled = false;

  constructor(private readonly container: HTMLElement) {}

  start(): void {
    this.observer = new MutationObserver(() => this.scheduleHydration());
    this.observer.observe(this.container, { childList: true, subtree: true });
    this.scheduleHydration();
  }

  destroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.pending.clear();
  }

  private scheduleHydration(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      void this.hydrateVisibleItems();
    });
  }

  private async hydrateVisibleItems(): Promise<void> {
    const items = Array.from(this.container.querySelectorAll<HTMLElement>(".short-item"));
    const ids = items
      .map((item) => item.querySelector<HTMLVideoElement>("video[data-short-id]")?.dataset.shortId)
      .filter((id): id is string => Boolean(id) && !this.pending.has(id));

    if (ids.length === 0) return;
    ids.forEach((id) => this.pending.add(id));

    try {
      const { data, error } = await supabase
        .from("shorts")
        .select("id, author_id, caption, created_at")
        .in("id", ids);

      if (error) return;

      const rows = (data ?? []) as Array<{
        id: string;
        author_id: string;
        caption: string | null;
        created_at: string;
      }>;
      const rowMap = new Map(rows.map((row) => [row.id, row]));

      items.forEach((item) => {
        const video = item.querySelector<HTMLVideoElement>("video[data-short-id]");
        const id = video?.dataset.shortId;
        if (!id) return;
        const row = rowMap.get(id);
        if (!row) return;

        const short: Short = {
          ...DEFAULT_SHORT,
          id: row.id,
          authorId: row.author_id,
          caption: row.caption ?? "",
          createdAt: row.created_at,
        };
        const context = createShortMediaContext(short);

        item.dataset.mediaId = context.mediaId;
        item.dataset.mediaKind = context.kind;
        item.dataset.mediaCreatorId = context.provenance.creatorId;
        item.dataset.mediaContextSurface = context.surface ?? "discovery";
        item.dataset.mediaTopicCount = String(context.knowledge.topics.length);
        item.dataset.mediaDerivativeDepth = String(context.provenance.derivativeDepth);
        item.dataset.mediaCapabilities = [
          "interaction",
          "remix",
          "duet",
          ...context.knowledge.topics.map(() => "topic"),
        ].join(",");
      });
    } finally {
      ids.forEach((id) => this.pending.delete(id));
    }
  }
}
