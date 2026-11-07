/**
 * Demo-only browser file store for prescription previews (IndexedDB on web, memory elsewhere).
 * Files never leave the browser and this is NOT a medical records system.
 */
const DB_NAME = 'medifly-demo-files';
const STORE = 'files';
const memory = new Map<string, Blob>();

function hasIndexedDb() {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export const fileStore = {
  async put(key: string, blob: Blob): Promise<void> {
    if (!hasIndexedDb()) {
      memory.set(key, blob);
      return;
    }
    try {
      await tx('readwrite', (s) => s.put(blob, key));
    } catch {
      memory.set(key, blob);
    }
  },
  async get(key: string): Promise<Blob | null> {
    if (memory.has(key)) return memory.get(key)!;
    if (!hasIndexedDb()) return null;
    try {
      const v = await tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>);
      return v ?? null;
    } catch {
      return null;
    }
  },
  async clear(): Promise<void> {
    memory.clear();
    if (!hasIndexedDb()) return;
    try {
      await tx('readwrite', (s) => s.clear());
    } catch {
      /* ignore */
    }
  },
};
