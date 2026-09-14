import { describe, expect, it } from "vitest";
import type { Region, RegionVisit } from "@regionevel/types";
import {
  buildTimelineFrames,
  buildVisitEvents,
  canAnimate,
  frameDates,
  syntheticShare,
  visitsAsOf,
} from "../visitTimeline";

const visit = (
  regionId: string,
  category: RegionVisit["category"],
  count: number,
  dates?: string[],
): RegionVisit => ({ regionId, category, count, ...(dates ? { dates } : {}) });

describe("buildVisitEvents", () => {
  it("places one event per counted occasion, oldest first", () => {
    const events = buildVisitEvents([
      visit("000000000001", "pass", 2, ["2026-05-03", "2026-05-01"]),
    ]);
    expect(events.map((e) => e.date)).toEqual(["2026-05-01", "2026-05-03"]);
    expect(events.every((e) => !e.synthetic)).toBe(true);
  });

  it("scatters undated occasions after the last real date", () => {
    const events = buildVisitEvents([
      visit("000000000001", "pass", 1, ["2026-05-01"]),
      visit("000000000002", "visit", 3), // hand-added: no dates at all
    ]);

    const real = events.filter((e) => !e.synthetic);
    const filled = events.filter((e) => e.synthetic);
    expect(real).toHaveLength(1);
    expect(filled).toHaveLength(3);
    for (const e of filled) expect(e.date > "2026-05-01").toBe(true);
  });

  it("fills the gap when a record has fewer dates than occasions", () => {
    const events = buildVisitEvents([
      visit("000000000001", "pass", 3, ["2026-05-01"]),
    ]);
    expect(events.filter((e) => !e.synthetic)).toHaveLength(1);
    expect(events.filter((e) => e.synthetic)).toHaveLength(2);
  });

  it("is deterministic for the same visits, so a replay matches", () => {
    const visits = [
      visit("000000000001", "pass", 1, ["2026-05-01"]),
      visit("000000000002", "visit", 4),
      visit("000000000003", "stay", 2),
    ];
    const a = buildVisitEvents(visits);
    const b = buildVisitEvents(visits);
    expect(a).toEqual(b);
  });

  it("still produces a sequence when nothing is dated at all", () => {
    const events = buildVisitEvents([
      visit("000000000001", "pass", 2),
      visit("000000000002", "visit", 2),
    ]);
    expect(events).toHaveLength(4);
    expect(events.every((e) => e.synthetic)).toBe(true);
    expect(new Set(events.map((e) => e.date)).size).toBeGreaterThan(1);
  });

  it("ignores records with no occasions left", () => {
    expect(buildVisitEvents([visit("000000000001", "pass", 0)])).toEqual([]);
  });
});

describe("visitsAsOf", () => {
  const events = buildVisitEvents([
    visit("000000000001", "pass", 2, ["2026-05-01", "2026-05-05"]),
    visit("000000000002", "visit", 1, ["2026-05-03"]),
  ]);

  it("counts only what had happened by that day", () => {
    expect(visitsAsOf(events, "2026-05-01")).toEqual([
      { regionId: "000000000001", category: "pass", count: 1 },
    ]);
    const mid = visitsAsOf(events, "2026-05-03");
    expect(mid).toHaveLength(2);
    expect(mid.find((v) => v.regionId === "000000000002")?.count).toBe(1);
  });

  it("ends at exactly the totals it started from", () => {
    const final = visitsAsOf(events, "2026-05-05");
    expect(final.find((v) => v.regionId === "000000000001")?.count).toBe(2);
    expect(final.find((v) => v.regionId === "000000000002")?.count).toBe(1);
  });
});

describe("frameDates", () => {
  const events = buildVisitEvents([
    visit("000000000001", "pass", 5, [
      "2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04", "2026-05-05",
    ]),
  ]);

  it("keeps every day when it fits", () => {
    expect(frameDates(events, 90)).toHaveLength(5);
  });

  it("thins a long history but always keeps the last day", () => {
    const dates = frameDates(events, 3);
    expect(dates.length).toBeLessThanOrEqual(3);
    expect(dates[dates.length - 1]).toBe("2026-05-05");
    expect(dates[0]).toBe("2026-05-01");
  });
});

describe("buildTimelineFrames", () => {
  const regions: Region[] = [
    { id: "392", parentId: null, name: "Japan", admLevel: 0, iso3: "JPN" } as Region,
    { id: "3920013", parentId: "392", name: "Tokyo", admLevel: 1, iso3: "JPN" } as Region,
    { id: "392001300001", parentId: "3920013", name: "Shinjuku", admLevel: 2, iso3: "JPN" } as Region,
    { id: "392001300002", parentId: "3920013", name: "Shibuya", admLevel: 2, iso3: "JPN" } as Region,
  ];

  const visits = [
    visit("392001300001", "visit", 1, ["2026-05-01"]),
    visit("392001300002", "visit", 1, ["2026-05-10"]),
  ];

  it("builds one frame per day and accumulates, never dropping", () => {
    const { frames } = buildTimelineFrames(visits, regions, {
      targetIds: ["392001300001", "392001300002"],
    });

    expect(frames.map((f) => f.date)).toEqual(["2026-05-01", "2026-05-10"]);
    expect(frames[0]!.cumulativeOccasions).toBe(1);
    expect(frames[1]!.cumulativeOccasions).toBe(2);

    // Shinjuku is on the map from the first frame; Shibuya only from the second.
    expect(frames[0]!.scores["392001300001"]?.hasVisit).toBe(true);
    expect(frames[0]!.scores["392001300002"]?.hasVisit).toBe(false);
    expect(frames[1]!.scores["392001300002"]?.hasVisit).toBe(true);
  });

  it("gets darker as a region is revisited, never lighter", () => {
    const repeat = [visit("392001300001", "visit", 3, ["2026-05-01", "2026-05-02", "2026-05-03"])];
    const { frames } = buildTimelineFrames(repeat, regions, {
      targetIds: ["392001300001"],
    });

    const scores = frames.map((f) => f.scores["392001300001"]!.directScore);
    expect(scores).toHaveLength(3);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]!).toBeGreaterThan(scores[i - 1]!);
    }
  });

  it("ends on the same score the live map shows", () => {
    const { frames } = buildTimelineFrames(visits, regions, {
      targetIds: ["3920013"],
    });
    const last = frames[frames.length - 1]!;

    // Same inputs through the same scorer the map uses: the replay has to land
    // exactly where the map already is, or the animation is telling a lie.
    const { frames: singleFrame } = buildTimelineFrames(visits, regions, {
      targetIds: ["3920013"],
      maxFrames: 1,
    });
    expect(last.scores["3920013"]).toEqual(singleFrame[0]!.scores["3920013"]);
  });

  it("reports progress once per frame", () => {
    const seen: Array<[number, number]> = [];
    buildTimelineFrames(visits, regions, {
      targetIds: ["392001300001"],
      onProgress: (done, total) => seen.push([done, total]),
    });
    expect(seen).toEqual([[1, 2], [2, 2]]);
  });
});

describe("canAnimate", () => {
  it("says no when everything lands on one day", () => {
    expect(canAnimate([visit("000000000001", "pass", 1, ["2026-05-01"])])).toBe(false);
  });

  it("says yes once there is more than one day", () => {
    expect(canAnimate([
      visit("000000000001", "pass", 2, ["2026-05-01", "2026-05-02"]),
    ])).toBe(true);
  });

  it("says yes for undated visits, which get scattered over several days", () => {
    expect(canAnimate([visit("000000000001", "pass", 4)])).toBe(true);
  });
});

describe("syntheticShare", () => {
  it("reports how much of the sequence was guessed", () => {
    const events = buildVisitEvents([
      visit("000000000001", "pass", 1, ["2026-05-01"]),
      visit("000000000002", "visit", 3),
    ]);
    expect(syntheticShare(events)).toBeCloseTo(0.75);
    expect(syntheticShare([])).toBe(0);
  });
});
