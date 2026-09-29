const DB_NAME = "fresh-web-lite-media";
const STORE = "assets";
const VERSION = 1;

type AssetRecord = { id: string; blob: Blob; createdAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable."));
  });
}

export async function saveMediaAsset(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ id, blob, createdAt: Date.now() } satisfies AssetRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save media asset."));
  });
  db.close();
}

export async function loadMediaAsset(id: string): Promise<Blob | null> {
  const db = await openDb();
  const result = await new Promise<AssetRecord | undefined>((resolve, reject) => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as AssetRecord | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read media asset."));
  });
  db.close();
  return result?.blob ?? null;
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete media asset."));
  });
  db.close();
}
