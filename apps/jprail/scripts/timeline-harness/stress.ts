/**
 * Where does this break?
 *
 * The clean numbers come from decoys at a comfortable distance and rides with
 * decent GPS. These are the cases I expect to fail: a road right beside the
 * track, a trace with city-grade noise, and rides in Tokyo where two lines run
 * alongside each other for tens of kilometres.
 */
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchSegment, DEFAULT_MATCH_OPTIONS } from '../../src/lib/timeline/match';
import { prepareLine, nearestOnLine } from '../../src/lib/timeline/geo';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { rng, randomRide, sampleTrace, segmentOf, offsetLine, cumulative } from './synth';

const fx = loadFixtures();
const index = StationIndex.fromMaster(fx.stations as any);
const router = makeLocalRouter(fx);
const stationPos = (id: string) => { const s = fx.stations[id]; return s ? { lat: s.lat, lon: s.lon } : null; };

/** Roughly the 23 wards — where parallel running is the norm. */
const inTokyo = (lat: number, lon: number) =>
    lat > 35.53 && lat < 35.82 && lon > 139.58 && lon < 139.92;

const tokyoStations = Object.values(fx.stations).filter(s => inTokyo(s.lat, s.lon)).map(s => s.id);

async function truthRide(rand: () => number, urbanOnly: boolean) {
    for (let i = 0; i < 300; i++) {
        const pool = urbanOnly ? tokyoStations : Object.keys(fx.graph);
        const start = pool[Math.floor(rand() * pool.length)];
        if (!fx.graph[start]) continue;
        const walk = randomRide(fx, rand, 3 + Math.floor(rand() * 7));
        const seed = urbanOnly ? start : walk[0];
        if (!walk.length) continue;
        const target = urbanOnly
            ? (() => { // walk the graph from the urban seed
                let cur = seed; const p = [cur]; const seen = new Set([cur]);
                for (let h = 0; h < 6; h++) {
                    const ns = Object.keys(fx.graph[cur] ?? {}).filter(n => !seen.has(n));
                    if (!ns.length) break;
                    cur = ns[Math.floor(rand() * ns.length)]; seen.add(cur); p.push(cur);
                }
                return p[p.length - 1];
            })()
            : walk[walk.length - 1];
        if (target === seed) continue;
        const route = await router(seed, target);
        if (!route || route.geometry.length < 10) continue;
        const total = cumulative(route.geometry).pop() ?? 0;
        if (total < 2500) continue;
        return { route, total };
    }
    return null;
}

function stopFractions(geom: [number, number][], stationIds: string[]) {
    const prepared = prepareLine(geom);
    return stationIds.slice(1, -1).map(id => {
        const st = fx.stations[id];
        if (!st || prepared.length === 0) return null;
        const { along, distance } = nearestOnLine(prepared, st.lon, st.lat);
        return distance > 400 ? null : along / prepared.length;
    }).filter((f): f is number => f !== null && f > 0.01 && f < 0.99);
}

interface Scenario { name: string; urban: boolean; run: (geom: [number, number][], stops: number[], t: number, rand: () => number) => any; want: 'match' | 'reject'; }

const SCENARIOS: Scenario[] = [
    {
        name: 'road 40m off the track, rail-labelled', urban: false, want: 'reject',
        run: (geom, _s, t, rand) => sampleTrace(offsetLine(geom, 40), t, {
            intervalSec: 20, noiseM: 15, tunnelFraction: 0,
            stopsAt: Array.from({ length: 6 }, () => 0.1 + rand() * 0.8), stopSec: 50, speedKmh: 38
        }, rand)
    },
    {
        name: 'road 25m off the track, rail-labelled', urban: false, want: 'reject',
        run: (geom, _s, t, rand) => sampleTrace(offsetLine(geom, 25), t, {
            intervalSec: 20, noiseM: 15, tunnelFraction: 0,
            stopsAt: Array.from({ length: 6 }, () => 0.1 + rand() * 0.8), stopSec: 50, speedKmh: 38
        }, rand)
    },
    {
        name: 'real ride, city-grade GPS (50m sigma)', urban: false, want: 'match',
        run: (geom, stops, t, rand) => sampleTrace(geom, t, {
            intervalSec: 30, noiseM: 50, tunnelFraction: 0, stopsAt: stops, stopSec: 40, speedKmh: 50
        }, rand)
    },
    {
        name: 'real ride, awful GPS (90m sigma)', urban: false, want: 'match',
        run: (geom, stops, t, rand) => sampleTrace(geom, t, {
            intervalSec: 30, noiseM: 90, tunnelFraction: 0, stopsAt: stops, stopSec: 40, speedKmh: 50
        }, rand)
    },
    {
        name: 'Tokyo ride (parallel lines everywhere)', urban: true, want: 'match',
        run: (geom, stops, t, rand) => sampleTrace(geom, t, {
            intervalSec: 30, noiseM: 30, tunnelFraction: 0, stopsAt: stops, stopSec: 35, speedKmh: 45
        }, rand)
    },
    {
        name: 'Tokyo subway, 80% tunnel, walk-labelled', urban: true, want: 'match',
        run: (geom, stops, t, rand) => sampleTrace(geom, t, {
            intervalSec: 45, noiseM: 35, tunnelFraction: 0.8, stopsAt: stops, stopSec: 30, speedKmh: 35
        }, rand)
    }
];

async function main() {
    const N = Number(process.env.N ?? 25);
    console.log(`tokyo station pool: ${tokyoStations.length}\n`);
    for (const sc of SEEDS_SCENARIOS()) void sc;

    for (const sc of SCENARIOS) {
        const rand = rng(4242);
        let t = Date.parse('2026-04-01T09:00:00Z');
        let matched = 0, pairOk = 0, total = 0;
        const confs: number[] = [];
        for (let i = 0; i < N; i++) {
            const tr = await truthRide(rand, sc.urban);
            if (!tr) continue;
            const stops = stopFractions(tr.route.geometry, tr.route.stationIds);
            const trace = sc.run(tr.route.geometry, stops, t += 6 * 3600_000, rand);
            if (!trace || trace.length < 3) continue;
            total++;
            const hint = sc.want === 'reject' ? 'rail' : (i % 2 ? 'foot' : 'road');
            const seg = segmentOf(`s${i}`, trace, hint as any, tr.total);
            const r = await matchSegment(seg, index, router, stationPos, DEFAULT_MATCH_OPTIONS);
            const best = r.candidates[0];
            if (best) {
                matched++;
                confs.push(best.confidence);
                if (best.route.fromStationId === tr.route.fromStationId
                    && best.route.toStationId === tr.route.toStationId) pairOk++;
            }
        }
        const rate = total ? matched / total : 0;
        const verdict = sc.want === 'match'
            ? `recall ${rate.toFixed(2)}  pairOk ${pairOk}/${matched}`
            : `LEAKED ${matched}/${total} (${(rate * 100).toFixed(0)}%)`;
        const avg = confs.length ? (confs.reduce((a, b) => a + b, 0) / confs.length).toFixed(2) : 'n/a';
        console.log(`${sc.name.padEnd(42)} want ${sc.want.padEnd(6)} ${verdict}  avgConf ${avg}`);
    }
}
function SEEDS_SCENARIOS() { return []; }
main();
