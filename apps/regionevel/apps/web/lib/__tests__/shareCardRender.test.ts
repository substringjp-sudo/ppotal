import { describe, expect, it } from "vitest";
import type { Feature } from "geojson";
import type { RegionScore } from "@regionevel/types";
import {
  CARD_SIZE, LIGHT_THEME, drawShareCard, playheadLayout, type CardAspectRatio,
} from "../shareCardRender";
import { emptyStats, SHARE_BLOCKS, type ShareBlockId } from "../shareCard";

/**
 * A 2D context that records what was asked of it.
 *
 * The card is drawn with canvas calls and nothing else, so a stub that logs
 * them is enough to tell whether a block was drawn — and is the only way to
 * exercise the drawing at all without a browser.
 */
function stubCanvas() {
  const calls: Array<{ op: string; args: unknown[] }> = [];
  const texts: string[] = [];

  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop === "measureText") return (t: string) => ({ width: t.length * 10 });
      if (prop === "canvas") return undefined;
      if (prop in target) return target[prop];
      return (...args: unknown[]) => {
        calls.push({ op: prop, args });
        if (prop === "fillText") texts.push(String(args[0]));
      };
    },
    set(target, prop: string, value) {
      target[prop] = value;
      calls.push({ op: `set:${prop}`, args: [value] });
      return true;
    },
  });

  const canvas = {
    width: 0,
    height: 0,
    getContext: () => ctx,
  } as unknown as HTMLCanvasElement;

  return { canvas, calls, texts };
}

const feature = (id: string): Feature => ({
  type: "Feature",
  properties: { id, name: id },
  geometry: {
    type: "Polygon",
    coordinates: [[[139, 35], [140, 35], [140, 36], [139, 36], [139, 35]]],
  },
});

const score = (visited: boolean): RegionScore => ({
  regionId: "3920013",
  directScore: visited ? 20 : 0,
  rateScore: 0,
  childSum: 0,
  childMax: 0,
  totalScore: visited ? 20 : 0,
  scoreType: "blue",
  hasVisit: visited,
  breakdown: {} as RegionScore["breakdown"],
});

const baseInput = () => ({
  aspectRatio: "9:16" as CardAspectRatio,
  theme: LIGHT_THEME,
  blocks: new Set<ShareBlockId>(SHARE_BLOCKS),
  scope: { kind: "country" as const, id: "392", label: "일본" },
  scopeLabel: "일본",
  stats: emptyStats(),
  features: [feature("3920013")],
  scores: { "3920013": score(true) },
  showBorders: true,
  footer: "rgnevel.pplaner.com",
});

describe("drawShareCard", () => {
  it("sizes the canvas to the chosen ratio", () => {
    const { canvas } = stubCanvas();
    drawShareCard(canvas, baseInput());
    expect(canvas.width).toBe(CARD_SIZE["9:16"].w);
    expect(canvas.height).toBe(CARD_SIZE["9:16"].h);
  });

  it("draws no playhead on a still card", () => {
    const { canvas, texts } = stubCanvas();
    drawShareCard(canvas, baseInput());
    expect(texts.some((t) => /^\d{4}-\d{2}-\d{2}$/.test(t))).toBe(false);
  });

  it("writes the date on an animation frame", () => {
    const { canvas, texts } = stubCanvas();
    drawShareCard(canvas, {
      ...baseInput(),
      playhead: { date: "2026-05-01", progress: 0.5 },
    });
    expect(texts).toContain("2026-05-01");
  });

  it("draws the playhead on every ratio, including the map-only one", () => {
    for (const ratio of ["1:1", "16:9", "9:16"] as CardAspectRatio[]) {
      const { canvas, texts } = stubCanvas();
      drawShareCard(canvas, {
        ...baseInput(),
        aspectRatio: ratio,
        playhead: { date: "2026-07-04", progress: 1 },
      });
      expect(texts, `ratio ${ratio}`).toContain("2026-07-04");
    }
  });

  it("survives a scope with nothing drawn in it", () => {
    const { canvas } = stubCanvas();
    expect(() => drawShareCard(canvas, {
      ...baseInput(),
      features: [],
      playhead: { date: "2026-05-01", progress: 0 },
    })).not.toThrow();
  });
});

describe("playheadLayout", () => {
  const map = { x: 54, y: 54, w: 972, h: 972 };
  const measure = (size: number) => size * 5.5; // ~"2026-05-01" at that size

  it("keeps the chip inside the map", () => {
    const { chip } = playheadLayout(map, "2026-05-01", 0.5, measure);
    expect(chip.x).toBeGreaterThanOrEqual(map.x);
    expect(chip.y).toBeGreaterThanOrEqual(map.y);
    expect(chip.x + chip.w).toBeLessThanOrEqual(map.x + map.w);
    expect(chip.y + chip.h).toBeLessThanOrEqual(map.y + map.h);
  });

  it("stays a label rather than a banner", () => {
    const { chip } = playheadLayout(map, "2026-05-01", 0.5, measure);
    expect((chip.w * chip.h) / (map.w * map.h)).toBeLessThan(0.06);
  });

  it("never lets a long label run off the map", () => {
    const { chip } = playheadLayout(map, "2026-05-01", 0.5, () => 100_000);
    expect(chip.x).toBeGreaterThanOrEqual(map.x);
    expect(chip.w).toBeLessThanOrEqual(map.w * 0.5);
  });

  it("keeps the bar inside the map and grows it with progress", () => {
    const at = (p: number) => playheadLayout(map, "2026-05-01", p, measure).bar;
    const empty = at(0);
    const half = at(0.5);
    const full = at(1);

    expect(empty.x).toBeGreaterThanOrEqual(map.x);
    expect(full.x + full.w).toBeLessThanOrEqual(map.x + map.w);
    expect(full.y + full.h).toBeLessThanOrEqual(map.y + map.h);

    expect(half.filled).toBeGreaterThan(empty.filled);
    expect(full.filled).toBeGreaterThan(half.filled);
    expect(full.filled).toBeCloseTo(full.w, 5);
  });

  it("clamps progress that arrives outside 0–1", () => {
    expect(playheadLayout(map, "d", -5, measure).bar.filled)
      .toBe(playheadLayout(map, "d", 0, measure).bar.filled);
    expect(playheadLayout(map, "d", 99, measure).bar.filled)
      .toBe(playheadLayout(map, "d", 1, measure).bar.filled);
  });

  it("does not collide the chip with the bar", () => {
    const { chip, bar } = playheadLayout(map, "2026-05-01", 1, measure);
    expect(chip.y + chip.h).toBeLessThan(bar.y);
  });
});
