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
    expect(score.breakdown.passing.count).toBe(0);
  });

  it("calculates score correctly for mixed visits", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 3 },
      { regionId: REGION_ID, category: "accommodation", count: 2 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // passing: 3*1=3, accommodation: 2*10=20 => 23
    expect(score.directScore).toBe(23);
    expect(score.breakdown.passing.points).toBe(3);
    expect(score.breakdown.accommodation.points).toBe(20);
  });

  it("clamps count to maxCount", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "residence", count: 99 },
    ];
    const score = getRegionScore(REGION_ID, visits);
    // residence maxCount=1, pointsPerCount=40
    expect(score.directScore).toBe(40);
    expect(score.breakdown.residence.count).toBe(1);
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
    expect(score.directScore).toBe(100);
  });
});

describe("getNextIncrement", () => {
  it("returns passing/1 for region with no visits", () => {
    const result = getNextIncrement([], REGION_ID);
    expect(result).toEqual({ category: "passing", newCount: 1 });
  });

  it("advances within same category when maxCount not reached", () => {
    const visits: RegionVisit[] = [
      { regionId: REGION_ID, category: "passing", count: 3 },
    ];
    const result = getNextIncrement(visits, REGION_ID);
    expect(result).toEqual({ category: "passing", newCount: 4 });
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
      { regionId: "child1", category: "passing", count: 3 },
      { regionId: "child2", category: "passing", count: 4 },
    ];
    // passing: 3 + 4 = 7, but capped at maxCount=5.
    // Score should be 5 * 1 (pointsPerCount) = 5.
    expect(getAggregatedChildScore("parent", regions, visits)).toBe(5);
  });

  it("handles mixed parent direct and child aggregated visits", () => {
    const visits: RegionVisit[] = [
      { regionId: "parent", category: "passing", count: 1 },
      { regionId: "child1", category: "passing", count: 2 },
    ];
    // Total passing: 1 (direct) + 2 (child) = 3.
    // 3 * 1 = 3 points.
    const score = getRegionScore("parent", visits, regions);
    expect(score.totalScore).toBe(3);
    expect(score.directScore).toBe(1);
    expect(score.aggregatedChildScore).toBe(2);
  });

  it("returns 0 for leaf regions", () => {
    expect(getAggregatedChildScore("child1", regions, [])).toBe(0);
  });
});

describe("getScoreColor", () => {
  it("returns light color for 0 score", () => {
    expect(getScoreColor(0)).toBe("#f8fafc");
  });
  it("returns dark color for 100 score", () => {
    expect(getScoreColor(100)).toBe("#1e3a8a");
  });
});
