"use client";

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import { VISIT_CATEGORY_ORDER, VISIT_CONFIG } from "@regionevel/types";
import {
  getNextIncrement,
  getRegionScore,
  padId,
} from "@regionevel/utils";
import { auth, db, getRegionevelShapeId } from "@ppotal/firebase";
import { collection, getDocs, doc, setDoc, writeBatch, serverTimestamp } from "firebase/firestore";

interface VisitStore {
  visits: RegionVisit[];
  scores: Record<string, RegionScore>;
  allRegions: Region[];
  _hasHydrated: boolean;
  stats: {
    visitedCountries: number;
    visitedPrefectures: number;
    visitedCities: number;
    pass: number;
    transit: number;
    visit: number;
    stay: number;
    residence: number;
  };
  upsertVisit: (regionId: string, category: VisitCategory, count: number) => void;
  removeVisit: (regionId: string, category: VisitCategory) => void;
  clearRegionVisits: (regionId: string) => void;
  clearAllVisits: () => void;
  quickIncrement: (regionId: string) => void;
  addDrawPathVisits: (startRegionId: string, endRegionId: string, pathRegionIds: string[]) => void;
  applyTimelineImport: (entries: Array<{ regionId: string; category: VisitCategory }>) => Promise<void>;
  getScore: (regionId: string) => RegionScore | undefined;
  setRegions: (regions: Region[]) => void;
  recalculateScores: (regions?: Region[]) => void;
  getRegionScoreById: (id: string, includeStats?: boolean) => RegionScore | null;
  setHasHydrated: (val: boolean) => void;
  importTripsFromJprail: (uid: string) => Promise<{ success: boolean; importedShapeIds: string[] }>;
}

// Helper function to calculate scores and stats atomically
const calculateScoresAndStats = (
  visits: RegionVisit[],
  allRegions: Region[],
  currentScores: Record<string, RegionScore>,
  /**
   * Regions newly added to the store since the last pass. Adding a child
   * changes its ancestors' `childSum`, so these and their ancestors have to be
   * recomputed — but nothing else does, which is what keeps a drill-down from
   * rescoring every region in the world.
   */
  newRegionIds?: Set<string>
) => {
  if (allRegions.length === 0) {
    return {
      scores: currentScores,
      stats: {
        visitedCountries: 0,
        visitedPrefectures: 0,
        visitedCities: 0,
        pass: 0,
        transit: 0,
        visit: 0,
        stay: 0,
        residence: 0,
      },
    };
  }

  const regionMap = new Map<string, Region>();
  const parentIdMap = new Map<string | null, Region[]>();
  
  for (const r of allRegions) {
    const id = padId(r.id);
    const pId = padId(r.parentId);
    regionMap.set(id, r);
    const children = parentIdMap.get(pId) || [];
    children.push(r);
    parentIdMap.set(pId, children);
  }

  const vMap = new Map<string, RegionVisit[]>();
  const affectedIds = new Set<string>();
  
  for (const v of visits) {
    const rid = padId(v.regionId);
    const list = vMap.get(rid) || [];
    list.push(v);
    vMap.set(rid, list);
    
    let currId: string | null = rid;
    while (currId && !affectedIds.has(currId)) {
      affectedIds.add(currId);
      const reg = regionMap.get(currId);
      currId = reg ? padId(reg.parentId) : null;
    }
  }

  // Newly loaded regions and their ancestors have to be rescored too: the
  // ancestors' childSum is a sum over children that just grew.
  if (newRegionIds) {
    for (const newId of newRegionIds) {
      let currId: string | null = padId(newId);
      while (currId && !affectedIds.has(currId)) {
        affectedIds.add(currId);
        const reg = regionMap.get(currId);
        currId = reg ? padId(reg.parentId) : null;
      }
    }
  }

  const newScores: Record<string, RegionScore> = { ...currentScores };
  const scoreMemo = new Map<string, RegionScore>();
  for (const [id, score] of Object.entries(currentScores)) {
    scoreMemo.set(id, score);
  }

  const countMemo = new Map<string, Record<VisitCategory, number>>();

  // Everything that can have changed has to leave the memo before any scoring
  // starts, not as each target comes up. getRegionScore recurses into a
  // region's children, so scoring a parent first would read its children
  // straight out of the memo and get last pass's numbers — which is a stale
  // score that then never corrects itself.
  for (const id of affectedIds) {
    scoreMemo.delete(id);
    countMemo.delete(id);
  }

  const targets = Array.from(affectedIds)
    .map((id) => regionMap.get(id))
    .filter((r): r is Region => !!r);

  // A cold store has to score everything once; after that, `affectedIds` is a
  // complete account of what can have changed.
  const finalTargets = Object.keys(currentScores).length === 0 ? allRegions : targets;

  for (const r of finalTargets) {
    const id = padId(r.id);
    const score = getRegionScore(id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, true);
    newScores[id] = score;
  }

  const stats = {
    visitedCountries: 0,
    visitedPrefectures: 0,
    visitedCities: 0,
    pass: 0,
    transit: 0,
    visit: 0,
    stay: 0,
    residence: 0,
  };

  for (const [rid] of vMap) {
    const r = regionMap.get(rid);
    if (r) {
      if (r.admLevel === 0) stats.visitedCountries++;
      else if (r.admLevel === 1) stats.visitedPrefectures++;
      else if (r.admLevel === 2) stats.visitedCities++;
    }
  }

  for (const v of visits) {
    if (v.category in stats) {
      (stats as any)[v.category] += v.count;
    }
  }

  return { scores: newScores, stats };
};

export const useVisitStore = create<VisitStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
      visits: [],
      scores: {},
      allRegions: [],
      stats: {
        visitedCountries: 0,
        visitedPrefectures: 0,
        visitedCities: 0,
        pass: 0,
        transit: 0,
        visit: 0,
        stay: 0,
        residence: 0,
      },
      _hasHydrated: false,

      setHasHydrated(val) {
        set({ _hasHydrated: val });
      },

      setRegions(regions) {
        const currentRegions = get().allRegions;
        const currentScores = get().scores;
        const regionMap = new Map<string, Region>();
        currentRegions.forEach(r => regionMap.set(padId(r.id), r));
        const addedIds = new Set<string>();
        
        regions.forEach(r => {
          const id = padId(r.id);
          const existing = regionMap.get(id);
          if (!existing) {
            regionMap.set(id, r);
            addedIds.add(id);
          } else {
            // If new object has richer metadata (e.g. nameKo, nameEn, parentId), merge it
            const hasNewMeta = (r.nameKo && !existing.nameKo) || 
                              (r.nameEn && !existing.nameEn) || 
                              (r.parentId && !existing.parentId) ||
                              (r.name && r.name !== "Unknown" && existing.name === "Unknown");
            if (hasNewMeta) {
              regionMap.set(id, { ...existing, ...r });
              addedIds.add(id);
            }
          }
        });

        const hasNoScores = Object.keys(currentScores).length === 0;

        if (addedIds.size > 0 || (hasNoScores && regions.length > 0)) {
          const newRegions = Array.from(regionMap.values());
          const { visits } = get();
          set({ allRegions: newRegions });
          const { scores, stats } = calculateScoresAndStats(
            visits,
            newRegions,
            currentScores,
            addedIds,
          );
          set({ scores, stats });
        }
      },

      upsertVisit(regionId, category, count) {
        if (!VISIT_CONFIG[category]) {
          console.error(`[visitStore] Invalid category: ${category}`);
          return;
        }
        const id = padId(regionId);
        const { visits, allRegions, scores: currentScores } = get();

        const getPrevCount = (cat: VisitCategory) => {
          const found = visits.find(v => padId(v.regionId) === id && v.category === cat);
          return found ? found.count : 0;
        };

        const prevCount = getPrevCount(category);
        const diff = count - prevCount;

        let updatedVisits = [...visits];

        const applyChange = (cat: VisitCategory, targetCount: number) => {
          const cfg = VISIT_CONFIG[cat];
          const finalCount = Math.max(0, Math.min(cfg.maxCount, targetCount));
          
          updatedVisits = updatedVisits.filter(v => !(padId(v.regionId) === id && v.category === cat));
          if (finalCount > 0) {
            updatedVisits.push({ regionId: id, category: cat, count: finalCount, updatedAt: Date.now() });
          }
        };

        applyChange(category, count);

        if (diff > 0) {
          if (category === "transit") {
            applyChange("pass", getPrevCount("pass") + diff);
          } else if (category === "visit") {
            applyChange("transit", getPrevCount("transit") + diff);
            applyChange("pass", getPrevCount("pass") + diff);
          } else if (category === "stay") {
            applyChange("visit", getPrevCount("visit") + diff);
            applyChange("transit", getPrevCount("transit") + diff);
            applyChange("pass", getPrevCount("pass") + diff);
          }
        }

        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        set({ visits: updatedVisits, scores: newScores, stats });
      },

      removeVisit(regionId, category) {
        const id = padId(regionId);
        const { visits, allRegions, scores: currentScores } = get();
        const updatedVisits = visits.filter(
          (v) => !(padId(v.regionId) === id && v.category === category),
        );
        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        set({ visits: updatedVisits, scores: newScores, stats });
      },

      clearRegionVisits(regionId) {
        const id = padId(regionId);
        const { visits, allRegions, scores: currentScores } = get();
        const updatedVisits = visits.filter((v) => padId(v.regionId) !== id);
        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        set({ visits: updatedVisits, scores: newScores, stats });
      },

      clearAllVisits() {
        const { allRegions } = get();
        const { scores: newScores, stats } = calculateScoresAndStats([], allRegions, {});
        set({ visits: [], scores: newScores, stats });
      },

      quickIncrement(regionId) {
        const id = padId(regionId);
        const { visits, upsertVisit } = get();
        const next = getNextIncrement(visits, id);
        if (next) upsertVisit(id, next.category, next.newCount);
      },

      addDrawPathVisits(startRegionId, endRegionId, pathRegionIds) {
        const { visits, upsertVisit } = get();

        const getCount = (rid: string, cat: VisitCategory) => {
          const found = visits.find(v => padId(v.regionId) === padId(rid) && v.category === cat);
          return found ? found.count : 0;
        };

        const startPadded = padId(startRegionId);
        const endPadded = padId(endRegionId);
        const endpoints = new Set([startPadded, endPadded].filter(Boolean));

        // 1. Start & End regions: Visit +1 (cascades to Transit +1 and Pass +1)
        endpoints.forEach((rid) => {
          const currVisit = getCount(rid, "visit");
          upsertVisit(rid, "visit", currVisit + 1);
        });

        // 2. Intermediate path regions: Pass +1
        pathRegionIds.forEach((rid) => {
          const padded = padId(rid);
          if (padded && !endpoints.has(padded)) {
            const currPass = getCount(padded, "pass");
            upsertVisit(padded, "pass", currPass + 1);
          }
        });
      },

      async applyTimelineImport(entries) {
        if (!entries || entries.length === 0) return;

        const { visits: prevVisits, allRegions, scores: currentScores } = get();
        const visitMap = new Map<string, RegionVisit>();
        for (const v of prevVisits) {
          visitMap.set(`${padId(v.regionId)}__${v.category}`, { ...v, regionId: padId(v.regionId) });
        }

        const getCount = (rid: string, cat: VisitCategory) => {
          const found = visitMap.get(`${padId(rid)}__${cat}`);
          return found ? found.count : 0;
        };

        const applyChange = (rid: string, cat: VisitCategory, targetCount: number) => {
          const cfg = VISIT_CONFIG[cat];
          if (!cfg) return;
          const finalCount = Math.max(0, Math.min(cfg.maxCount, targetCount));
          const key = `${padId(rid)}__${cat}`;
          if (finalCount > 0) {
            visitMap.set(key, {
              regionId: padId(rid),
              category: cat,
              count: finalCount,
              updatedAt: Date.now(),
            });
          } else {
            visitMap.delete(key);
          }
        };

        const order: VisitCategory[] = ["pass", "transit", "visit", "stay"];
        const grouped = new Map<string, number>(); // `${regionId}__${category}` -> count
        for (const { regionId, category } of entries) {
          const key = `${padId(regionId)}__${category}`;
          grouped.set(key, (grouped.get(key) ?? 0) + 1);
        }

        const byRegion = new Map<string, Set<VisitCategory>>();
        for (const key of grouped.keys()) {
          const [regionId, category] = key.split("__") as [string, VisitCategory];
          const set = byRegion.get(regionId) ?? new Set<VisitCategory>();
          set.add(category);
          byRegion.set(regionId, set);
        }

        const touchedKeys = new Set<string>();

        for (const [regionId, categories] of byRegion) {
          for (const category of order) {
            if (!categories.has(category)) continue;
            const added = grouped.get(`${regionId}__${category}`) ?? 0;
            if (added <= 0) continue;

            const prevCount = getCount(regionId, category);
            const newTarget = prevCount + added;
            const diff = newTarget - prevCount;

            applyChange(regionId, category, newTarget);
            touchedKeys.add(`${padId(regionId)}__${category}`);

            if (diff > 0) {
              if (category === "transit") {
                applyChange(regionId, "pass", getCount(regionId, "pass") + diff);
                touchedKeys.add(`${padId(regionId)}__pass`);
              } else if (category === "visit") {
                applyChange(regionId, "transit", getCount(regionId, "transit") + diff);
                applyChange(regionId, "pass", getCount(regionId, "pass") + diff);
                touchedKeys.add(`${padId(regionId)}__transit`);
                touchedKeys.add(`${padId(regionId)}__pass`);
              } else if (category === "stay") {
                applyChange(regionId, "visit", getCount(regionId, "visit") + diff);
                applyChange(regionId, "transit", getCount(regionId, "transit") + diff);
                applyChange(regionId, "pass", getCount(regionId, "pass") + diff);
                touchedKeys.add(`${padId(regionId)}__visit`);
                touchedKeys.add(`${padId(regionId)}__transit`);
                touchedKeys.add(`${padId(regionId)}__pass`);
              }
            }
          }
        }

        const updatedVisits = Array.from(visitMap.values());
        const { scores: newScores, stats } = calculateScoresAndStats(updatedVisits, allRegions, currentScores);
        
        // Single atomic state update
        set({ visits: updatedVisits, scores: newScores, stats });

        // Cloud persistence if user is logged in
        const currentUser = auth.currentUser;
        if (currentUser && touchedKeys.size > 0) {
          try {
            const BATCH_SIZE = 400;
            const touchedVisits = Array.from(touchedKeys)
              .map((k) => visitMap.get(k))
              .filter((v): v is RegionVisit => !!v);

            for (let i = 0; i < touchedVisits.length; i += BATCH_SIZE) {
              const chunk = touchedVisits.slice(i, i + BATCH_SIZE);
              const batch = writeBatch(db);
              chunk.forEach((v) => {
                const docId = `${padId(v.regionId)}__${v.category}`;
                const docRef = doc(db, "users", currentUser.uid, "visits", docId);
                batch.set(docRef, {
                  regionId: padId(v.regionId),
                  category: v.category,
                  count: v.count,
                  ...(v.notes !== undefined ? { notes: v.notes } : {}),
                  updatedAt: serverTimestamp(),
                });
              });
              await batch.commit();
            }
          } catch (err) {
            console.error("[visitStore] Failed to commit timeline visits to Firestore:", err);
          }
        }
      },

      getScore(regionId: string) {
        const id = padId(regionId);
        return get().scores[id];
      },

      getRegionScoreById(id, includeStats = false) {
        const { visits, allRegions } = get();
        if (allRegions.length === 0) return null;
        
        const rid = padId(id);
        const regionMap = new Map<string, Region>();
        const parentIdMap = new Map<string | null, Region[]>();
        const vMap = new Map<string, RegionVisit[]>();
        const affectedIds = new Set<string>();

        for (const r of allRegions) {
          const regionId = padId(r.id);
          const pId = padId(r.parentId);
          regionMap.set(regionId, r);
          const children = parentIdMap.get(pId) || [];
          children.push(r);
          parentIdMap.set(pId, children);
        }

        for (const v of visits) {
          const vrid = padId(v.regionId);
          const list = vMap.get(vrid) || [];
          list.push(v);
          vMap.set(vrid, list);
          
          let currId: string | null = vrid;
          while (currId && !affectedIds.has(currId)) {
            affectedIds.add(currId);
            const reg = regionMap.get(currId);
            currId = reg ? padId(reg.parentId) : null;
          }
        }

        return getRegionScore(rid, vMap, regionMap, parentIdMap, new Map(), new Map(), affectedIds, includeStats);
      },

      recalculateScores(regions) {
        const allRegions = regions || get().allRegions;
        const { visits } = get();
        if (allRegions.length === 0) return;

        // An explicit recalculate means "redo everything": starting from an
        // empty score map is what makes the pass cover every region.
        const { scores: newScores, stats } = calculateScoresAndStats(visits, allRegions, {});
        set({ scores: newScores, stats });
      },

      async importTripsFromJprail(uid: string) {
        try {
          const tripsRef = collection(db, "users", uid, "trips");
          const querySnapshot = await getDocs(tripsRef);
          const uniqueCityIds = new Set<string>();
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.cityIds && Array.isArray(data.cityIds)) {
              data.cityIds.forEach((cid: string) => uniqueCityIds.add(cid));
            }
          });

          if (uniqueCityIds.size === 0) return { success: false, importedShapeIds: [] };

          const currentVisits = [...get().visits];
          const shapeIds = new Set<string>();
          uniqueCityIds.forEach((cityId) => {
            const shapeId = getRegionevelShapeId(cityId);
            if (shapeId) {
              shapeIds.add(shapeId);
            }
          });

          if (shapeIds.size === 0) return { success: false, importedShapeIds: [] };

          let changed = false;
          shapeIds.forEach((shapeId) => {
            const paddedShapeId = padId(shapeId);
            const existingIdx = currentVisits.findIndex(
              (v) => padId(v.regionId) === paddedShapeId && v.category === "pass"
            );

            if (existingIdx >= 0) {
              const existingVisit = currentVisits[existingIdx];
              if (existingVisit) {
                const currentCount = existingVisit.count || 0;
                if (currentCount < 5) {
                  currentVisits[existingIdx] = {
                    ...existingVisit,
                    count: Math.min(5, currentCount + 1),
                    updatedAt: Date.now(),
                  };
                  changed = true;
                }
              }
            } else {
              currentVisits.push({
                regionId: paddedShapeId,
                category: "pass",
                count: 1,
                updatedAt: Date.now(),
              });
              changed = true;
            }
          });

          if (changed) {
            const { allRegions, scores: currentScores } = get();
            const { scores: newScores, stats } = calculateScoresAndStats(
              currentVisits,
              allRegions,
              currentScores
            );
            set({ visits: currentVisits, scores: newScores, stats });

            // Firestore에 직접 백업 진행
            try {
              await Promise.all(
                Array.from(shapeIds).map(async (shapeId) => {
                  const paddedShapeId = padId(shapeId);
                  const matchedVisit = currentVisits.find(
                    (v) => padId(v.regionId) === paddedShapeId && v.category === "pass"
                  );
                  if (matchedVisit) {
                    const docId = `${paddedShapeId}__pass`;
                    await setDoc(doc(db, "users", uid, "visits", docId), {
                      regionId: paddedShapeId,
                      category: "pass",
                      count: matchedVisit.count,
                      updatedAt: serverTimestamp(),
                    });
                  }
                })
              );
            } catch (err) {
              console.error("Failed to batch write imported visits to Firestore:", err);
            }
          }
          return { success: true, importedShapeIds: Array.from(shapeIds) };
        } catch (e) {
          console.error("Failed to import trips from JPRAIL:", e);
          return { success: false, importedShapeIds: [] };
        }
      },
    }),
    {
      name: "regionevel-visits",
      version: 3,
      partialize: (state) => ({ visits: state.visits }),
 // Only persist visits, not derived scores
      onRehydrateStorage: (state) => {
        return () => {
          state?.setHasHydrated(true);
        };
      },
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as any;
        
        // Version 1 -> 2: Standardize regionId to padded 5-digit format
        if (version < 2 && state && state.visits) {
          state.visits = state.visits.map((v: any) => ({
            ...v,
            regionId: padId(v.regionId),
          }));
        }

        // Version 2 -> 3: Rename 'live' category to 'residence'
        if (version < 3 && state && state.visits) {
          state.visits = state.visits.map((v: any) => ({
            ...v,
            category: v.category === "live" ? "residence" : v.category,
          }));
        }

        // Always ensure only valid categories are kept
        if (state && state.visits) {
          state.visits = state.visits.filter((v: any) => !!VISIT_CONFIG[v.category as VisitCategory]);
        }

        return state;
      },
    }),
  ),
);
