import { describe, expect, it } from "vitest";
import type { Region, RegionVisit } from "@regionevel/types";
import {
  getNextIncrement,
  getRegionScore,
  getScoreColor,
  getMapColor,
} from "../scoring";

const REGION_ID = "KOR-ADM1-001";

const createMaps = (regions: Region[]) => {
  const regionMap = new Map<string, Region>();
  const parentIdMap = new Map<string | null, Region[]>();
  regions.forEach(r => {
    regionMap.set(r.id, r);
    const siblings = parentIdMap.get(r.parentId) || [];
    siblings.push(r);
    parentIdMap.set(r.parentId, siblings);
  });
  return { regionMap, parentIdMap };
};

const DEFAULT_REGION: Region = { id: REGION_ID, parentId: null, name: "Test", iso3: "KOR", admLevel: 1 };
const { regionMap: defaultMap, parentIdMap: defaultParentMap } = createMaps([DEFAULT_REGION]);

describe("getRegionScore", () => {
  it("returns zero score for no visits", () => {
    const score = getRegionScore(REGION_ID, [], defaultMap, defaultParentMap);
    expect(score.directScore).toBe(0);
    expect(score.totalScore).toBe(0);
    expect(score.breakdown.transit.directCount).toBe(0);
  });

  it("calculates score correctly for mixed visits", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "transit", count: 1 },
      { regionId: REGION_ID, category: "stay", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits, defaultMap, defaultParentMap);
    // transit: 1 * 2 = 2, stay: 1 * 10 = 10 => 12
    expect(score.directScore).toBe(12);
    expect(score.breakdown.transit.points).toBe(2);
    expect(score.breakdown.stay.points).toBe(10);
  });

  it("clamps count to maxCount", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "residence", count: 99 },
    ];
    const score = getRegionScore(REGION_ID, visits, defaultMap, defaultParentMap);
    // residence maxCount=1, pointsPerCount=40
    expect(score.directScore).toBe(40);
    expect(score.breakdown.residence.directCount).toBe(1);
  });

  it("reaches 100 points at full completion", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "pass", count: 5 },
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 3 },
      { regionId: REGION_ID, category: "stay", count: 3 },
      { regionId: REGION_ID, category: "residence", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits, defaultMap, defaultParentMap);
    // 5*1 + 5*2 + 3*5 + 3*10 + 1*40 = 5 + 10 + 15 + 30 + 40 = 100
    expect(score.directScore).toBe(100);
  });
});

describe("getNextIncrement", () => {
  it("returns pass/1 for region with no visits", () => {
    const result = getNextIncrement([], REGION_ID);
    expect(result).toEqual({ category: "pass", newCount: 1 });
  });

  it("moves to next category when current is maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "pass", count: 5 },
      { regionId: REGION_ID, category: "transit", count: 5 },
    ];
    const result = getNextIncrement(visits, REGION_ID);
    expect(result).toEqual({ category: "visit", newCount: 1 });
  });

  it("returns null when all categories maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "pass", count: 5 },
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 3 },
      { regionId: REGION_ID, category: "stay", count: 3 },
      { regionId: REGION_ID, category: "residence", count: 1 },
    ];
    expect(getNextIncrement(visits, REGION_ID)).toBeNull();
  });
});

describe("Hierarchy Scoring", () => {
  const regions: Region[] = [
    { id: "parent", parentId: null, name: "Seoul", iso3: "KOR", admLevel: 1 },
    {
      id: "child1",
      parentId: "parent",
      name: "Gangnam",
      iso3: "KOR",
      admLevel: 2,
    },
    {
      id: "child2",
      parentId: "parent",
      name: "Jongno",
      iso3: "KOR",
      admLevel: 2,
    },
  ];

  it("sums child direct scores and calculates rateScore", () => {
    const visits: RegionVisit[] = [
      { regionId: "child1", category: "transit", count: 1 },
      { regionId: "child2", category: "transit", count: 1 },
    ];
    // Each child: transit=1 => directScore=2, totalScore=2
    // Parent: childSum = 2+2=4. childMax = 2*50=100.
    // rateScore = (4/100)*100 = 4.
    const { regionMap, parentIdMap } = createMaps(regions);
    const score = getRegionScore("parent", visits, regionMap, parentIdMap);
    expect(score.rateScore).toBe(4);
    expect(score.scoreType).toBe("orange");
    expect(score.totalScore).toBe(4);
  });

  it("handles mixed parent direct and child aggregated visits", () => {
    const visits: RegionVisit[] = [
      { regionId: "parent", category: "transit", count: 1 },
      { regionId: "child1", category: "visit", count: 1 },
    ];
    // parent: directScore = 7 (parent transit 2 + child1 visit 5)
    // child1: directScore = 5 (visit), rateScore = 0 => totalScore = 5
    // parent: childSum = 5 + 0 = 5. childMax = 2 * 50 = 100.
    // rateScore = (5 / 100) * 100 = 5.
    // Since rateScore > 0, scoreType = orange, totalScore = rateScore = 5.
    const { regionMap, parentIdMap } = createMaps(regions);
    const score = getRegionScore("parent", visits, regionMap, parentIdMap);
    expect(score.rateScore).toBe(5);
    expect(score.directScore).toBe(7);
    expect(score.totalScore).toBe(5);
    expect(score.scoreType).toBe("orange");
  });

  it("returns 0 rateScore for leaf regions", () => {
    const { regionMap, parentIdMap } = createMaps(regions);
    const score = getRegionScore("child1", [], regionMap, parentIdMap);
    expect(score.rateScore).toBe(0);
    expect(score.scoreType).toBe("blue");
  });
});

/**
 * Bands are 8 / 18 / 31 / 51, matching getMapColor and getCumulativeColor in
 * the same module — the three ramps have to agree or the same score renders
 * as two different colours depending on which one drew it.
 *
 * These expectations previously read 10 / 30 / 50 / 70, which no ramp in the
 * codebase has ever used, and had been failing since they were written.
 */
describe("getScoreColor", () => {
  it("returns base color for 0 score", () => {
    expect(getScoreColor(0)).toBe("#f8fafc");
  });
  it("returns light blue below 8", () => {
    expect(getScoreColor(1)).toBe("#93c5fd");
    expect(getScoreColor(7)).toBe("#93c5fd");
  });
  it("returns medium blue for 8-17", () => {
    expect(getScoreColor(8)).toBe("#60a5fa");
    expect(getScoreColor(17)).toBe("#60a5fa");
  });
  it("returns deep blue for 18-30", () => {
    expect(getScoreColor(18)).toBe("#3b82f6");
    expect(getScoreColor(30)).toBe("#3b82f6");
  });
  it("returns very deep blue for 31-50", () => {
    expect(getScoreColor(31)).toBe("#2563eb");
    expect(getScoreColor(50)).toBe("#2563eb");
  });
  it("returns darkest blue from 51", () => {
    expect(getScoreColor(51)).toBe("#1e3a8a");
    expect(getScoreColor(100)).toBe("#1e3a8a");
  });

  it("agrees with the map ramp it shares bands with", () => {
    // Same score, same colour, whichever function drew it.
    for (const score of [0, 1, 7, 8, 17, 18, 30, 31, 50, 51, 100]) {
      expect(getScoreColor(score)).toBe(
        getMapColor({ totalScore: score, scoreType: "blue", directScore: score } as never),
      );
    }
  });
});
