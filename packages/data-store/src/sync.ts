import type { RegionVisit } from "@regionevel/types";
import type { VisitDataStore } from "./types.js";

export interface SyncTarget {
  getLocalVisits(): RegionVisit[];
  setVisits(visits: RegionVisit[]): void;
  /** Subscribe to local state changes. Fires synchronously inside Zustand setState. */
  subscribe(callback: (visits: RegionVisit[]) => void): () => void;
}

export class SyncManager {
  private unsubRemote: (() => void) | null = null;
  private unsubLocal: (() => void) | null = null;
  // Tracks the last state Firestore has confirmed, so we can diff local changes.
  private remoteMap = new Map<string, RegionVisit>();
  // Prevents the Firestore→local update from immediately echoing back to Firestore.
  private applyingRemote = false;

  constructor(
    private readonly remote: VisitDataStore,
    private readonly local: SyncTarget,
  ) {}

  async start() {
    const [remoteVisits, localVisits] = await Promise.all([
      this.remote.getVisits(),
      Promise.resolve(this.local.getLocalVisits()),
    ]);

    // Build a map of the remote state for diffing.
    for (const v of remoteVisits) {
      this.remoteMap.set(visitKey(v), v);
    }

    // Merge: last-write-wins by updatedAt; fall back to higher count.
    const merged = mergeVisits(localVisits, remoteVisits);

    // Upload only the visits that actually differ from Firestore.
    const toUpload = merged.filter((v) => {
      const remote = this.remoteMap.get(visitKey(v));
      return !remote || remote.count !== v.count || remote.notes !== v.notes;
    });
    await Promise.all(
      toUpload.map((v) =>
        this.remote.upsertVisit(v.regionId, v.category, v.count, v.notes),
      ),
    );

    // Optimistically update remoteMap so the imminent Firestore snapshot
    // doesn't look like a new diff.
    for (const v of toUpload) {
      this.remoteMap.set(visitKey(v), v);
    }

    // Apply merged state to local store before wiring up subscribers so
    // the setVisits call below doesn't trigger the local→remote subscriber.
    this.applyingRemote = true;
    this.local.setVisits(merged);
    this.applyingRemote = false;

    // Firestore → local  (real-time updates from other devices / server)
    this.unsubRemote = this.remote.subscribe((visits) => {
      this.remoteMap.clear();
      for (const v of visits) {
        this.remoteMap.set(visitKey(v), v);
      }
      // applyingRemote=true ensures the local subscriber below is a no-op
      // during this synchronous Zustand setState call.
      this.applyingRemote = true;
      this.local.setVisits(visits);
      this.applyingRemote = false;
    });

    // Local → Firestore  (push user changes during an active session)
    this.unsubLocal = this.local.subscribe((visits) => {
      if (this.applyingRemote) return;

      // Push new / changed visits.
      for (const v of visits) {
        const key = visitKey(v);
        const r = this.remoteMap.get(key);
        if (!r || r.count !== v.count || r.notes !== v.notes) {
          this.remoteMap.set(key, v); // optimistic update
          this.remote
            .upsertVisit(v.regionId, v.category, v.count, v.notes)
            .catch(console.error);
        }
      }

      // Remove visits that were deleted locally.
      const localKeys = new Set(visits.map(visitKey));
      for (const [key, v] of this.remoteMap) {
        if (!localKeys.has(key)) {
          this.remoteMap.delete(key);
          this.remote.removeVisit(v.regionId, v.category).catch(console.error);
        }
      }
    });
  }

  stop() {
    this.unsubRemote?.();
    this.unsubLocal?.();
    this.unsubRemote = null;
    this.unsubLocal = null;
    this.remoteMap.clear();
  }
}

function visitKey(v: RegionVisit): string {
  return `${v.regionId}__${v.category}`;
}

function mergeVisits(local: RegionVisit[], remote: RegionVisit[]): RegionVisit[] {
  const map = new Map<string, RegionVisit>();

  for (const v of [...remote, ...local]) {
    const key = visitKey(v);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, v);
      continue;
    }
    // Prefer the entry with a more recent updatedAt timestamp.
    // Fall back to higher count when timestamps are absent (e.g. legacy data).
    const vTime = v.updatedAt ?? 0;
    const eTime = existing.updatedAt ?? 0;
    if (vTime > eTime || (vTime === eTime && v.count > existing.count)) {
      map.set(key, v);
    }
  }

  return Array.from(map.values());
}
