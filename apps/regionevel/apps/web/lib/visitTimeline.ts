import type { Region, RegionScore, RegionVisit, VisitCategory } from "@regionevel/types";
import { getRegionScore, padId } from "@regionevel/utils";

/**
 * Replaying a map in the order it was filled in.
 *
 * A visit record holds a count and, when it came from a timeline import, the
 * days its occasions fell on. That is enough to rebuild what the map looked
 * like on any past date: take the occasions up to that date, and score them
 * exactly as the live map does.
 *
 * Scoring is deliberately not reimplemented here. `getRegionScore` is the
 * thing the map itself uses, and a second implementation of it would drift —
 * the frames would slowly stop agreeing with the map they are replaying.
 */

/** One occasion, placed on a day. */
export interface VisitTimelineEvent {
  regionId: string;
  category: VisitCategory;
  /** Local day, "YYYY-MM-DD". */
  date: string;
  /** True when the date was filled in rather than recorded. */
  synthetic: boolean;
}

export interface TimelineFrame {
  /** The day this frame shows the map as of. */
  date: string;
  /** Whether every occasion up to here was a filled-in one. */
  synthetic: boolean;
  /** How many occasions have landed by this frame, across all regions. */
  cumulativeOccasions: number;
  scores: Record<string, RegionScore>;
}

/** Deterministic PRNG, so the same visits always replay in the same order. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shuffled<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = out[i]!;
    out[i] = out[j]!;
    out[j] = a;
  }
  return out;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A stable, data-derived seed, so replays match without anything being stored. */
function seedFor(visits: RegionVisit[]): number {
  const key = visits
    .map((v) => `${padId(v.regionId)}:${v.category}:${v.count}`)
    .sort()
    .join("|");
  return hashString(key);
}

/**
 * Every occasion in the store, placed on a day.
 *
 * Occasions the import dated keep their day. The rest — anything added by
 * hand, or imported from jprail, which records no dates — have no true place
 * in the sequence, so they are scattered over a tail after the last real day
 * rather than dropped or piled onto one frame. Shuffled, but from a seed
 * derived from the visits themselves, so replaying or re-exporting the same
 * map produces the same animation.
 */
export function buildVisitEvents(
  visits: RegionVisit[],
  options: { seed?: number; syntheticSpanDays?: number } = {},
): VisitTimelineEvent[] {
  const dated: VisitTimelineEvent[] = [];
  const undated: Array<{ regionId: string; category: VisitCategory }> = [];

  for (const v of visits) {
    if (v.count <= 0) continue;
    const regionId = padId(v.regionId);
    const days = (v.dates ?? []).slice(0, v.count);
    for (const date of days) {
      dated.push({ regionId, category: v.category, date, synthetic: false });
    }
    // A record can carry fewer days than occasions; the remainder is undated.
    for (let i = days.length; i < v.count; i++) {
      undated.push({ regionId, category: v.category });
    }
  }

  dated.sort((a, b) => a.date.localeCompare(b.date) || a.regionId.localeCompare(b.regionId));

  if (undated.length === 0) return dated;

  const rand = mulberry32(options.seed ?? seedFor(visits));
  const lastReal = dated.length > 0 ? dated[dated.length - 1]!.date : null;
  // With no real dates at all there is no timeline to append to, so the
  // scattered ones become the whole animation and simply start somewhere.
  const start = lastReal ? addDays(lastReal, 1) : "2020-01-01";
  const span = Math.max(1, options.syntheticSpanDays ?? Math.min(undated.length, 60));

  const filled = shuffled(undated, rand).map((e, i) => ({
    ...e,
    date: addDays(start, Math.floor((i * span) / undated.length)),
    synthetic: true,
  }));

  return [...dated, ...filled];
}

/** The days the animation steps through, capped so a long history stays watchable. */
export function frameDates(events: VisitTimelineEvent[], maxFrames: number): string[] {
  const unique = Array.from(new Set(events.map((e) => e.date))).sort();
  if (unique.length <= maxFrames) return unique;

  // Keep the last day exactly: the final frame has to be the map as it stands.
  const out: string[] = [];
  for (let i = 0; i < maxFrames - 1; i++) {
    out.push(unique[Math.floor((i * (unique.length - 1)) / (maxFrames - 1))]!);
  }
  out.push(unique[unique.length - 1]!);
  return Array.from(new Set(out));
}

/** The visit records as they stood once every occasion up to `date` had landed. */
export function visitsAsOf(events: VisitTimelineEvent[], date: string): RegionVisit[] {
  const counts = new Map<string, { regionId: string; category: VisitCategory; count: number }>();
  for (const e of events) {
    if (e.date > date) continue;
    const key = `${e.regionId}__${e.category}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { regionId: e.regionId, category: e.category, count: 1 });
  }
  return Array.from(counts.values());
}

export interface BuildFramesOptions {
  /** Regions whose score each frame needs — normally the ones being drawn. */
  targetIds: string[];
  maxFrames?: number;
  seed?: number;
  onProgress?: (done: number, total: number) => void;
}

/**
 * The animation, one frame at a time.
 *
 * Frames are precomputed rather than derived per repaint because each one
 * costs a scoring pass over the scope — far too much to do inside a playback
 * loop. Handing them back one at a time lets the caller spread the work across
 * frames of its own and keep the page responsive while it builds.
 */
export function createFrameBuilder(
  visits: RegionVisit[],
  regions: Region[],
  options: BuildFramesOptions,
) {
  const { targetIds, maxFrames = 90, seed } = options;
  const events = buildVisitEvents(visits, seed === undefined ? {} : { seed });
  const dates = frameDates(events, maxFrames);

  // The hierarchy does not change between frames, so it is built once.
  const regionMap = new Map<string, Region>();
  const parentIdMap = new Map<string | null, Region[]>();
  for (const r of regions) {
    const id = padId(r.id);
    const pId = padId(r.parentId);
    regionMap.set(id, r);
    const children = parentIdMap.get(pId) || [];
    children.push(r);
    parentIdMap.set(pId, children);
  }

  const targets = Array.from(new Set(targetIds.map((id) => padId(id)))).filter(Boolean);

  const buildFrame = (i: number): TimelineFrame => {
    const date = dates[i]!;
    const asOf = visitsAsOf(events, date);

    const vMap = new Map<string, RegionVisit[]>();
    const affectedIds = new Set<string>();
    for (const v of asOf) {
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

    // One memo per frame: shared across targets so a prefecture's children are
    // scored once, discarded between frames because the visits have changed.
    const scoreMemo = new Map<string, RegionScore>();
    const countMemo = new Map<string, Record<VisitCategory, number>>();
    const scores: Record<string, RegionScore> = {};
    for (const id of targets) {
      scores[id] = getRegionScore(
        id, vMap, regionMap, parentIdMap, countMemo, scoreMemo, affectedIds, false,
      );
    }

    return {
      date,
      synthetic: events.every((e) => e.date > date || e.synthetic),
      cumulativeOccasions: asOf.reduce((sum, v) => sum + v.count, 0),
      scores,
    };
  };

  return { events, dates, buildFrame };
}

/** The whole animation, built in one go. */
export function buildTimelineFrames(
  visits: RegionVisit[],
  regions: Region[],
  options: BuildFramesOptions,
): { events: VisitTimelineEvent[]; frames: TimelineFrame[] } {
  const { onProgress } = options;
  const { events, dates, buildFrame } = createFrameBuilder(visits, regions, options);

  const frames = dates.map((_, i) => {
    const frame = buildFrame(i);
    onProgress?.(i + 1, dates.length);
    return frame;
  });

  return { events, frames };
}

/** Whether a map has anything worth animating — one day is a picture, not a film. */
export function canAnimate(visits: RegionVisit[]): boolean {
  const events = buildVisitEvents(visits);
  return new Set(events.map((e) => e.date)).size > 1;
}

/** How much of the animation is guesswork, for telling the user. */
export function syntheticShare(events: VisitTimelineEvent[]): number {
  if (events.length === 0) return 0;
  return events.filter((e) => e.synthetic).length / events.length;
}
