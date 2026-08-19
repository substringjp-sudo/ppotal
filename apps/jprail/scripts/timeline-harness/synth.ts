/**
 * Synthetic timeline traces built from the real rail network.
 *
 * The point is not to prove the matcher works on easy data — it is to build the
 * cases that are actually hard: sparse sampling, tunnels, and above all a car
 * on a road that runs beside the track, which is the one false positive that
 * geometry alone cannot reject.
 */
import type { TimelineSegment, TracePoint } from '../../src/lib/timeline/types';
import type { RailFixtures } from './localRouter';

export interface Truth {
    kind: 'rail' | 'walk' | 'car-parallel' | 'car-elsewhere';
    fromStationId?: string;
    toStationId?: string;
}

export interface Case {
    segment: TimelineSegment;
    truth: Truth;
    label: string;
}

/** Deterministic PRNG so a run is reproducible and a regression is real. */
export function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

const M_PER_DEG_LAT = 111_320;
const mPerDegLon = (lat: number) => 111_320 * Math.cos(lat * Math.PI / 180);

/** Walk the station graph to get a plausible multi-stop ride. */
export function randomRide(fx: RailFixtures, rand: () => number, hops: number): string[] {
    const ids = Object.keys(fx.graph);
    for (let attempt = 0; attempt < 400; attempt++) {
        const start = ids[Math.floor(rand() * ids.length)];
        const path = [start];
        const seen = new Set([start]);
        let cur = start;
        for (let h = 0; h < hops; h++) {
            const nexts = Object.keys(fx.graph[cur] ?? {}).filter(n => !seen.has(n));
            if (!nexts.length) break;
            cur = nexts[Math.floor(rand() * nexts.length)];
            seen.add(cur);
            path.push(cur);
        }
        if (path.length >= hops * 0.7 && path.length >= 3) return path;
    }
    return [];
}

/** Stitch the true geometry a ride follows, station by station. */
export function rideGeometry(fx: RailFixtures, path: string[]): [number, number][] {
    const geom: [number, number][] = [];
    for (let i = 1; i < path.length; i++) {
        const edge = fx.graph[path[i - 1]]?.[path[i]];
        if (!edge) continue;
        const a = fx.stations[path[i - 1]];
        for (const sid of edge.section_ids) {
            const g = fx.sectionGeom[String(sid)];
            if (!g || g.length < 2 || !a) continue;
            const head = g[0];
            const dHead = (head[0] - a.lon) ** 2 + (head[1] - a.lat) ** 2;
            const tail = g[g.length - 1];
            const dTail = (tail[0] - a.lon) ** 2 + (tail[1] - a.lat) ** 2;
            const oriented = dHead <= dTail ? g : g.slice().reverse();
            for (const p of oriented) {
                const last = geom[geom.length - 1];
                if (!last || last[0] !== p[0] || last[1] !== p[1]) geom.push(p);
            }
        }
    }
    return geom;
}

/** Cumulative metres along a polyline. */
function cumulative(geom: [number, number][]): number[] {
    const cum = [0];
    for (let i = 1; i < geom.length; i++) {
        const dx = (geom[i][0] - geom[i - 1][0]) * mPerDegLon(geom[i][1]);
        const dy = (geom[i][1] - geom[i - 1][1]) * M_PER_DEG_LAT;
        cum.push(cum[i - 1] + Math.hypot(dx, dy));
    }
    return cum;
}

function pointAt(geom: [number, number][], cum: number[], target: number): [number, number] {
    if (target <= 0) return geom[0];
    const total = cum[cum.length - 1];
    if (target >= total) return geom[geom.length - 1];
    let lo = 0, hi = cum.length - 1;
    while (lo < hi - 1) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] <= target) lo = mid; else hi = mid;
    }
    const t = (target - cum[lo]) / Math.max(1e-9, cum[hi] - cum[lo]);
    return [
        geom[lo][0] + (geom[hi][0] - geom[lo][0]) * t,
        geom[lo][1] + (geom[hi][1] - geom[lo][1]) * t
    ];
}

/** Shift a polyline sideways by `meters` — a road running beside the track. */
function offsetLine(geom: [number, number][], meters: number): [number, number][] {
    return geom.map((p, i) => {
        const a = geom[Math.max(0, i - 1)], b = geom[Math.min(geom.length - 1, i + 1)];
        const dx = (b[0] - a[0]) * mPerDegLon(p[1]);
        const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
        const len = Math.hypot(dx, dy) || 1;
        // Perpendicular, in metres, then back to degrees.
        const nx = -dy / len * meters;
        const ny = dx / len * meters;
        return [p[0] + nx / mPerDegLon(p[1]), p[1] + ny / M_PER_DEG_LAT] as [number, number];
    });
}

export interface SampleOptions {
    /** Seconds between fixes. Real train traces are often 60. */
    intervalSec: number;
    /** One-sigma GPS error, metres. */
    noiseM: number;
    /** Fraction of the middle dropped, simulating tunnels. */
    tunnelFraction: number;
    /** Where the ride pauses, as fractions along. Stations, or traffic lights. */
    stopsAt: number[];
    /** Seconds each stop lasts. */
    stopSec: number;
    /** Cruising speed, km/h. */
    speedKmh: number;
}

/**
 * Sample a polyline into a timestamped trace.
 *
 * Time advances with distance at `speedKmh`, pausing at each stop, so the
 * speed-derived signals the matcher reads are the ones a real ride would give.
 */
export function sampleTrace(
    geom: [number, number][],
    startMs: number,
    o: SampleOptions,
    rand: () => number
): TracePoint[] {
    const cum = cumulative(geom);
    const total = cum[cum.length - 1];
    if (total <= 0) return [];

    const mPerSec = (o.speedKmh * 1000) / 3600;
    const stopDistances = o.stopsAt.map(f => f * total).sort((a, b) => a - b);

    const trace: TracePoint[] = [];
    let travelled = 0;
    let t = startMs;
    let nextStop = 0;

    const gauss = () => {
        const u = Math.max(1e-9, rand()), v = rand();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    while (travelled <= total) {
        // Stops reached in this step. Emitted at the station's own distance
        // along the line, not at wherever the sampler happens to have advanced
        // to — at a fix a minute those differ by over a kilometre, which puts
        // the synthetic "station stop" in open track and makes a genuine ride
        // look like a car stopping at lights.
        while (nextStop < stopDistances.length && travelled >= stopDistances[nextStop]) {
            const held = Math.max(2, Math.ceil(o.stopSec / o.intervalSec) + 1);
            for (let k = 0; k < held; k++) {
                const p = pointAt(geom, cum, stopDistances[nextStop]);
                trace.push({
                    lon: p[0] + (gauss() * o.noiseM) / mPerDegLon(p[1]),
                    lat: p[1] + (gauss() * o.noiseM) / M_PER_DEG_LAT,
                    t
                });
                t += o.intervalSec * 1000;
            }
            nextStop++;
        }

        const p = pointAt(geom, cum, travelled);
        trace.push({
            lon: p[0] + (gauss() * o.noiseM) / mPerDegLon(p[1]),
            lat: p[1] + (gauss() * o.noiseM) / M_PER_DEG_LAT,
            t
        });
        travelled += mPerSec * o.intervalSec;
        t += o.intervalSec * 1000;
    }

    // The loop stops one step short of the end, which at a fix a minute and
    // 70km/h leaves the trace over a kilometre from where the ride finished.
    // Real arrivals are recorded, so land the trace on the destination.
    const last = geom[geom.length - 1];
    trace.push({
        lon: last[0] + (gauss() * o.noiseM) / mPerDegLon(last[1]),
        lat: last[1] + (gauss() * o.noiseM) / M_PER_DEG_LAT,
        t
    });

    // Underground, the receiver has nothing. Drop a contiguous middle run but
    // never the endpoints — a subway rider surfaces at both ends.
    if (o.tunnelFraction > 0 && trace.length > 4) {
        const keep = Math.max(1, Math.floor(trace.length * (1 - o.tunnelFraction) / 2));
        const head = trace.slice(0, keep);
        const tail = trace.slice(trace.length - keep);
        return [...head, ...tail];
    }
    return trace;
}

export function segmentOf(
    id: string, trace: TracePoint[], hint: TimelineSegment['hint'], reportedMeters?: number
): TimelineSegment {
    return {
        id,
        startTime: trace[0].t,
        endTime: trace[trace.length - 1].t,
        trace,
        hint,
        hintProbability: 0.8,
        reportedMeters,
        source: 'semanticSegments'
    };
}

export { offsetLine, cumulative, pointAt };
