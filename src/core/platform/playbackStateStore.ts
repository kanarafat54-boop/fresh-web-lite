export type PlaybackState = {
  contentId: string;
  positionSeconds: number;
  durationSeconds?: number;
  playbackRate: number;
  updatedAt: number;
};

const STORE_NAME = "fresh-playback-state";
const DB_NAME = "fresh-web-lite";

const memory = new Map<string, PlaybackState>();

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}

export async function savePlaybackState(state: PlaybackState): Promise<void> {
  memory.set(state.contentId, state);

  if (!hasIndexedDb()) return;

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "contentId" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(state);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

export async function loadPlaybackState(contentId: string): Promise<PlaybackState | null> {
  const cached = memory.get(contentId);
  if (cached) return cached;

  if (!hasIndexedDb()) return null;

  return new Promise<PlaybackState | null>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: "contentId" });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction(STORE_NAME, "readonly");
      const getRequest = transaction.objectStore(STORE_NAME).get(contentId);
      getRequest.onsuccess = () => {
        const state = (getRequest.result as PlaybackState | undefined) ?? null;
        if (state) memory.set(contentId, state);
        resolve(state);
      };
      getRequest.onerror = () => reject(getRequest.error);
    };
  });
}
