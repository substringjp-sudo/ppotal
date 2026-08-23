import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchSegment, MatchOptions } from '../../src/lib/timeline/match';
import { makeLocalRouter, loadFixtures } from './localRouter';
import type { CandidateRoute, Router } from '../../src/lib/timeline/types';

function createCachedRouter(innerRouter: Router): Router {
    const cache = new Map<string, Promise<CandidateRoute | null>>();
    return (fromId, toId) => {
        const key = `${fromId}>${toId}`;
        const existing = cache.get(key);
        if (existing) return existing;
        const p = innerRouter(fromId, toId);
        cache.set(key, p);
        return p;
    };
}

async function inspectRejections() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const parseRes = parseTimeline(json);

    function isTrulyInJapan(p: { lat: number; lon: number }): boolean {
        if (p.lat >= 30 && p.lat <= 46 && p.lon >= 129.5 && p.lon <= 146.0) return true;
        if (p.lat >= 26 && p.lat <= 27 && p.lon >= 127.5 && p.lon <= 128.5) return true;
        return false;
    }

    const realJapanSegments = parseRes.segments.filter(s => {
        if (s.trace.length === 0) return false;
        return isTrulyInJapan(s.trace[0]) || isTrulyInJapan(s.trace[s.trace.length - 1]);
    });

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const relaxedOptions: MatchOptions = {
        snapRadiusMeters: 1500,
        candidatesPerEnd: 5,
        minSpanMeters: 400,
        minSpeedKmh: 5,
        maxSpeedKmh: 350,
        minConfidence: 0.35
    };

    console.log('--- Inspecting rail-hinted segments that failed ---');
    const railSegments = realJapanSegments.filter(s => s.hint === 'rail');
    console.log(`Total rail-hinted segments: ${railSegments.length}`);

    for (const s of railSegments) {
        const res = await matchSegment(s, index, router, stationPos, relaxedOptions);
        if (res.candidates.length === 0) {
            const t0 = s.trace[0];
            const tEnd = s.trace[s.trace.length - 1];
            const startNear = index.near(t0.lon, t0.lat, 2000, 3);
            const endNear = index.near(tEnd.lon, tEnd.lat, 2000, 3);
            const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');
            console.log(`[FAIL: ${res.rejectedBecause}] dt=${dt} id=${s.id} pts=${s.trace.length} spanM=${s.reportedMeters ?? 'N/A'}`);
            console.log(`    start=(${t0.lat.toFixed(4)}, ${t0.lon.toFixed(4)}) near: ${startNear.map(x => `${x.name}(${Math.round(x.meters)}m)`).join(', ')}`);
            console.log(`    end=(${tEnd.lat.toFixed(4)}, ${tEnd.lon.toFixed(4)}) near: ${endNear.map(x => `${x.name}(${Math.round(x.meters)}m)`).join(', ')}`);
        }
    }
}

inspectRejections().catch(err => console.error('Failed:', err));
