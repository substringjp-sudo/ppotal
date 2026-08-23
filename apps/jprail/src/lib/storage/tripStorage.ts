import type { Trip } from '../../types/trip';

const DB_NAME = 'jprail_db';
const DB_VERSION = 1;
const STORE_NAME = 'trips_store';
const KEY_NAME = 'recorded_trips';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save trips to IndexedDB asynchronously without 5MB quota restrictions.
 */
export async function saveLocalTrips(trips: Trip[]): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(trips, KEY_NAME);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (err) {
        console.error('Failed to save trips to IndexedDB', err);
        // Fallback to localStorage for small datasets
        try {
            if (trips.length < 50) {
                localStorage.setItem('jprail_trips', JSON.stringify(trips));
            }
        } catch { /* ignore quota error */ }
    }
}

/**
 * Load trips from IndexedDB, migrating from localStorage if needed.
 */
export async function loadLocalTrips(): Promise<Trip[]> {
    if (typeof window === 'undefined') return [];

    try {
        const db = await openDB();
        const trips = await new Promise<Trip[] | undefined>((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(KEY_NAME);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (trips && Array.isArray(trips) && trips.length > 0) {
            return trips;
        }
    } catch (err) {
        console.warn('Failed to load trips from IndexedDB, trying localStorage fallback', err);
    }

    // Migration / Fallback from localStorage
    try {
        const saved = localStorage.getItem('jprail_trips');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Migrate to IndexedDB in background
                saveLocalTrips(parsed).then(() => {
                    try {
                        localStorage.removeItem('jprail_trips');
                    } catch { /* ignore */ }
                });
                return parsed;
            }
        }
    } catch (err) {
        console.error('Failed to load trips from localStorage fallback', err);
    }

    return [];
}
