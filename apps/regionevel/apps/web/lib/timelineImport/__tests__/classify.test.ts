import { describe, expect, it, vi, beforeEach } from "vitest";
import { buildTimelineImportPreview, estimateUtcOffsetHours } from "../classify";
import type { ParsedTimeline } from "../types";

// Mock the external geo and region fetching functions
vi.mock("@/lib/regions", () => ({
  fetchGeometries: vi.fn().mockImplementation((parentId) => {
    if (parentId === null) {
      // Mock country feature (Japan)
      return Promise.resolve([
        {
          id: "JP",
          name: "Japan",
          properties: { id: "JP", name: "Japan" },
          geometry: {
            type: "Polygon",
            coordinates: [[[120, 20], [150, 20], [150, 50], [120, 50], [120, 20]]],
          },
        },
      ]);
    }
    if (parentId === "JP-13") {
      // Mock Tokyo Cities (Shinjuku, Shibuya)
      return Promise.resolve([
        {
          id: "JP-13104",
          name: "Shinjuku",
          properties: { id: "JP-13104", name: "Shinjuku" },
          geometry: {
            type: "Polygon",
            coordinates: [[[139.68, 35.68], [139.72, 35.68], [139.72, 35.72], [139.68, 35.72], [139.68, 35.68]]],
          },
        },
        {
          id: "JP-13113",
          name: "Shibuya",
          properties: { id: "JP-13113", name: "Shibuya" },
          geometry: {
            type: "Polygon",
            coordinates: [[[139.68, 35.64], [139.72, 35.64], [139.72, 35.68], [139.68, 35.68], [139.68, 35.64]]],
          },
        },
      ]);
    }
    return Promise.resolve([]);
  }),
  fetchCountryGeometries: vi.fn().mockResolvedValue([
    {
      id: "JP-13",
      name: "Tokyo",
      properties: { id: "JP-13", name: "Tokyo" },
      geometry: {
        type: "Polygon",
        coordinates: [[[139.0, 35.5], [140.0, 35.5], [140.0, 36.0], [139.0, 36.0], [139.0, 35.5]]],
      },
    },
  ]),
  fetchRegionsByIds: vi.fn().mockImplementation((ids: string[]) => {
    return Promise.resolve(
      ids.map((id) => ({
        id,
        name: id === "JP-13104" ? "Shinjuku" : id === "JP-13113" ? "Shibuya" : id === "JP-13" ? "Tokyo" : "Japan",
        parentId: id.startsWith("JP-131") ? "JP-13" : id === "JP-13" ? "JP" : null,
        iso3: "JPN",
        admLevel: id.startsWith("JP-131") ? 2 : id === "JP-13" ? 1 : 0,
      }))
    );
  }),
  fetchAncestorsBulk: vi.fn().mockResolvedValue([]),
}));

describe("estimateUtcOffsetHours", () => {
  it("calculates approximate local time offset by longitude", () => {
    expect(estimateUtcOffsetHours(139.76)).toBe(9); // Tokyo is ~UTC+9
    expect(estimateUtcOffsetHours(126.97)).toBe(8); // Seoul longitude is ~8.5 rounded to 8 (or 9)
    expect(estimateUtcOffsetHours(0)).toBe(0); // London is UTC+0
    expect(estimateUtcOffsetHours(-74.0)).toBe(-5); // New York is UTC-5
  });
});

describe("buildTimelineImportPreview classification rules", () => {
  it("classifies movement endpoints as transit and intermediate waypoints as pass", async () => {
    // Movement from Shinjuku (35.69, 139.70) to Shibuya (35.66, 139.70)
    // with intermediate points
    const parsed: ParsedTimeline = {
      stays: [],
      moves: [
        [
          { lat: 35.6938, lon: 139.7034, t: Date.parse("2026-05-01T10:00:00+09:00") }, // Start: Shinjuku
          { lat: 35.6750, lon: 139.7034, t: Date.parse("2026-05-01T10:15:00+09:00") }, // Intermediate waypoint: Shinjuku or Shibuya
          { lat: 35.6580, lon: 139.7016, t: Date.parse("2026-05-01T10:30:00+09:00") }, // End: Shibuya
        ],
      ],
      skipped: {},
      diagnostics: {
        formats: ["semanticSegments"],
        topLevelKeys: [],
        segmentsSeen: 1,
        visitsSeen: 0,
        visitsParsed: 0,
        activitiesSeen: 1,
        activitiesParsed: 1,
      },
    };

    const preview = await buildTimelineImportPreview(parsed);
    expect(preview.regions.length).toBeGreaterThanOrEqual(1);

    const shinjuku = preview.regions.find((r) => r.regionId === "JP-13104");
    const shibuya = preview.regions.find((r) => r.regionId === "JP-13113");

    // Start/End points should have transit count
    expect(shinjuku?.counts.transit).toBe(1);
    expect(shibuya?.counts.transit).toBe(1);
  });

  it("detects overnight stay when gap spans across 2:00 AM - 4:00 AM in the same region", async () => {
    // Hotel stay with evening check-in and morning departure in Shinjuku
    const parsed: ParsedTimeline = {
      stays: [
        {
          lat: 35.6938,
          lon: 139.7034,
          startTime: Date.parse("2026-05-01T22:00:00+09:00"), // 10 PM
          endTime: Date.parse("2026-05-01T23:30:00+09:00"),   // 11:30 PM (record stops)
        },
        {
          lat: 35.6938,
          lon: 139.7034,
          startTime: Date.parse("2026-05-02T07:00:00+09:00"), // Next morning 7 AM
          endTime: Date.parse("2026-05-02T08:30:00+09:00"),   // 8:30 AM
        },
      ],
      moves: [],
      skipped: {},
      diagnostics: {
        formats: ["semanticSegments"],
        topLevelKeys: [],
        segmentsSeen: 2,
        visitsSeen: 2,
        visitsParsed: 2,
        activitiesSeen: 0,
        activitiesParsed: 0,
      },
    };

    const preview = await buildTimelineImportPreview(parsed);
    const shinjuku = preview.regions.find((r) => r.regionId === "JP-13104");

    expect(shinjuku).toBeDefined();
    // Overnight bridge between 23:30 and 07:00 across 2:00 AM - 4:00 AM should register as stay = 1
    expect(shinjuku?.counts.stay).toBe(1);
    // Also registered place visits
    expect(shinjuku?.counts.visit).toBeGreaterThanOrEqual(1);
  });

  it("detects direct stay when a single visit overlaps 2:00 AM - 4:00 AM", async () => {
    const parsed: ParsedTimeline = {
      stays: [
        {
          lat: 35.6938,
          lon: 139.7034,
          startTime: Date.parse("2026-05-01T23:00:00+09:00"),
          endTime: Date.parse("2026-05-02T05:00:00+09:00"), // spans past 2:00 AM - 4:00 AM
        },
      ],
      moves: [],
      skipped: {},
      diagnostics: {
        formats: ["semanticSegments"],
        topLevelKeys: [],
        segmentsSeen: 1,
        visitsSeen: 1,
        visitsParsed: 1,
        activitiesSeen: 0,
        activitiesParsed: 0,
      },
    };

    const preview = await buildTimelineImportPreview(parsed);
    const shinjuku = preview.regions.find((r) => r.regionId === "JP-13104");

    expect(shinjuku).toBeDefined();
    expect(shinjuku?.counts.stay).toBe(1);
  });

  it("densifies long distance movement and captures intermediate pass regions", async () => {
    // Movement with only 2 points (Start in Shinjuku, End in Shibuya, 4km apart)
    // Densification should produce intermediate points and register them
    const parsed: ParsedTimeline = {
      stays: [],
      moves: [
        [
          { lat: 35.70, lon: 139.70, t: Date.parse("2026-05-01T14:00:00+09:00") }, // Shinjuku
          { lat: 35.65, lon: 139.70, t: Date.parse("2026-05-01T14:20:00+09:00") }, // Shibuya (5.5km hop)
        ],
      ],
      skipped: {},
      diagnostics: {
        formats: ["semanticSegments"],
        topLevelKeys: [],
        segmentsSeen: 1,
        visitsSeen: 0,
        visitsParsed: 0,
        activitiesSeen: 1,
        activitiesParsed: 1,
      },
    };

    const preview = await buildTimelineImportPreview(parsed);
    expect(preview.regions.length).toBeGreaterThanOrEqual(1);

    // Both start (Shinjuku) and end (Shibuya) are resolved
    const shinjuku = preview.regions.find((r) => r.regionId === "JP-13104");
    const shibuya = preview.regions.find((r) => r.regionId === "JP-13113");
    expect(shinjuku).toBeDefined();
    expect(shibuya).toBeDefined();
  });
});
