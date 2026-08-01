export interface FeedItem {
  id: string;
  type: string;
  author: string;
  title: string;
  description: string;
  createdAt: string;
}

class FeedService {
  private items: FeedItem[] = [];

  add(item: FeedItem) {
    this.items.unshift(item);
  }

  getFeed(): FeedItem[] {
    return this.items;
  }
}

export const feedService = new FeedService();
