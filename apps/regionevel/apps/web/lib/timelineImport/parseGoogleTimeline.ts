import type {
  ParseDiagnostics, ParsedTimeline, StayEvent, TimelineFormat, TracePoint,
} from "./types";

/**
 * Google Timeline export parser.
 *
 * Google ships several shapes, and which one a user has depends on the
 * platform and when they exported:
 *
 *  - `{ semanticSegments: [...] }` — the Android on-device "Export Timeline
 *    data".
 *  - A bare top-level array of the same segment objects — what iOS writes.
 *  - `{ timelineObjects: [...] }` — the older Takeout "Semantic Location
 *    History", one file per month, coordinates as integers scaled by 1e7.
 *  - `{ locations: [...] }` — raw `Records.json`, a firehose of fixes with no
 *    segmentation and so no usable stay signal.
 *
 * Coordinates are the part that actually bites. The same field turns up as
 * `"geo:35.68,139.76"`, as a bare `"35.68,139.76"`, as
 * `"35.6812°, 139.7671°"` with degree signs (Android writes these), nested
 * under `latLng`, or as a `{latitudeE7, longitudeE7}` pair. Reading only one
 * of those spellings drops every point in the file and reports it as an empty
 * timeline, which is exactly the failure this parser was rewritten for.
 *
 * Everything downstream only ever sees `StayEvent` / `TracePoint`.
 */

/** Every signed decimal in a string, in order. */
const NUMBER_PATTERN = /-?\d+(?:\.\d+)?/g;

const E7 = 1e-7;

/** Set by parseCoordinate when a value looked like a coordinate but did not read. */
let lastUnparsed: string | undefined;

/**
 * A [lat, lon] pair out of any spelling Google uses.
 *
 * Deliberately permissive: it pulls the first two numbers out of a string
 * rather than matching a fixed layout, which is what makes the degree-sign
 * form work without a separate branch for it.
 */
export function parseCoordinate(value: unknown): [number, number] | null {
  if (value == null) return null;

  if (typeof value === "object") {
    const o = value as Record<string, unknown>;

    // Nested one level, e.g. { latLng: "geo:..." } or { placeLocation: {...} }.
    for (const key of ["latLng", "latlng", "placeLocation", "location", "point"]) {
      if (o[key] != null) {
        const nested = parseCoordinate(o[key]);
        if (nested) return nested;
      }
    }

    const e7Lat = o.latitudeE7 ?? o.latE7;
    const e7Lon = o.longitudeE7 ?? o.lngE7 ?? o.lonE7;
    if (typeof e7Lat === "number" && typeof e7Lon === "number") {
      return [e7Lat * E7, e7Lon * E7];
    }

    const lat = o.latitude ?? o.lat;
    const lon = o.longitude ?? o.lng ?? o.lon;
    if (typeof lat === "number" && typeof lon === "number") return [lat, lon];
    // Some exports write them as strings.
    if (typeof lat === "string" && typeof lon === "string") {
      const nLat = Number(lat);
      const nLon = Number(lon);
      if (Number.isFinite(nLat) && Number.isFinite(nLon)) return [nLat, nLon];
    }

    return null;
  }

  if (typeof value !== "string") return null;

  const matches = value.match(NUMBER_PATTERN);
  if (!matches || matches.length < 2) {
    if (value.trim()) lastUnparsed = value.slice(0, 80);
    return null;
  }

  const lat = Number(matches[0]);
  const lon = Number(matches[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    lastUnparsed = value.slice(0, 80);
    return null;
  }

  // A coordinate that cannot exist means we read the wrong two numbers —
  // better to drop it than to place a visit in the sea off Africa.
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    lastUnparsed = value.slice(0, 80);
    return null;
  }

  return [lat, lon];
}

function parseTime(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    // Takeout also uses epoch-millis-as-string in older exports.
    if (/^\d+$/.test(v)) return Number(v);
    const t = Date.parse(v);
    return Number.isNaN(t) ? NaN : t;
  }
  return NaN;
}

const bump = (skipped: Record<string, number>, key: string) => {
  skipped[key] = (skipped[key] ?? 0) + 1;
};

// --------------------------------------------------------------------------
// Format 1 & 2: on-device export, keyed or as a bare array
// --------------------------------------------------------------------------

function parseSemanticSegments(
  segments: any[],
  stays: StayEvent[],
  moves: TracePoint[][],
  skipped: Record<string, number>,
  diag: ParseDiagnostics,
) {
  for (const seg of segments ?? []) {
    if (!seg || typeof seg !== "object") continue;
    diag.segmentsSeen++;

    const startTime = parseTime(seg.startTime);
    const endTime = parseTime(seg.endTime);
    if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
      bump(skipped, "badTime");
      continue;
    }

    if (seg.visit) {
      diag.visitsSeen++;
      // The place can hang off several keys depending on the export;
      // parseCoordinate walks the nesting itself.
      const c =
        parseCoordinate(seg.visit.topCandidate?.placeLocation) ??
        parseCoordinate(seg.visit.topCandidate) ??
        parseCoordinate(seg.visit.placeLocation) ??
        parseCoordinate(seg.visit);
      if (c) {
        diag.visitsParsed++;
        stays.push({ lat: c[0], lon: c[1], startTime, endTime });
      } else {
        bump(skipped, "visitWithoutLocation");
      }
      continue;
    }

    if (seg.activity || seg.timelinePath) {
      diag.activitiesSeen++;
      const trace: TracePoint[] = [];

      for (const p of seg.timelinePath ?? []) {
        const c = parseCoordinate(p?.point ?? p);
        if (!c) continue;
        let t = parseTime(p?.time);
        if (!Number.isFinite(t) && p?.durationMinutesOffsetFromStartTime != null) {
          t = startTime + Number(p.durationMinutesOffsetFromStartTime) * 60_000;
        }
        trace.push({ lat: c[0], lon: c[1], t: Number.isFinite(t) ? t : startTime });
      }

      // The endpoints matter more than the middle: they are where the journey
      // actually began and ended, and sampling can lose them.
      const act = seg.activity;
      if (act) {
        const s = parseCoordinate(act.start);
        const e = parseCoordinate(act.end);
        if (s) trace.unshift({ lat: s[0], lon: s[1], t: startTime });
        if (e) trace.push({ lat: e[0], lon: e[1], t: endTime });
      }

      trace.sort((a, b) => a.t - b.t);
      if (trace.length > 0) {
        diag.activitiesParsed++;
        moves.push(trace);
      } else {
        bump(skipped, "activityWithoutPoints");
      }
      continue;
    }

    bump(skipped, "unrecognisedSegment");
  }
}

// --------------------------------------------------------------------------
// Format 3: Takeout "Semantic Location History"
// --------------------------------------------------------------------------

function parseTimelineObjects(
  objects: any[],
  stays: StayEvent[],
  moves: TracePoint[][],
  skipped: Record<string, number>,
  diag: ParseDiagnostics,
) {
  for (const obj of objects ?? []) {
    if (!obj || typeof obj !== "object") continue;
    diag.segmentsSeen++;

    if (obj.placeVisit) {
      diag.visitsSeen++;
      const pv = obj.placeVisit;
      const c = parseCoordinate(pv.location) ?? parseCoordinate(pv.centerLatE7 != null ? pv : null);
      const startTime = parseTime(pv.duration?.startTimestamp ?? pv.duration?.startTimestampMs);
      const endTime = parseTime(pv.duration?.endTimestamp ?? pv.duration?.endTimestampMs);
      if (c && Number.isFinite(startTime) && Number.isFinite(endTime)) {
        diag.visitsParsed++;
        stays.push({ lat: c[0], lon: c[1], startTime, endTime });
      } else {
        bump(skipped, "badVisit");
      }
      continue;
    }

    if (obj.activitySegment) {
      diag.activitiesSeen++;
      const a = obj.activitySegment;
      const startTime = parseTime(a.duration?.startTimestamp ?? a.duration?.startTimestampMs);
      const endTime = parseTime(a.duration?.endTimestamp ?? a.duration?.endTimestampMs);
      const trace: TracePoint[] = [];

      // `simplifiedRawPath` is closer to the truth than `waypointPath`, which
      // Google has already snapped to the route it believed was taken.
      for (const p of a.simplifiedRawPath?.points ?? []) {
        const c = parseCoordinate(p);
        if (!c) continue;
        const t = parseTime(p.timestamp ?? p.timestampMs);
        trace.push({ lat: c[0], lon: c[1], t: Number.isFinite(t) ? t : startTime });
      }
      if (trace.length === 0) {
        for (const w of a.waypointPath?.waypoints ?? []) {
          const c = parseCoordinate(w);
          if (c) trace.push({ lat: c[0], lon: c[1], t: startTime });
        }
      }

      const s = parseCoordinate(a.startLocation);
      const e = parseCoordinate(a.endLocation);
      if (s) trace.unshift({ lat: s[0], lon: s[1], t: Number.isFinite(startTime) ? startTime : 0 });
      if (e) trace.push({ lat: e[0], lon: e[1], t: Number.isFinite(endTime) ? endTime : 0 });

      trace.sort((x, y) => x.t - y.t);
      if (trace.length > 0) {
        diag.activitiesParsed++;
        moves.push(trace);
      } else {
        bump(skipped, "activityWithoutPoints");
      }
      continue;
    }
  }
}

// --------------------------------------------------------------------------

/** Does this look like an on-device segment rather than some other object? */
function looksLikeSegment(v: any): boolean {
  return !!v && typeof v === "object"
    && (v.startTime != null || v.endTime != null)
    && (v.visit != null || v.activity != null || v.timelinePath != null);
}

function emptyDiagnostics(): ParseDiagnostics {
  return {
    formats: [],
    topLevelKeys: [],
    segmentsSeen: 0,
    visitsSeen: 0,
    visitsParsed: 0,
    activitiesSeen: 0,
    activitiesParsed: 0,
  };
}

/**
 * Parse any Google Timeline export.
 *
 * Accepts one parsed JSON root, or an array of them — Takeout splits
 * "Semantic Location History" into one file per month, and a year of travel
 * is a dozen files that should import as one set.
 */
export function parseGoogleTimeline(input: unknown | unknown[]): ParsedTimeline {
  // A bare segment array is itself a valid root, so only treat an array as a
  // list of roots when its members are not segments.
  const roots: unknown[] = Array.isArray(input) && !input.some(looksLikeSegment)
    ? input
    : [input];

  const stays: StayEvent[] = [];
  const moves: TracePoint[][] = [];
  const skipped: Record<string, number> = {};
  const diag = emptyDiagnostics();
  lastUnparsed = undefined;

  const noteFormat = (f: TimelineFormat) => {
    if (!diag.formats.includes(f)) diag.formats.push(f);
  };

  for (const raw of roots) {
    if (!raw || typeof raw !== "object") {
      bump(skipped, "notAnObject");
      continue;
    }

    if (Array.isArray(raw)) {
      noteFormat("segmentArray");
      parseSemanticSegments(raw, stays, moves, skipped, diag);
      continue;
    }

    const root = raw as Record<string, any>;
    for (const key of Object.keys(root)) {
      if (!diag.topLevelKeys.includes(key)) diag.topLevelKeys.push(key);
    }

    if (Array.isArray(root.semanticSegments)) {
      noteFormat("semanticSegments");
      parseSemanticSegments(root.semanticSegments, stays, moves, skipped, diag);
    } else if (Array.isArray(root.timelineObjects)) {
      noteFormat("timelineObjects");
      parseTimelineObjects(root.timelineObjects, stays, moves, skipped, diag);
    } else if (Array.isArray(root.locations)) {
      // No segmentation, so no stay signal worth guessing at.
      noteFormat("records");
      bump(skipped, "recordsFormatUnsupported");
    } else {
      // Last resort: some exports nest the segments under a key we have not
      // seen. Take the first array whose members look like segments.
      const nested = Object.values(root).find(
        (v) => Array.isArray(v) && v.some(looksLikeSegment),
      ) as any[] | undefined;
      if (nested) {
        noteFormat("segmentArray");
        parseSemanticSegments(nested, stays, moves, skipped, diag);
      } else {
        noteFormat("unrecognised");
        bump(skipped, "unrecognisedFormat");
      }
    }
  }

  if (lastUnparsed) diag.sampleUnparsedCoordinate = lastUnparsed;

  stays.sort((a, b) => a.startTime - b.startTime);
  moves.sort((a, b) => (a[0]?.t ?? 0) - (b[0]?.t ?? 0));

  return { stays, moves, skipped, diagnostics: diag };
}

/** A short, human-readable account of why a file yielded nothing. */
export function describeParseFailure(diag: ParseDiagnostics): string {
  if (diag.formats.includes("records")) {
    return "이 파일은 위치기록 원본(Records.json)이라 방문·이동 구간 정보가 없어요. 구글맵 앱의 '타임라인 데이터 내보내기'로 받은 파일을 사용해주세요.";
  }
  if (diag.segmentsSeen === 0) {
    const keys = diag.topLevelKeys.slice(0, 6).join(", ");
    return keys
      ? `타임라인 구간을 찾지 못했어요. 파일의 최상위 항목은 [${keys}] 입니다.`
      : "타임라인 구간을 찾지 못했어요. 내보낸 JSON 파일이 맞는지 확인해주세요.";
  }
  if (diag.sampleUnparsedCoordinate) {
    return `구간 ${diag.segmentsSeen}개를 읽었지만 좌표 형식을 해석하지 못했어요 (예: "${diag.sampleUnparsedCoordinate}").`;
  }
  return `구간 ${diag.segmentsSeen}개를 읽었지만 (방문 ${diag.visitsSeen}, 이동 ${diag.activitiesSeen}) 위치를 가진 항목이 없었어요.`;
}
