import type { ParsedTimeline, StayEvent, TracePoint } from "./types";

/**
 * Google Timeline export parser.
 *
 * Google ships (at least) two shapes:
 *  - `semanticSegments` — the on-device "Export Timeline data" export
 *    (2024 onwards). Coordinates are strings, `"geo:35.6812,139.7671"`.
 *  - `timelineObjects` — the older Takeout "Semantic Location History",
 *    one file per month. Coordinates are integers scaled by 1e7.
 *
 * Rather than ask which one a user has, we sniff the shape. Everything
 * downstream only ever sees `StayEvent` / `TracePoint`.
 */

function parseGeoString(s: unknown): [number, number] | null {
  if (typeof s !== "string") return null;
  const body = s.startsWith("geo:") ? s.slice(4) : s;
  const comma = body.indexOf(",");
  if (comma < 0) return null;
  const lat = Number(body.slice(0, comma));
  const lon = Number(body.slice(comma + 1));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return [lat, lon];
}

const E7 = 1e-7;

function parseE7(o: any): [number, number] | null {
  if (!o) return null;
  const lat = o.latitudeE7 ?? o.latE7;
  const lon = o.longitudeE7 ?? o.lngE7 ?? o.lonE7;
  if (typeof lat !== "number" || typeof lon !== "number") return null;
  return [lat * E7, lon * E7];
}

function parseTime(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    if (/^\d+$/.test(v)) return Number(v);
    const t = Date.parse(v);
    return Number.isNaN(t) ? NaN : t;
  }
  return NaN;
}

// --------------------------------------------------------------------------
// Format 1: on-device Timeline export (semanticSegments)
// --------------------------------------------------------------------------

function parseSemanticSegments(
  root: any,
  stays: StayEvent[],
  moves: TracePoint[][],
  skipped: Record<string, number>
) {
  const list: any[] = root.semanticSegments ?? [];
  for (const seg of list) {
    const startTime = parseTime(seg.startTime);
    const endTime = parseTime(seg.endTime);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      skipped.badTime = (skipped.badTime ?? 0) + 1;
      continue;
    }

    if (seg.visit) {
      const loc = seg.visit.topCandidate?.placeLocation?.latLng ?? seg.visit.topCandidate?.placeLocation;
      const c = parseGeoString(loc);
      if (c) {
        stays.push({ lat: c[0], lon: c[1], startTime, endTime });
      } else {
        skipped.noLocation = (skipped.noLocation ?? 0) + 1;
      }
      continue;
    }

    if (seg.activity || seg.timelinePath) {
      const trace: TracePoint[] = [];
      for (const p of seg.timelinePath ?? []) {
        const c = parseGeoString(p.point);
        if (!c) continue;
        let t = parseTime(p.time);
        if (!Number.isFinite(t) && p.durationMinutesOffsetFromStartTime != null) {
          t = startTime + Number(p.durationMinutesOffsetFromStartTime) * 60_000;
        }
        trace.push({ lat: c[0], lon: c[1], t: Number.isFinite(t) ? t : startTime });
      }
      const act = seg.activity;
      if (act) {
        const s = parseGeoString(act.start?.latLng ?? act.start);
        const e = parseGeoString(act.end?.latLng ?? act.end);
        if (s) trace.unshift({ lat: s[0], lon: s[1], t: startTime });
        if (e) trace.push({ lat: e[0], lon: e[1], t: endTime });
      }
      trace.sort((a, b) => a.t - b.t);
      if (trace.length > 0) moves.push(trace);
      else skipped.tooFewPoints = (skipped.tooFewPoints ?? 0) + 1;
      continue;
    }

    skipped.unrecognisedSegment = (skipped.unrecognisedSegment ?? 0) + 1;
  }
}

// --------------------------------------------------------------------------
// Format 2: Takeout "Semantic Location History"
// --------------------------------------------------------------------------

function parseTakeoutObjects(
  root: any,
  stays: StayEvent[],
  moves: TracePoint[][],
  skipped: Record<string, number>
) {
  const objects: any[] = root.timelineObjects ?? [];
  for (const obj of objects) {
    if (obj.placeVisit) {
      const pv = obj.placeVisit;
      const c = parseE7(pv.location);
      const startTime = parseTime(pv.duration?.startTimestamp ?? pv.duration?.startTimestampMs);
      const endTime = parseTime(pv.duration?.endTimestamp ?? pv.duration?.endTimestampMs);
      if (c && Number.isFinite(startTime) && Number.isFinite(endTime)) {
        stays.push({ lat: c[0], lon: c[1], startTime, endTime });
      } else {
        skipped.badVisit = (skipped.badVisit ?? 0) + 1;
      }
      continue;
    }

    if (obj.activitySegment) {
      const a = obj.activitySegment;
      const startTime = parseTime(a.duration?.startTimestamp ?? a.duration?.startTimestampMs);
      const endTime = parseTime(a.duration?.endTimestamp ?? a.duration?.endTimestampMs);
      const trace: TracePoint[] = [];
      const raw = a.simplifiedRawPath?.points ?? [];
      for (const p of raw) {
        const c = parseE7(p);
        if (!c) continue;
        const t = parseTime(p.timestamp ?? p.timestampMs);
        trace.push({ lat: c[0], lon: c[1], t: Number.isFinite(t) ? t : startTime });
      }
      const s = parseE7(a.startLocation);
      const e = parseE7(a.endLocation);
      if (s) trace.unshift({ lat: s[0], lon: s[1], t: Number.isFinite(startTime) ? startTime : (trace[0]?.t ?? 0) });
      if (e) trace.push({ lat: e[0], lon: e[1], t: Number.isFinite(endTime) ? endTime : (trace[trace.length - 1]?.t ?? 0) });
      trace.sort((x, y) => x.t - y.t);
      if (trace.length > 0) moves.push(trace);
      continue;
    }
  }
}

// --------------------------------------------------------------------------

/**
 * Parse any Google Timeline export.
 *
 * Accepts one parsed JSON root, or an array of them — Takeout splits
 * "Semantic Location History" into one file per month.
 */
export function parseGoogleTimeline(input: unknown | unknown[]): ParsedTimeline {
  const roots = Array.isArray(input) ? input : [input];
  const stays: StayEvent[] = [];
  const moves: TracePoint[][] = [];
  const skipped: Record<string, number> = {};

  for (const raw of roots) {
    const root: any = raw;
    if (!root || typeof root !== "object") {
      skipped.notAnObject = (skipped.notAnObject ?? 0) + 1;
      continue;
    }
    if (Array.isArray(root)) {
      parseSemanticSegments({ semanticSegments: root }, stays, moves, skipped);
    } else if (root.semanticSegments) {
      parseSemanticSegments(root, stays, moves, skipped);
    } else if (root.timelineObjects) {
      parseTakeoutObjects(root, stays, moves, skipped);
    } else if (root.locations) {
      // Raw Records.json has no segmentation and no reliable stay signal
      // (it is a firehose of fixes) — not worth guessing at from here.
      skipped.recordsFormatUnsupported = (skipped.recordsFormatUnsupported ?? 0) + 1;
    } else {
      skipped.unrecognisedFormat = (skipped.unrecognisedFormat ?? 0) + 1;
    }
  }

  stays.sort((a, b) => a.startTime - b.startTime);
  moves.sort((a, b) => (a[0]?.t ?? 0) - (b[0]?.t ?? 0));

  return { stays, moves, skipped };
}
