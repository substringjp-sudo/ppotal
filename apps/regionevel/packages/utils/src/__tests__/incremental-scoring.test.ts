import { describe, expect, it } from "vitest";
import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import { getRegionScore } from "../scoring";
import { padId } from "../id";

/**
 * The map store scores incrementally: it keeps the previous scores as a memo
 * and only invalidates the regions in `affectedIds` — the ones with visits,
 * the regions newly loaded into the store, and every ancestor of both.
 *
 * That is only sound if the resulting scores are indistinguishable from a cold
 * full pass. These tests pin that equivalence down, because the failure mode is
 * silent: a stale score that simply never updates.
 */

interface Maps {
  regionMap: Map<string, Region>;
  parentIdMap: Map<string | null, Region[]>;
}

function createMaps(regions: Region[]): Maps {
  const regionMap = new Map<string, Region>();
  const parentIdMap = new Map<string | null, Region[]>();
  for (const r of regions) {
    const id = padId(r.id);
    const pid = padId(r.parentId);
    regionMap.set(id, r);
    const siblings = parentIdMap.get(pid) || [];
    siblings.push(r);
    parentIdMap.set(pid, siblings);
  }
  return { regionMap, parentIdMap };
}

function visitsToMap(visits: RegionVisit[]): Map<string, RegionVisit[]> {
  const m = new Map<string, RegionVisit[]>();
  for (const v of visits) {
    const rid = padId(v.regionId);
    const list = m.get(rid) || [];
    list.push(v);
    m.set(rid, list);
  }
  return m;
}

/** The store's own rule: a region and every ancestor above it. */
function addWithAncestors(id: string, regionMap: Map<string, Region>, into: Set<string>) {
  let currId: string | null = padId(id);
  while (currId && !into.has(currId)) {
    into.add(currId);
    const reg = regionMap.get(currId);
    currId = reg ? padId(reg.parentId) : null;
  }
}

/** Cold pass: no memo, everything recomputed. */
function scoreAll(regions: Region[], visits: RegionVisit[]): Record<string, RegionScore> {
  const { regionMap, parentIdMap } = createMaps(regions);
  const vMap = visitsToMap(visits);
  const affectedIds = new Set<string>();
  for (const v of visits) addWithAncestors(v.regionId, regionMap, affectedIds);

  const countMemo = new Map<string, Record<VisitCategory, number>>();
  const scoreMemo = new Map<string, RegionScore>();
  const out: Record<string, RegionScore> = {};
  for (const r of regions) {
    const id = padId(r.id);
    out[id] = getRegionScore(id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, true);
  }
  return out;
}

/** Warm pass: the store's incremental path, seeded with the previous scores. */
function scoreIncrementally(
  regions: Region[],
  visits: RegionVisit[],
  previousScores: Record<string, RegionScore>,
  newRegionIds: Set<string>,
): Record<string, RegionScore> {
  const { regionMap, parentIdMap } = createMaps(regions);
  const vMap = visitsToMap(visits);

  const affectedIds = new Set<string>();
  for (const v of visits) addWithAncestors(v.regionId, regionMap, affectedIds);
  for (const id of newRegionIds) addWithAncestors(id, regionMap, affectedIds);

  const out: Record<string, RegionScore> = { ...previousScores };
  const countMemo = new Map<string, Record<VisitCategory, number>>();
  const scoreMemo = new Map<string, RegionScore>();
  for (const [id, score] of Object.entries(previousScores)) scoreMemo.set(id, score);

  // Purge every affected id before scoring anything — see the store.
  for (const id of affectedIds) {
    scoreMemo.delete(id);
    countMemo.delete(id);
  }

  const targets = Array.from(affectedIds)
    .map((id) => regionMap.get(id))
    .filter((r): r is Region => !!r);

  for (const r of targets) {
    const id = padId(r.id);
    out[id] = getRegionScore(id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, true);
  }
  return out;
}

const country: Region = { id: "001", parentId: null, name: "Country", iso3: "TST", admLevel: 0 };
const prefA: Region = { id: "0010001", parentId: "001", name: "Pref A", iso3: "TST", admLevel: 1 };
const prefB: Region = { id: "0010002", parentId: "001", name: "Pref B", iso3: "TST", admLevel: 1 };
const cityA1: Region = { id: "001000100001", parentId: "0010001", name: "City A1", iso3: "TST", admLevel: 2 };
const cityA2: Region = { id: "001000100002", parentId: "0010001", name: "City A2", iso3: "TST", admLevel: 2 };
const cityB1: Region = { id: "001000200001", parentId: "0010002", name: "City B1", iso3: "TST", admLevel: 2 };

function expectSameScores(a: Record<string, RegionScore>, b: Record<string, RegionScore>, ids: string[]) {
  for (const id of ids) {
    expect(a[id], `score present for ${id}`).toBeDefined();
    expect(b[id], `score present for ${id}`).toBeDefined();
    expect({ id, ...a[id] }).toEqual({ id, ...b[id] });
  }
}

describe("incremental scoring matches a full recompute", () => {
  it("agrees after new child regions are loaded under an already-scored parent", () => {
    const visits: RegionVisit[] = [
      { regionId: cityA1.id, category: "stay", count: 1 },
      { regionId: cityA1.id, category: "visit", count: 2 },
    ];

    // The map starts with only the country and its prefectures loaded.
    const before = [country, prefA, prefB];
    const previous = scoreAll(before, visits);

    // Drilling in loads the cities.
    const after = [...before, cityA1, cityA2, cityB1];
    const newIds = new Set([cityA1, cityA2, cityB1].map((r) => padId(r.id)));

    const incremental = scoreIncrementally(after, visits, previous, newIds);
    const full = scoreAll(after, visits);

    expectSameScores(incremental, full, after.map((r) => padId(r.id)));
  });

  it("propagates a newly loaded child's score up to the country", () => {
    // The visit is in a city that has not been loaded yet, so the country's
    // score must change the moment that city arrives.
    const visits: RegionVisit[] = [{ regionId: cityB1.id, category: "stay", count: 2 }];

    const before = [country, prefA, prefB];
    const previous = scoreAll(before, visits);

    const after = [...before, cityA1, cityA2, cityB1];
    const newIds = new Set([cityA1, cityA2, cityB1].map((r) => padId(r.id)));

    const incremental = scoreIncrementally(after, visits, previous, newIds);
    const full = scoreAll(after, visits);

    expectSameScores(incremental, full, after.map((r) => padId(r.id)));
    expect(incremental[padId(country.id)]!.hasVisit).toBe(true);
    expect(incremental[padId(prefB.id)]!.hasVisit).toBe(true);
  });

  it("leaves untouched branches alone but still equals a full pass", () => {
    const visits: RegionVisit[] = [{ regionId: cityA1.id, category: "transit", count: 3 }];

    const all = [country, prefA, prefB, cityA1, cityA2, cityB1];
    const previous = scoreAll(all, visits);

    // No new regions at all — a redundant pass must be a no-op.
    const incremental = scoreIncrementally(all, visits, previous, new Set());
    const full = scoreAll(all, visits);

    expectSameScores(incremental, full, all.map((r) => padId(r.id)));
  });

  it("agrees when regions load in several separate batches", () => {
    const visits: RegionVisit[] = [
      { regionId: cityA2.id, category: "visit", count: 1 },
      { regionId: cityB1.id, category: "pass", count: 4 },
    ];

    let loaded: Region[] = [country];
    let scores = scoreAll(loaded, visits);

    for (const batch of [[prefA, prefB], [cityA1, cityA2], [cityB1]]) {
      loaded = [...loaded, ...batch];
      scores = scoreIncrementally(loaded, visits, scores, new Set(batch.map((r) => padId(r.id))));
    }

    const full = scoreAll(loaded, visits);
    expectSameScores(scores, full, loaded.map((r) => padId(r.id)));
  });
});
