import type { ActivityHint, ParseResult, TimelineSegment, TracePoint } from './types';

/**
 * Google Timeline exports, normalised.
 *
 * Google has shipped three shapes of this data and the one a given user has
 * depends on when and how they exported:
 *
 *  - `semanticSegments` — the on-device Timeline export (2024 onwards).
 *    Coordinates are strings, `"geo:35.6812,139.7671"`.
 *  - `activitySegment` — Takeout "Semantic Location History", one file per
 *    month. Coordinates are integers scaled by 1e7.
 *  - `locations` — raw `Records.json`. No segmentation at all, just a firehose
 *    of fixes, so we cut it into segments ourselves on time gaps.
 *
 * Rather than ask the user which they have, we sniff. Everything downstream
 * sees only `TimelineSegment`.
 */

const E7 = 1e-7;

function finiteCoord(lon: number, lat: number): [number, number] | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    // Two numbers that were never a coordinate is a more likely explanation
    // than a real fix out here, and a wrong point plotted mid-ocean is worse
    // than a silently missing one.
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
    return [lon, lat];
}

/**
 * Extracts a `[lon, lat]` pair from whatever shape a coordinate arrives in.
 *
 * This used to match one exact shape — `"geo:35.6812,139.7671"` — with
 * `Number()` on each half after a plain `indexOf(',')` split. Real exports
 * are not that uniform: a field seen from an actual Android export carried a
 * trailing `°` on each number (`"35.681236°,139.767125°"`), and
 * `Number("35.681236°")` is `NaN`. Every point in an affected file failed
 * silently, `trace.length` never reached 2, and the segment vanished — with
 * enough affected files, that reads as "no movement found" for an export
 * that was full of movement.
 *
 * Rather than special-case degree signs on top of the exact-match parser,
 * this pulls the first two decimal numbers out of a string via regex — it
 * does not care what surrounds the digits — and separately accepts the
 * object shapes seen in the wild: `{latitude, longitude}`, `{lat, lng}` /
 * `{lat, lon}`, and one level of nesting under `latLng` or `placeLocation`
 * (Google Maps sometimes ships the coordinate one key deeper than the
 * activity endpoint itself). The `geo:` string case still parses exactly as
 * before; it is a strict subset of what this now accepts.
 */
function parseCoordinate(value: unknown): [number, number] | null {
    if (value == null) return null;

    if (typeof value === 'string') {
        const body = value.startsWith('geo:') ? value.slice(4) : value;
        const nums = body.match(/-?\d+(?:\.\d+)?/g);
        if (!nums || nums.length < 2) return null;
        // `geo:` URIs are latitude-then-longitude (RFC 5870); a bare pair
        // without the prefix is assumed to follow the same order, matching
        // what this parser already assumed before this fix.
        return finiteCoord(Number(nums[1]), Number(nums[0]));
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
        const o = value as Record<string, unknown>;
        const lat = o.latitude ?? o.lat;
        const lon = o.longitude ?? o.lng ?? o.lon;
        if (typeof lat === 'number' && typeof lon === 'number') {
            return finiteCoord(lon, lat);
        }
        if (o.latLng !== undefined) return parseCoordinate(o.latLng);
        if (o.placeLocation !== undefined) return parseCoordinate(o.placeLocation);
        return null;
    }

    return null;
}

function parseE7(o: any): [number, number] | null {
    if (!o) return null;
    const lat = o.latitudeE7 ?? o.latE7;
    const lon = o.longitudeE7 ?? o.lngE7 ?? o.lonE7;
    if (typeof lat !== 'number' || typeof lon !== 'number') return null;
    return [lon * E7, lat * E7];
}

function parseTime(v: unknown): number {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
        // Takeout also uses epoch-millis-as-string in older exports.
        if (/^\d+$/.test(v)) return Number(v);
        const t = Date.parse(v);
        return Number.isNaN(t) ? NaN : t;
    }
    return NaN;
}

/**
 * Google's activity vocabulary, collapsed to what matters here.
 *
 * The mapping is deliberately coarse. We are not going to trust the
 * distinction between a subway and a tram; we only want to know whether
 * Google leaned rail, road, or on foot, and even that is only a nudge.
 */
const HINTS: Record<string, ActivityHint> = {
    IN_TRAIN: 'rail', IN_SUBWAY: 'rail', IN_TRAM: 'rail', IN_FUNICULAR: 'rail',
    IN_CABLECAR: 'rail', IN_VEHICLE_RAIL: 'rail',
    IN_PASSENGER_VEHICLE: 'road', IN_VEHICLE: 'road', IN_BUS: 'road',
    IN_TAXI: 'road', MOTORCYCLING: 'road',
    WALKING: 'foot', ON_FOOT: 'foot', RUNNING: 'foot', HIKING: 'foot',
    CYCLING: 'cycle', ON_BICYCLE: 'cycle',
    FLYING: 'flight', IN_FERRY: 'unknown'
};

export function toHint(activityType: unknown): ActivityHint {
    if (typeof activityType !== 'string') return 'unknown';
    return HINTS[activityType.toUpperCase()] ?? 'unknown';
}

function sortTrace(trace: TracePoint[]): TracePoint[] {
    // Exports are usually ordered but not guaranteed to be, and a single
    // out-of-order fix would otherwise register as a huge speed spike.
    return trace.sort((a, b) => a.t - b.t);
}

// --------------------------------------------------------------------------
// Format 1: on-device Timeline export
// --------------------------------------------------------------------------

function parseSemanticSegments(root: any, out: TimelineSegment[], skipped: Record<string, number>) {
    const list: any[] = root.semanticSegments ?? [];
    list.forEach((seg, i) => {
        const startTime = parseTime(seg.startTime);
        const endTime = parseTime(seg.endTime);
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
            skipped.badTime = (skipped.badTime ?? 0) + 1;
            return;
        }

        // A `visit` is time spent in one place; only movement can be a ride.
        if (seg.visit && !seg.activity && !seg.timelinePath) {
            skipped.visit = (skipped.visit ?? 0) + 1;
            return;
        }

        const trace: TracePoint[] = [];

        // `timelinePath` is the sampled trace. On a train this can be a point
        // per minute, which at 80km/h is 1.3km apart — sparse enough that the
        // corridor test has to know how little evidence it is working from.
        for (const p of seg.timelinePath ?? []) {
            const c = parseCoordinate(p.point);
            if (!c) continue;
            // Newer exports give an absolute `time`; older ones an offset.
            let t = parseTime(p.time);
            if (!Number.isFinite(t) && p.durationMinutesOffsetFromStartTime != null) {
                t = startTime + Number(p.durationMinutesOffsetFromStartTime) * 60_000;
            }
            trace.push({ lon: c[0], lat: c[1], t: Number.isFinite(t) ? t : startTime });
        }

        const act = seg.activity;
        // The endpoints are worth more than the middle here: a ride must begin
        // and end at a station, so we never want to lose them to sampling.
        if (act) {
            const s = parseCoordinate(act.start?.latLng ?? act.start);
            const e = parseCoordinate(act.end?.latLng ?? act.end);
            if (s) trace.unshift({ lon: s[0], lat: s[1], t: startTime });
            if (e) trace.push({ lon: e[0], lat: e[1], t: endTime });
        }

        if (trace.length < 2) {
            skipped.tooFewPoints = (skipped.tooFewPoints ?? 0) + 1;
            return;
        }

        out.push({
            id: `sem:${i}`,
            startTime, endTime,
            trace: sortTrace(trace),
            hint: toHint(act?.topCandidate?.type),
            hintProbability: act?.topCandidate?.probability != null
                ? Number(act.topCandidate.probability) : undefined,
            reportedMeters: act?.distanceMeters != null ? Number(act.distanceMeters) : undefined,
            source: 'semanticSegments'
        });
    });
}

// --------------------------------------------------------------------------
// Format 2: Takeout Semantic Location History
// --------------------------------------------------------------------------

function parseActivitySegments(root: any, out: TimelineSegment[], skipped: Record<string, number>) {
    const objects: any[] = root.timelineObjects ?? [];
    objects.forEach((obj, i) => {
        const a = obj.activitySegment;
        if (!a) {
            if (obj.placeVisit) skipped.visit = (skipped.visit ?? 0) + 1;
            return;
        }
        const startTime = parseTime(a.duration?.startTimestamp ?? a.duration?.startTimestampMs);
        const endTime = parseTime(a.duration?.endTimestamp ?? a.duration?.endTimestampMs);
        if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
            skipped.badTime = (skipped.badTime ?? 0) + 1;
            return;
        }

        const trace: TracePoint[] = [];
        const span = Math.max(1, endTime - startTime);

        // `simplifiedRawPath` is closer to the truth than `waypointPath`, which
        // Google has already snapped to what it believed the route was — and
        // snapping to a road is exactly the error we are trying to detect.
        const raw = a.simplifiedRawPath?.points ?? [];
        for (const p of raw) {
            const c = parseE7(p);
            if (!c) continue;
            const t = parseTime(p.timestamp ?? p.timestampMs);
            trace.push({ lon: c[0], lat: c[1], t: Number.isFinite(t) ? t : startTime });
        }
        if (trace.length === 0) {
            const wps = a.waypointPath?.waypoints ?? [];
            wps.forEach((w: any, k: number) => {
                const c = parseE7(w);
                if (!c) return;
                // Waypoints carry no time; spread them across the span so the
                // speed checks downstream still have something to work with.
                trace.push({ lon: c[0], lat: c[1], t: startTime + (span * k) / Math.max(1, wps.length - 1) });
            });
        }

        const s = parseE7(a.startLocation);
        const e = parseE7(a.endLocation);
        if (s) trace.unshift({ lon: s[0], lat: s[1], t: startTime });
        if (e) trace.push({ lon: e[0], lat: e[1], t: endTime });

        if (trace.length < 2) {
            skipped.tooFewPoints = (skipped.tooFewPoints ?? 0) + 1;
            return;
        }

        out.push({
            id: `act:${i}`,
            startTime, endTime,
            trace: sortTrace(trace),
            hint: toHint(a.activityType),
            hintProbability: a.confidence === 'HIGH' ? 0.9
                : a.confidence === 'MEDIUM' ? 0.6
                    : a.confidence === 'LOW' ? 0.3 : undefined,
            reportedMeters: a.distance != null ? Number(a.distance)
                : a.distanceMeters != null ? Number(a.distanceMeters) : undefined,
            source: 'activitySegment'
        });
    });
}

// --------------------------------------------------------------------------
// Format 3: raw Records.json
// --------------------------------------------------------------------------

/** A gap longer than this ends a segment. */
const RECORD_GAP_MS = 6 * 60_000;
/** Below this, the user was standing still, not travelling. */
const RECORD_MIN_METERS = 300;

function parseRecords(root: any, out: TimelineSegment[], skipped: Record<string, number>) {
    const locs: any[] = root.locations ?? [];
    let run: TracePoint[] = [];
    let n = 0;

    const flush = () => {
        if (run.length >= 2) {
            let span = 0;
            for (let i = 1; i < run.length; i++) {
                const dLat = (run[i].lat - run[i - 1].lat) * 111_320;
                const dLon = (run[i].lon - run[i - 1].lon) * 111_320 * Math.cos(run[i].lat * Math.PI / 180);
                span += Math.hypot(dLat, dLon);
            }
            if (span >= RECORD_MIN_METERS) {
                out.push({
                    id: `rec:${n++}`,
                    startTime: run[0].t,
                    endTime: run[run.length - 1].t,
                    trace: run,
                    // Raw records carry per-fix activity guesses that are even
                    // noisier than the segmented exports; not worth reading.
                    hint: 'unknown',
                    source: 'records'
                });
            } else {
                skipped.stationary = (skipped.stationary ?? 0) + 1;
            }
        }
        run = [];
    };

    for (const l of locs) {
        const c = parseE7(l);
        const t = parseTime(l.timestamp ?? l.timestampMs);
        if (!c || !Number.isFinite(t)) { skipped.badFix = (skipped.badFix ?? 0) + 1; continue; }
        if (run.length && t - run[run.length - 1].t > RECORD_GAP_MS) flush();
        run.push({ lon: c[0], lat: c[1], t });
    }
    flush();
}

// --------------------------------------------------------------------------

/**
 * Parse any Google Timeline export.
 *
 * Accepts one parsed JSON root, or an array of them — Takeout splits Semantic
 * Location History into one file per month, and a year of travel is a dozen
 * files that should import as one set.
 */
export function parseTimeline(input: unknown | unknown[]): ParseResult {
    const roots = Array.isArray(input) ? input : [input];
    const segments: TimelineSegment[] = [];
    const skipped: Record<string, number> = {};

    for (const raw of roots) {
        const root: any = raw;
        if (!root || typeof root !== 'object') { skipped.notAnObject = (skipped.notAnObject ?? 0) + 1; continue; }

        // Some exports wrap the array at the top level rather than in a key.
        if (Array.isArray(root)) {
            parseSemanticSegments({ semanticSegments: root }, segments, skipped);
            continue;
        }
        if (root.semanticSegments) parseSemanticSegments(root, segments, skipped);
        else if (root.timelineObjects) parseActivitySegments(root, segments, skipped);
        else if (root.locations) parseRecords(root, segments, skipped);
        else skipped.unrecognisedFormat = (skipped.unrecognisedFormat ?? 0) + 1;
    }

    // One import can span several files; keep the whole set in time order so
    // the merge step downstream can see adjacent rides as adjacent.
    segments.sort((a, b) => a.startTime - b.startTime);
    segments.forEach((s, i) => { s.id = `${s.source}:${i}`; });

    return { segments, skipped };
}
