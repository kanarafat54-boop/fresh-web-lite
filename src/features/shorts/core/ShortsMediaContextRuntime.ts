import { supabase } from "../../../lib/supabase";
import { createShortMediaContext, getShortMediaContextCapabilities } from "./ShortMediaContextAdapter";
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
 * ShortsModule data contract. It hydrates only context fields the existing
 * feed can truthfully provide today.
 */
export class ShortsMediaContextRuntime {
  private observer: MutationObserver | null = null;
  private pending = new Set<string>();
  private scheduled = false;
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

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
    const ids: string[] = [];

    for (const item of items) {
      const shortId = item.querySelector<HTMLVideoElement>("video[data-short-id]")?.dataset.shortId;
      if (shortId && !this.pending.has(shortId)) ids.push(shortId);
    }

    if (ids.length === 0) return;
    for (const id of ids) this.pending.add(id);

    try {
      const { data, error } = await supabase
        .from("shorts")
        .select("id, author_id, caption, created_at")
        .in("id", ids);

      if (error) return;

      const rows = (data ?? []) as Array<{
        id: string;
        author_id: string | null;
        caption: string | null;
        created_at: string;
      }>;
      const rowMap = new Map(rows.map((row) => [row.id, row]));

      for (const item of items) {
        const shortId = item.querySelector<HTMLVideoElement>("video[data-short-id]")?.dataset.shortId;
        if (!shortId) continue;

        const row = rowMap.get(shortId);
        if (!row?.author_id) continue;

        const short: Short = {
          ...DEFAULT_SHORT,
          id: row.id,
          authorId: row.author_id,
          caption: row.caption ?? "",
          createdAt: row.created_at,
        };
        const context = createShortMediaContext(short);
        const capabilities = getShortMediaContextCapabilities(short);

        item.dataset.mediaId = context.mediaId;
        item.dataset.mediaKind = context.kind;
        if (context.provenance.creatorId) {
          item.dataset.mediaCreatorId = context.provenance.creatorId;
        } else {
          delete item.dataset.mediaCreatorId;
        }
        item.dataset.mediaContextSurface = context.surface ?? "discovery";
        item.dataset.mediaTopicCount = String(context.knowledge.topics.length);
        item.dataset.mediaDerivativeDepth = String(context.provenance.derivativeDepth);
        item.dataset.mediaCapabilities = capabilities.join(",");
      }
    } finally {
      for (const id of ids) this.pending.delete(id);
    }
  }
}
