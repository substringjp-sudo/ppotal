import { describe, expect, it } from "vitest";
import { parseCoordinate, parseGoogleTimeline } from "../parseGoogleTimeline";

/**
 * Fixtures follow the shapes Google actually writes. The degree-sign spelling
 * is the one that broke the importer in the field: every coordinate in an
 * Android export reads as NaN under a plain Number(), so the file parsed to
 * nothing and the UI reported an empty timeline.
 */

describe("parseCoordinate", () => {
  it("reads the spellings Google ships", () => {
    expect(parseCoordinate("geo:35.6812,139.7671")).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate("35.6812,139.7671")).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate("35.6812°, 139.7671°")).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate("35.6812° , 139.7671°")).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate({ latLng: "35.6812°, 139.7671°" })).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate({ latitude: 35.6812, longitude: 139.7671 })).toEqual([35.6812, 139.7671]);
    expect(parseCoordinate({ latitudeE7: 356812000, longitudeE7: 1397671000 }))
      .toEqual([35.6812, 139.7671]);
  });

  it("keeps negatives", () => {
    expect(parseCoordinate("geo:-33.8688,151.2093")).toEqual([-33.8688, 151.2093]);
    expect(parseCoordinate("37.4220041°, -122.0862515°")).toEqual([37.4220041, -122.0862515]);
  });

  it("refuses values that cannot be a coordinate", () => {
    expect(parseCoordinate("Home")).toBeNull();
    expect(parseCoordinate("")).toBeNull();
    expect(parseCoordinate(null)).toBeNull();
    // Out of range means we latched onto the wrong two numbers.
    expect(parseCoordinate("1000.0, 2000.0")).toBeNull();
  });
});

const ANDROID_EXPORT = {
  semanticSegments: [
    {
      startTime: "2025-03-01T09:00:00.000+09:00",
      endTime: "2025-03-01T09:40:00.000+09:00",
      activity: {
        start: { latLng: "35.6812°, 139.7671°" },
        end: { latLng: "35.4437°, 139.6380°" },
        distanceMeters: "30000",
        topCandidate: { type: "in passenger vehicle", probability: "0.9" },
      },
    },
    {
      startTime: "2025-03-01T10:00:00.000+09:00",
      endTime: "2025-03-01T14:00:00.000+09:00",
      visit: {
        hierarchyLevel: "0",
        probability: "0.95",
        topCandidate: {
          placeId: "ChIJ_abc",
          semanticType: "Inferred Home",
          probability: "0.9",
          placeLocation: { latLng: "35.4437°, 139.6380°" },
        },
      },
    },
  ],
};

/** iOS writes the same segments as a bare top-level array. */
const IOS_EXPORT = [
  {
    startTime: "2025-03-02T09:00:00Z",
    endTime: "2025-03-02T09:30:00Z",
    activity: {
      start: "geo:48.8566,2.3522",
      end: "geo:48.8584,2.2945",
      topCandidate: { type: "walking" },
    },
  },
  {
    startTime: "2025-03-02T10:00:00Z",
    endTime: "2025-03-02T12:00:00Z",
    visit: { topCandidate: { placeLocation: "geo:48.8584,2.2945" } },
  },
];

const TAKEOUT_EXPORT = {
  timelineObjects: [
    {
      placeVisit: {
        location: { latitudeE7: 356812000, longitudeE7: 1397671000 },
        duration: { startTimestamp: "2024-05-01T10:00:00Z", endTimestamp: "2024-05-01T13:00:00Z" },
      },
    },
    {
      activitySegment: {
        startLocation: { latitudeE7: 356812000, longitudeE7: 1397671000 },
        endLocation: { latitudeE7: 354437000, longitudeE7: 1396380000 },
        duration: { startTimestamp: "2024-05-01T14:00:00Z", endTimestamp: "2024-05-01T15:00:00Z" },
      },
    },
  ],
};

describe("parseGoogleTimeline", () => {
  it("reads the Android export, degree signs and all", () => {
    const r = parseGoogleTimeline(ANDROID_EXPORT);
    expect(r.diagnostics.formats).toContain("semanticSegments");
    expect(r.moves).toHaveLength(1);
    expect(r.stays).toHaveLength(1);
    expect(r.stays[0]!.lat).toBeCloseTo(35.4437, 4);
    expect(r.stays[0]!.lon).toBeCloseTo(139.638, 4);
    expect(r.moves[0]![0]!.lat).toBeCloseTo(35.6812, 4);
  });

  it("reads the iOS export, which is a bare array of segments", () => {
    const r = parseGoogleTimeline(IOS_EXPORT);
    expect(r.diagnostics.formats).toContain("segmentArray");
    expect(r.moves).toHaveLength(1);
    expect(r.stays).toHaveLength(1);
    expect(r.stays[0]!.lat).toBeCloseTo(48.8584, 4);
  });

  it("reads the older Takeout export", () => {
    const r = parseGoogleTimeline(TAKEOUT_EXPORT);
    expect(r.diagnostics.formats).toContain("timelineObjects");
    expect(r.stays).toHaveLength(1);
    expect(r.moves).toHaveLength(1);
    expect(r.stays[0]!.lat).toBeCloseTo(35.6812, 4);
  });

  it("takes several Takeout months as one import", () => {
    const r = parseGoogleTimeline([TAKEOUT_EXPORT, TAKEOUT_EXPORT]);
    expect(r.stays).toHaveLength(2);
    expect(r.moves).toHaveLength(2);
  });

  it("does not mistake a bare segment array for a list of files", () => {
    // The guard that tells these apart: an array of segments is one root, an
    // array of export objects is several.
    const r = parseGoogleTimeline(IOS_EXPORT);
    expect(r.diagnostics.segmentsSeen).toBe(2);
  });

  it("finds segments nested under an unfamiliar key", () => {
    const r = parseGoogleTimeline({ someFutureKey: ANDROID_EXPORT.semanticSegments });
    expect(r.moves).toHaveLength(1);
    expect(r.stays).toHaveLength(1);
  });

  it("reports the raw-records format rather than silently finding nothing", () => {
    const r = parseGoogleTimeline({ locations: [{ latitudeE7: 1, longitudeE7: 2 }] });
    expect(r.diagnostics.formats).toContain("records");
    expect(r.stays).toHaveLength(0);
  });

  it("keeps an unreadable coordinate so the failure can name it", () => {
    const r = parseGoogleTimeline({
      semanticSegments: [{
        startTime: "2025-03-01T09:00:00Z",
        endTime: "2025-03-01T09:40:00Z",
        visit: { topCandidate: { placeLocation: { latLng: "N/A" } } },
      }],
    });
    expect(r.stays).toHaveLength(0);
    expect(r.diagnostics.visitsSeen).toBe(1);
    expect(r.diagnostics.visitsParsed).toBe(0);
    expect(r.diagnostics.sampleUnparsedCoordinate).toBe("N/A");
  });

  it("records the top-level keys of a shape it does not know", () => {
    const r = parseGoogleTimeline({ someOtherThing: 1, andAnother: 2 });
    expect(r.diagnostics.formats).toContain("unrecognised");
    expect(r.diagnostics.topLevelKeys).toEqual(["someOtherThing", "andAnother"]);
  });
});
