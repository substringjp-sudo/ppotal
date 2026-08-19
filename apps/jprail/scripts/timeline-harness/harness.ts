/**
 * Stage-1 accuracy harness.
 *
 * Builds a mixed set of rides and decoys from the real network, runs the
 * matcher, and reports precision/recall plus how often the right station pair
 * was chosen. The decoys are the point: a walk between two stations, and a car
 * on a road beside the track.
 */
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchSegment, DEFAULT_MATCH_OPTIONS } from '../../src/lib/timeline/match';
import type { MatchOptions } from '../../src/lib/timeline/match';
import { prepareLine, nearestOnLine } from '../../src/lib/timeline/geo';
import { loadFixtures, makeLocalRouter } from './localRouter';
import {
    rng, randomRide, rideGeometry, sampleTrace, segmentOf, offsetLine, cumulative
} from './synth';
import type { Case } from './synth';

const SEED = Number(process.env.SEED ?? 20260819);
const N = Number(process.env.N ?? 40);

const t0 = Date.now();
const fx = loadFixtures();
console.log(`fixtures: ${Object.keys(fx.stations).length} stations, ${Object.keys(fx.sectionGeom).length} section geoms (${Date.now() - t0}ms)`);

const index = StationIndex.fromMaster(fx.stations as any);
const router = makeLocalRouter(fx);
const stationPos = (id: string) => {
    const s = fx.stations[id];
    return s ? { lat: s.lat, lon: s.lon } : null;
};

const rand = rng(SEED);
const cases: Case[] = [];
let clock = Date.parse('2026-03-01T08:00:00Z');
const bump = () => { clock += 6 * 3600_000; return clock; };

async function build() {
    let made = 0, tries = 0;
    while (made < N && tries < N * 30) {
        tries++;
        const hops = 3 + Math.floor(rand() * 8);
        const walk = randomRide(fx, rand, hops);
        if (walk.length < 3) continue;
        // Ride the route a rider would actually take between those ends, not
        // the random walk that found them — otherwise the "truth" is a path the
        // router never returns and every miss is an artifact of the harness.
        const truthRoute = await router(walk[0], walk[walk.length - 1]);
        if (!truthRoute || truthRoute.geometry.length < 10) continue;
        const path = truthRoute.stationIds;
        const geom = truthRoute.geometry;
        const total = cumulative(geom).pop() ?? 0;
        if (total < 2500 || path.length < 3) continue;

        const from = path[0], to = path[path.length - 1];
        // Stops go where the stations actually are, not at even fractions.
        // Spacing between stations is wildly uneven on a real line, so evenly
        // spread stops land in open track — and then the stop test, which is
        // supposed to confirm a genuine ride, penalises it instead.
        const prepared = prepareLine(geom);
        const stationStops = path.slice(1, -1)
            .map(id => {
                const st = fx.stations[id];
                if (!st || prepared.length === 0) return null;
                const { along, distance } = nearestOnLine(prepared, st.lon, st.lat);
                // A station the route only passes near is not a stop on it.
                return distance > 400 ? null : along / prepared.length;
            })
            .filter((f): f is number => f !== null && f > 0.01 && f < 0.99);
        const variant = made % 4;

        if (variant === 0) {
            // Dense, well-labelled. The easy case, as a floor.
            const trace = sampleTrace(geom, bump(), {
                intervalSec: 15, noiseM: 18, tunnelFraction: 0,
                stopsAt: stationStops, stopSec: 40, speedKmh: 55
            }, rand);
            if (trace.length < 3) continue;
            cases.push({ segment: segmentOf(`ok-dense-${made}`, trace, 'rail', total), truth: { kind: 'rail', fromStationId: from, toStationId: to }, label: 'rail/dense/labelled' });
        } else if (variant === 1) {
            // A point a minute — what a real train trace usually looks like.
            const trace = sampleTrace(geom, bump(), {
                intervalSec: 60, noiseM: 25, tunnelFraction: 0,
                stopsAt: stationStops, stopSec: 45, speedKmh: 70
            }, rand);
            if (trace.length < 3) continue;
            cases.push({ segment: segmentOf(`ok-sparse-${made}`, trace, 'road', total), truth: { kind: 'rail', fromStationId: from, toStationId: to }, label: 'rail/sparse/mislabelled-car' });
        } else if (variant === 2) {
            // Underground: most of the middle is gone, and Google called it a walk.
            const trace = sampleTrace(geom, bump(), {
                intervalSec: 45, noiseM: 30, tunnelFraction: 0.75,
                stopsAt: stationStops, stopSec: 30, speedKmh: 40
            }, rand);
            if (trace.length < 3) continue;
            cases.push({ segment: segmentOf(`ok-tunnel-${made}`, trace, 'foot', total), truth: { kind: 'rail', fromStationId: from, toStationId: to }, label: 'rail/tunnel/mislabelled-walk' });
        } else {
            // The decoy that matters: a car on a road ~70m off the track, with
            // traffic stops that do not line up with any station.
            const road = offsetLine(geom, 70);
            const lights = Array.from({ length: 6 }, () => 0.1 + rand() * 0.8);
            const trace = sampleTrace(road, bump(), {
                intervalSec: 20, noiseM: 15, tunnelFraction: 0,
                stopsAt: lights, stopSec: 50, speedKmh: 38
            }, rand);
            if (trace.length < 3) continue;
            cases.push({ segment: segmentOf(`bad-road-${made}`, trace, 'rail', total), truth: { kind: 'car-parallel' }, label: 'car/parallel-road/mislabelled-rail' });
        }
        made++;
    }

    // A walk between two stations, labelled as a train.
    for (let i = 0; i < Math.max(4, N / 6); i++) {
        const path = randomRide(fx, rand, 2);
        if (path.length < 2) continue;
        const geom = rideGeometry(fx, path);
        if (geom.length < 4) continue;
        const trace = sampleTrace(geom, bump(), {
            intervalSec: 30, noiseM: 12, tunnelFraction: 0,
            stopsAt: [], stopSec: 0, speedKmh: 4.5
        }, rand);
        if (trace.length < 3) continue;
        cases.push({ segment: segmentOf(`bad-walk-${i}`, trace, 'rail', undefined), truth: { kind: 'walk' }, label: 'walk/along-track/mislabelled-rail' });
    }
}

async function run(opts: MatchOptions, quiet = false) {
    const stats = {
        tp: 0, fp: 0, tn: 0, fn: 0,
        pairCorrect: 0, pairWrong: 0,
        byLabel: {} as Record<string, { total: number; matched: number; pairOk: number }>,
        rejects: {} as Record<string, number>,
        confTrue: [] as number[], confFalse: [] as number[]
    };

    for (const c of cases) {
        const r = await matchSegment(c.segment, index, router, stationPos, opts);
        const matched = r.candidates.length > 0;
        const best = r.candidates[0];
        const shouldMatch = c.truth.kind === 'rail';

        const L = stats.byLabel[c.label] ??= { total: 0, matched: 0, pairOk: 0 };
        L.total++;
        if (matched) L.matched++;

        if (!matched && r.rejectedBecause) {
            stats.rejects[r.rejectedBecause] = (stats.rejects[r.rejectedBecause] ?? 0) + 1;
        }

        if (process.env.DUMP && shouldMatch) {
            const all = await matchSegment(c.segment, index, router,
                stationPos, { ...opts, minConfidence: 0 });
            const b = all.candidates[0];
            if (!matched) {
                console.log(`FN ${c.label} pts=${c.segment.trace.length} ${all.rejectedBecause ?? ''}`);
                if (b) console.log(`   best conf ${b.confidence} cov ${b.corridor.coverage.toFixed(2)} med ${b.corridor.medianDeviation.toFixed(0)} span ${b.corridor.routeSpan.toFixed(2)} | stops usable=${b.stops.usable} rate=${b.stops.stationStopRate.toFixed(2)} stray=${b.stops.strayStops}/${b.stops.slowPoints} ratio=${b.stops.strayRatio.toFixed(2)} | ${b.notes.join('|')||'-'}`);
            }
        }
        if (shouldMatch && matched) {
            stats.tp++;
            stats.confTrue.push(best.confidence);
            const ok = best.route.fromStationId === c.truth.fromStationId
                && best.route.toStationId === c.truth.toStationId;
            if (ok) { stats.pairCorrect++; L.pairOk++; } else { stats.pairWrong++; }
        } else if (shouldMatch && !matched) stats.fn++;
        else if (!shouldMatch && matched) { stats.fp++; stats.confFalse.push(best.confidence); }
        else stats.tn++;
    }

    const precision = stats.tp / Math.max(1, stats.tp + stats.fp);
    const recall = stats.tp / Math.max(1, stats.tp + stats.fn);
    const f1 = 2 * precision * recall / Math.max(1e-9, precision + recall);

    if (!quiet) {
        console.log(`\ncases: ${cases.length}  (rail ${cases.filter(c => c.truth.kind === 'rail').length}, decoys ${cases.filter(c => c.truth.kind !== 'rail').length})`);
        console.log(`precision ${precision.toFixed(3)}  recall ${recall.toFixed(3)}  F1 ${f1.toFixed(3)}`);
        console.log(`TP ${stats.tp}  FP ${stats.fp}  FN ${stats.fn}  TN ${stats.tn}`);
        console.log(`station pair exact: ${stats.pairCorrect}/${stats.tp}`);
        console.log('\nby case type:');
        for (const [label, v] of Object.entries(stats.byLabel)) {
            const kind = label.startsWith('rail') ? 'want match' : 'want reject';
            console.log(`  ${label.padEnd(38)} ${kind}  matched ${v.matched}/${v.total}  pairOk ${v.pairOk}`);
        }
        console.log('\nrejection reasons:', JSON.stringify(stats.rejects));
        const avg = (a: number[]) => a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(3) : 'n/a';
        console.log(`confidence: true matches avg ${avg(stats.confTrue)}, false matches avg ${avg(stats.confFalse)}`);
    }
    return { precision, recall, f1, stats };
}

async function main() {
    await build();
    if (process.env.QUIET) {
        const s = await run(DEFAULT_MATCH_OPTIONS, true);
        const pairs = s.stats.pairCorrect;
        console.log(`seed ${SEED}  n=${cases.length}  P ${s.precision.toFixed(3)}  R ${s.recall.toFixed(3)}  F1 ${s.f1.toFixed(3)}  pair ${pairs}/${s.stats.tp}  FP ${s.stats.fp} FN ${s.stats.fn}`);
        return;
    }
    await run(DEFAULT_MATCH_OPTIONS);

    // Where the accept threshold should sit.
    console.log('\nthreshold sweep:');
    for (const minConfidence of [0.40, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80]) {
        const s = await run({ ...DEFAULT_MATCH_OPTIONS, minConfidence }, true);
        console.log(`  ${minConfidence.toFixed(2)}  P ${s.precision.toFixed(3)}  R ${s.recall.toFixed(3)}  F1 ${s.f1.toFixed(3)}  (FP ${s.stats.fp}, FN ${s.stats.fn})`);
    }
    console.log(`\ntotal ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
main();
