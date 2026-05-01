import { describe, expect, it } from "vitest";
import type { Region, RegionVisit } from "@regionevel/types";
import {
  getAggregatedChildScore,
  getNextIncrement,
  getRegionScore,
  getScoreColor,
} from "../scoring.js";

const REGION_ID = "KOR-ADM1-001";

describe("getRegionScore", () => {
  it("returns zero score for no visits", () => {
    const score = getRegionScore(REGION_ID, []);
    expect(score.directScore).toBe(0);
    expect(score.totalScore).toBe(0);
    expect(score.breakdown.passing.directCount).toBe(0);
  });

  it("calculates score correctly for mixed visits", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 1 },
      { regionId: REGION_ID, category: "accommodation", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // passing: 1, accommodation: 10 => 11
    expect(score.directScore).toBe(11);
    expect(score.breakdown.passing.points).toBe(1);
    expect(score.breakdown.accommodation.points).toBe(10);
  });

  it("clamps count to maxCount", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "residence", count: 99 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // residence maxCount=1, pointsPerCount=40
    expect(score.directScore).toBe(40);
    expect(score.breakdown.residence.directCount).toBe(1);
  });

  it("reaches 100 points at full completion", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 5 },
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 3 },
      { regionId: REGION_ID, category: "accommodation", count: 3 },
      { regionId: REGION_ID, category: "residence", count: 1 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // 5*1 + 5*2 + 3*5 + 3*10 + 1*40 = 5 + 10 + 15 + 30 + 40 = 100
    expect(score.directScore).toBe(100);
  });
});

describe("getNextIncrement", () => {
  it("returns passing/1 for region with no visits", () => {
    const result = getNextIncrement([], REGION_ID);
    expect(result).toEqual({ category: "passing", newCount: 1 });
  });

  it("moves to next category when current is maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 5 },
    ];
    const result = getNextIncrement(visits, REGION_ID);
    expect(result).toEqual({ category: "transit", newCount: 1 });
  });

  it("returns null when all categories maxed", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 5 },
      { regionId: REGION_ID, category: "transit", count: 5 },
      { regionId: REGION_ID, category: "visit", count: 3 },
      { regionId: REGION_ID, category: "accommodation", count: 3 },
      { regionId: REGION_ID, category: "residence", count: 1 },
    ];
    expect(getNextIncrement(visits, REGION_ID)).toBeNull();
  });
});

describe("getAggregatedChildScore", () => {
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

  it("sums child direct scores and caps at maxCount", () => {
    const visits: RegionVisit[] = [
      { regionId: "child1", category: "passing", count: 1 },
      { regionId: "child2", category: "passing", count: 1 },
    ];
    // passing: 1 + 1 = 2, but capped at maxCount=5 for child regions, however for parent aggregation it's a bit different.
    // In this test, we have 2 children with 'passing'. Parent gets 2 points for 'passing'.
    expect(getAggregatedChildScore("parent", regions, visits)).toBe(2);
  });

  it("handles mixed parent direct and child aggregated visits", () => {
    const visits: RegionVisit[] = [
      { regionId: "parent", category: "passing", count: 1 },
      { regionId: "child1", category: "visit", count: 1 },
    ];
    // parent: passing (1)
    // child1: visit (5)
    // Total: 6
    const score = getRegionScore("parent", visits, regions);
    expect(score.totalScore).toBe(6);
    expect(score.directScore).toBe(1);
    expect(score.aggregatedChildScore).toBe(5);
  });

  it("returns 0 for leaf regions", () => {
    expect(getAggregatedChildScore("child1", regions, [])).toBe(0);
  });
});

describe("getScoreColor", () => {
  it("returns base color for 0 score", () => {
    expect(getScoreColor(0)).toBe("#f8fafc");
  });
  it("returns very light blue for score < 5", () => {
    expect(getScoreColor(3)).toBe("#eff6ff");
  });
  it("returns level 1 color for 5-9 score", () => {
    expect(getScoreColor(5)).toBe("#bfdbfe");
    expect(getScoreColor(9)).toBe("#bfdbfe");
  });
  it("returns level 2 color for 10-29 score", () => {
    expect(getScoreColor(10)).toBe("#60a5fa");
    expect(getScoreColor(29)).toBe("#60a5fa");
  });
  it("returns level 3 color for 30-49 score", () => {
    expect(getScoreColor(30)).toBe("#2563eb");
    expect(getScoreColor(49)).toBe("#2563eb");
  });
  it("returns level 4 color for 50-99 score", () => {
    expect(getScoreColor(50)).toBe("#1e3a8a");
    expect(getScoreColor(99)).toBe("#1e3a8a");
  });
  it("returns darkest color for 100 score", () => {
    expect(getScoreColor(100)).toBe("#0f172a");
  });
});
