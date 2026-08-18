export type FreshMemoryItem = {
  id: string;
  scope: "user" | "project" | "session";
  key: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
};

export interface FreshMemoryStore {
  get(scope: FreshMemoryItem["scope"], key: string): Promise<FreshMemoryItem | undefined>;
  set(item: FreshMemoryItem): Promise<void>;
}

export class InMemoryFreshMemory implements FreshMemoryStore {
  private readonly items = new Map<string, FreshMemoryItem>();

  async get(scope: FreshMemoryItem["scope"], key: string) {
    return this.items.get(`${scope}:${key}`);
  }

  async set(item: FreshMemoryItem) {
    this.items.set(`${item.scope}:${item.key}`, item);
  }
}

export const freshMemory = new InMemoryFreshMemory();
