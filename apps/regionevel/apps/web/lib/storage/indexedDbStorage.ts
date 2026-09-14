/**
 * Zero-dependency, asynchronous IndexedDB storage engine for Zustand persist middleware.
 * Bypasses the 5MB browser LocalStorage quota, ensuring thousands of visits with timeline dates
 * persist seamlessly and load in milliseconds.
 * Includes automatic one-time migration from legacy LocalStorage.
 */

const DB_NAME = "regionevel_db";
const STORE_NAME = "kv_store";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB is not supported in this environment"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

export const indexedDbStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      if (typeof window === "undefined") return null;
      const db = await getDb();
      const value = await new Promise<string | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(name);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => reject(req.error);
      });

      if (value !== null) {
        return value;
      }

      // One-time migration fallback: check legacy localStorage
      try {
        const legacy = localStorage.getItem(name);
        if (legacy) {
          // Asynchronously persist to IndexedDB
          indexedDbStorage.setItem(name, legacy).catch(() => {});
          return legacy;
        }
      } catch {
        // Ignore localStorage access error
      }

      return null;
    } catch (err) {
      console.warn("[indexedDbStorage] Fallback to localStorage due to IDB error:", err);
      try {
        return localStorage.getItem(name);
      } catch {
        return null;
      }
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    try {
      if (typeof window === "undefined") return;
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("[indexedDbStorage] setItem failed:", err);
    }
  },

  async removeItem(name: string): Promise<void> {
    try {
      if (typeof window === "undefined") return;
      const db = await getDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(name);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      try {
        localStorage.removeItem(name);
      } catch {}
    } catch (err) {
      console.warn("[indexedDbStorage] removeItem failed:", err);
    }
  },
};
