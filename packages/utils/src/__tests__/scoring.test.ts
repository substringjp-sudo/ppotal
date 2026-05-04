import { describe, expect, it } from "vitest";
import type { Region, RegionVisit } from "@regionevel/types";
import {
  getNextIncrement,
  getRegionScore,
  getScoreColor,
} from "../scoring";

const REGION_ID = "KOR-ADM1-001";

describe("getRegionScore", () => {
  it("returns zero score for no visits", () => {
    const score = getRegionScore(REGION_ID, []);
    expect(score.directScore).toBe(0);
    expect(score.totalScore).toBe(0);
    expect(score.breakdown.transit.directCount).toBe(0);
  });

  it("calculates score correctly for mixed visits", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "transit", count: 1 },
      { regionId: REGION_ID, category: "stay", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // transit: 1 * 2 = 2, stay: 1 * 6 = 6 => 8
    expect(score.directScore).toBe(8);
    expect(score.breakdown.transit.points).toBe(2);
    expect(score.breakdown.stay.points).toBe(6);
  });

  it("clamps count to maxCount", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "live", count: 99 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // live maxCount=1, pointsPerCount=40
    expect(score.directScore).toBe(40);
    expect(score.breakdown.live.directCount).toBe(1);
  });

  it("reaches 100 points at full completion", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 5 },
      { regionId: REGION_ID, category: "stay", count: 5 },
      { regionId: REGION_ID, category: "live", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // 5*2 + 5*4 + 5*6 + 1*40 = 10 + 20 + 30 + 40 = 100
    expect(score.directScore).toBe(100);
  });
});

describe("getNextIncrement", () => {
  it("returns transit/1 for region with no visits", () => {
    const result = getNextIncrement([], REGION_ID);
    expect(result).toEqual({ category: "transit", newCount: 1 });
  });

  it("moves to next category when current is maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "transit", count: 5 },
    ];
    const result = getNextIncrement(visits, REGION_ID);
    expect(result).toEqual({ category: "visit", newCount: 1 });
  });

  it("returns null when all categories maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 5 },
      { regionId: REGION_ID, category: "stay", count: 5 },
      { regionId: REGION_ID, category: "live", count: 1 },
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

  it("sums child direct scores and calculates rankScore", () => {
    const visits: RegionVisit[] = [
      { regionId: "child1", category: "transit", count: 1 },
      { regionId: "child2", category: "transit", count: 1 },
    ];
    // Each child: transit=1 => directScore=2, totalScore=2
    // Parent: childSum = 2+2=4. childMax = 2*50=100.
    // rankScore = (4/100)*100 = 4.
    const score = getRegionScore("parent", visits, regions);
    expect(score.rankScore).toBe(4);
    expect(score.scoreType).toBe("orange");
    expect(score.totalScore).toBe(4);
  });

  it("handles mixed parent direct and child aggregated visits", () => {
    const visits: RegionVisit[] = [
      { regionId: "parent", category: "transit", count: 1 },
      { regionId: "child1", category: "visit", count: 1 },
    ];
    // parent: directScore = 2 (transit)
    // child1: directScore = 4 (visit), rankScore = 0 => totalScore = 4
    // parent: childSum = 4 + 0 = 4. childMax = 2 * 50 = 100.
    // rankScore = (4 / 100) * 100 = 4.
    // Since rankScore > 0, scoreType = orange, totalScore = rankScore = 4.
    const score = getRegionScore("parent", visits, regions);
    expect(score.rankScore).toBe(4);
    expect(score.directScore).toBe(2);
    expect(score.totalScore).toBe(4);
    expect(score.scoreType).toBe("orange");
  });

  it("returns 0 rankScore for leaf regions", () => {
    const score = getRegionScore("child1", [], regions);
    expect(score.rankScore).toBe(0);
    expect(score.scoreType).toBe("blue");
  });
});

describe("getScoreColor", () => {
  it("returns base color for 0 score", () => {
    expect(getScoreColor(0)).toBe("#f8fafc");
  });
  it("returns light blue for score < 10", () => {
    expect(getScoreColor(5)).toBe("#eff6ff");
    expect(getScoreColor(9)).toBe("#eff6ff");
  });
  it("returns medium blue for 10-29 score", () => {
    expect(getScoreColor(10)).toBe("#bfdbfe");
    expect(getScoreColor(29)).toBe("#bfdbfe");
  });
  it("returns deep blue for 30-49 score", () => {
    expect(getScoreColor(30)).toBe("#60a5fa");
    expect(getScoreColor(49)).toBe("#60a5fa");
  });
  it("returns very deep blue for 50-69 score", () => {
    expect(getScoreColor(50)).toBe("#2563eb");
    expect(getScoreColor(69)).toBe("#2563eb");
  });
  it("returns darkest blue for 70+ score", () => {
    expect(getScoreColor(70)).toBe("#1e3a8a");
    expect(getScoreColor(100)).toBe("#1e3a8a");
  });
});
