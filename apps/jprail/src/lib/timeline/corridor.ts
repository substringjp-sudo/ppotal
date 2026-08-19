import { nearestOnLine, percentile, prepareLine, metersBetween } from './geo';
import type { CandidateRoute, CorridorScore, StopEvidence, TracePoint } from './types';
import type { StationIndex } from './stationIndex';

/**
 * How well does this trace lie on this route?
 *
 * This is the test that replaces free-form curve matching. We never search the
 * 11,684 sections for a shape that resembles the trace; we ask the router for
 * the route between two candidate stations and then ask how well the trace fits
 * it. The router only produces routes that physically exist, so most of the
 * discrimination is already done before we measure anything.
 */

/**
 * Metres a trace point may sit off the route and still count as on it.
 *
 * Consumer GPS in a city is good to roughly 10–30m in the open and much worse
 * beside tall buildings; a train's own position is offset from the track centre
 * by the carriage; and the section geometry is a simplification. 150m absorbs
 * all of that while still being far tighter than the distance between a railway
 * and any road that is not directly beside it.
 */
export const CORRIDOR_TOLERANCE_M = 150;

/** Below this many usable points the corridor numbers are not evidence. */
export const MIN_CORRIDOR_POINTS = 4;

export function scoreCorridor(
    trace: TracePoint[],
    route: CandidateRoute,
    toleranceMeters = CORRIDOR_TOLERANCE_M
): CorridorScore {
    if (route.geometry.length < 2 || trace.length === 0) {
        return { coverage: 0, medianDeviation: Infinity, p90Deviation: Infinity, routeSpan: 0, points: 0 };
    }
    const line = prepareLine(route.geometry);
    const deviations: number[] = [];
    let within = 0;
    let minAlong = Infinity;
    let maxAlong = -Infinity;

    for (const p of trace) {
        const { distance, along } = nearestOnLine(line, p.lon, p.lat);
        deviations.push(distance);
        if (distance <= toleranceMeters) {
            within++;
            // Only points that are actually on the route count toward how much
            // of it was travelled — otherwise a wild point at one end would
            // inflate the span.
            if (along < minAlong) minAlong = along;
            if (along > maxAlong) maxAlong = along;
        }
    }

    const sorted = deviations.slice().sort((a, b) => a - b);
    const span = maxAlong > minAlong && line.length > 0
        ? (maxAlong - minAlong) / line.length
        : 0;

    return {
        coverage: within / trace.length,
        medianDeviation: percentile(sorted, 0.5),
        p90Deviation: percentile(sorted, 0.9),
        routeSpan: Math.min(1, span),
        points: trace.length
    };
}

/**
 * Did this thing stop where trains stop?
 *
 * The hard false positive is a car on a road that parallels the track — the
 * Chuo Kaido beside the Keio line, and dozens like it. Geometry alone cannot
 * separate them at any tolerance loose enough to accept real GPS noise.
 *
 * But a train stops at stations and a car stops at lights, and the trace is
 * timestamped. So we look at where the slow points are: near the route's
 * intermediate stations, or scattered along it.
 */

/** Under this, treat the point as stopped or crawling. */
const SLOW_KMH = 8;
/** How close a slow point must be to a stop position to count as one. */
const STOP_RADIUS_M = 250;
/** Fewer points than this and the sampling cannot show stops at all. */
const MIN_STOP_POINTS = 8;

export function scoreStops(
    trace: TracePoint[],
    route: CandidateRoute,
    stationPos: (id: string) => { lat: number; lon: number } | null
): StopEvidence {
    const intermediates = route.stationIds.slice(1, -1);
    const none: StopEvidence = {
        stationStopRate: 0, strayStops: 0, slowPoints: 0, strayRatio: 0, usable: false
    };
    if (trace.length < MIN_STOP_POINTS || intermediates.length === 0) return none;

    // Speed at each point, from its neighbours.
    const slow: TracePoint[] = [];
    for (let i = 1; i < trace.length; i++) {
        const dt = (trace[i].t - trace[i - 1].t) / 1000;
        if (dt <= 0) continue;
        const dm = metersBetween(
            [trace[i - 1].lon, trace[i - 1].lat],
            [trace[i].lon, trace[i].lat]
        );
        const kmh = (dm / dt) * 3.6;
        if (kmh < SLOW_KMH) slow.push(trace[i]);
    }
    if (slow.length === 0) {
        // A ride with no visible stop is normal on a sparse trace or a fast
        // through service. Absence of evidence, not evidence of absence.
        return none;
    }

    // Where the train actually stops is on the track, and a station's recorded
    // coordinate can sit over a hundred metres off it — a plaza entrance, or
    // the centroid of a sprawling complex. Measuring against the record turns
    // genuine stops into strays as soon as GPS noise is added, so each station
    // is first projected onto the route the train is running on.
    const line = prepareLine(route.geometry);
    const stopPoints: { id: string; lon: number; lat: number }[] = [];
    for (const sid of intermediates) {
        const pos = stationPos(sid);
        if (!pos) continue;
        const { along } = nearestOnLine(line, pos.lon, pos.lat);
        stopPoints.push({ id: sid, ...pointAlong(route.geometry, line, along) });
    }
    if (stopPoints.length === 0) return none;

    const stopped = new Set<string>();
    let stray = 0;
    for (const p of slow) {
        let matched = false;
        for (const sp of stopPoints) {
            if (metersBetween([p.lon, p.lat], [sp.lon, sp.lat]) <= STOP_RADIUS_M) {
                stopped.add(sp.id);
                matched = true;
                break;
            }
        }
        if (!matched) stray++;
    }

    return {
        stationStopRate: stopped.size / stopPoints.length,
        strayStops: stray,
        slowPoints: slow.length,
        strayRatio: stray / slow.length,
        usable: true
    };
}

/**
 * The points worth snapping a station to, at each end of a trace.
 *
 * The obvious thing — average the first few fixes to resist a bad one — is
 * wrong on anything moving. At 55km/h a fix every 15 seconds is 229m apart, so
 * the "average of the first three" sits a quarter-kilometre down the track and
 * the real departure station falls outside any sane snap radius.
 *
 * So we do not reduce the end to one point at all. We hand back the first and
 * last few fixes individually and let the caller take the best station across
 * them. That is robust to a bad first fix *and* to fast motion, and it matches
 * how a real ride starts: the first fix after leaving a platform is often at
 * the station entrance, a hundred metres from where the train actually was.
 */
/**
 * How far a supporting anchor may sit from the first fix.
 *
 * The window has to adapt to sampling rate. At one fix per 15s the next point
 * is 200m away and is fair support for the same station; at one per 60s it is
 * over a kilometre away and is a *different* station, which is exactly how a
 * sparse ride ends up snapped one stop down the line.
 */
const ANCHOR_SPREAD_M = 350;

export function endpointAnchors(trace: TracePoint[], sampleSize = 3) {
    const toPair = (p: TracePoint): [number, number] => [p.lon, p.lat];
    const half = Math.max(1, Math.floor(trace.length / 2));
    const limit = Math.min(sampleSize, half);

    const grow = (ordered: TracePoint[]): [number, number][] => {
        const anchor = ordered[0];
        const out: [number, number][] = [toPair(anchor)];
        for (let i = 1; i < limit; i++) {
            const p = ordered[i];
            if (metersBetween([anchor.lon, anchor.lat], [p.lon, p.lat]) > ANCHOR_SPREAD_M) break;
            out.push(toPair(p));
        }
        return out;
    };

    return {
        start: grow(trace),
        end: grow(trace.slice().reverse())
    };
}

/**
 * The stations a route passes, for the stop test. Kept as a lookup rather than
 * baked into the route so the caller can supply whichever station source it
 * already has loaded.
 */
export function stationPosFromIndex(index: StationIndex, master: Record<string, { lat: number; lon: number }>) {
    void index;
    return (id: string) => {
        const s = master[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };
}

/** The [lon, lat] a given number of metres along a polyline. */
function pointAlong(
    geom: [number, number][],
    line: ReturnType<typeof prepareLine>,
    along: number
): { lon: number; lat: number } {
    const n = line.cum.length;
    if (n === 0) return { lon: 0, lat: 0 };
    if (along <= 0) return { lon: geom[0][0], lat: geom[0][1] };
    if (along >= line.cum[n - 1]) return { lon: geom[n - 1][0], lat: geom[n - 1][1] };
    let lo = 0, hi = n - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (line.cum[mid] <= along) lo = mid; else hi = mid;
    }
    const t = (along - line.cum[lo]) / Math.max(1e-9, line.cum[hi] - line.cum[lo]);
    return {
        lon: geom[lo][0] + (geom[hi][0] - geom[lo][0]) * t,
        lat: geom[lo][1] + (geom[hi][1] - geom[lo][1]) * t
    };
}
