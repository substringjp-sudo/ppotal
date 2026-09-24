/**
 * A cache for payloads too large for localStorage.
 *
 * The region table is ~55,000 documents and roughly 9 MB of JSON. localStorage
 * gives an origin about 5 MB, so writing it threw QuotaExceededError every
 * time; the write was wrapped in try/catch, so nothing failed loudly — the
 * cache simply stayed empty and every visit re-downloaded all 55,000
 * documents. That is the whole of "loading is slow every time I open it".
 *
 * IndexedDB has no such ceiling (hundreds of MB, and the browser asks before
 * evicting), stores structured values without a JSON.stringify pass, and is
 * asynchronous, so a multi-megabyte read no longer blocks the main thread the
 * way `localStorage.getItem` + `JSON.parse` did.
 *
 * Every call degrades to "no cache" rather than throwing: private windows,
 * blocked storage and the server render all land there, and a cache that is
 * merely absent is never worse than the fetch it was avoiding.
 */

const DB_NAME = "regionevel-cache";
const STORE = "payloads";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      return resolve(null);
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    // Firefox in private mode neither resolves nor rejects; don't hang the page.
    setTimeout(() => resolve(null), 3000);
  });
  return dbPromise;
}

export async function bigCacheGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function bigCacheSet<T>(key: string, value: T): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      // A quota refusal here is worth knowing about but not worth failing over.
      tx.onerror = () => { console.warn("[regions cache] IndexedDB write refused", tx.error); resolve(); };
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Drops entries from earlier cache versions.
 *
 * Bumping the version is what invalidates the cache, and without this the
 * superseded payloads would sit in IndexedDB forever — the very thing
 * localStorage's ceiling used to prevent by accident.
 */
export async function bigCacheEvictExcept(prefix: string, keepVersion: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const store = db.transaction(STORE, "readwrite").objectStore(STORE);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        for (const k of req.result) {
          const key = String(k);
          if (key.startsWith(prefix) && !key.includes(keepVersion)) store.delete(k);
        }
        resolve();
      };
      req.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
