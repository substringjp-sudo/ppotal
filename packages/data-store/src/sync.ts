/**
 * Sync manager: merges localStorage visits into Firestore on login,
 * then keeps Zustand store in sync with Firestore in real-time.
 */
import type { RegionVisit } from "@regionevel/types";
import type { VisitDataStore } from "./types.js";

export interface SyncTarget {
  getLocalVisits(): RegionVisit[];
  setVisits(visits: RegionVisit[]): void;
}

export class SyncManager {
  private unsub: (() => void) | null = null;

  constructor(
    private readonly remote: VisitDataStore,
    private readonly local: SyncTarget,
  ) {}

  /**
   * On login: upload local visits to Firestore (merge, don't overwrite if remote has more).
   * Then subscribe to real-time Firestore updates.
   */
  async start() {
    const [remoteVisits, localVisits] = await Promise.all([
      this.remote.getVisits(),
      Promise.resolve(this.local.getLocalVisits()),
    ]);

    // Merge: prefer whichever has a higher count for each (regionId, category)
    const merged = mergeVisits(localVisits, remoteVisits);

    // Upload merged state to Firestore
    for (const v of merged) {
      await this.remote.upsertVisit(v.regionId, v.category, v.count, v.notes);
    }

    // Subscribe to real-time updates
    this.unsub = this.remote.subscribe((visits) => {
      this.local.setVisits(visits);
    });
  }

  stop() {
    this.unsub?.();
    this.unsub = null;
  }
}

function mergeVisits(local: RegionVisit[], remote: RegionVisit[]): RegionVisit[] {
  const map = new Map<string, RegionVisit>();

  for (const v of [...remote, ...local]) {
    const key = `${v.regionId}__${v.category}`;
    const existing = map.get(key);
    // Keep the one with higher count
    if (!existing || v.count > existing.count) {
      map.set(key, v);
    }
  }

  return Array.from(map.values());
}
