import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchAll, mergeAdjacent, MatchOptions } from '../../src/lib/timeline/match';
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

async function deepDiagnose() {
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

    console.log(`Real Japan segments: ${realJapanSegments.length}`);

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    // Test different options:
    // 1. snapRadius: 1500m
    // 2. minConfidence: 0.35
    // 3. minSpeed: 6km/h
    // 4. minSpan: 400m
    const relaxedOptions: MatchOptions = {
        snapRadiusMeters: 1500,
        candidatesPerEnd: 5,
        minSpanMeters: 400,
        minSpeedKmh: 5,
        maxSpeedKmh: 350,
        minConfidence: 0.35
    };

    console.log('\n--- Testing with Relaxed Options (snap=1500m, minConf=0.35, minSpeed=5km/h) ---');
    const startMatch = Date.now();
    const matched = await matchAll(realJapanSegments, index, router, stationPos, relaxedOptions);
    console.log(`Matched in ${((Date.now() - startMatch) / 1000).toFixed(2)}s`);

    const rejections: Record<string, number> = {};
    let withCandidate = 0;
    for (const m of matched) {
        if (m.candidates.length > 0) {
            withCandidate++;
        } else if (m.rejectedBecause) {
            rejections[m.rejectedBecause] = (rejections[m.rejectedBecause] ?? 0) + 1;
        }
    }

    console.log(`Segments with >= 1 match: ${withCandidate} / ${realJapanSegments.length} (${(withCandidate / realJapanSegments.length * 100).toFixed(1)}%)`);
    console.log('Rejections:', rejections);

    const merged = mergeAdjacent(matched, 20 * 60_000);
    const mergedMatched = merged.filter(m => m.candidates.length > 0);
    console.log(`After mergeAdjacent (20min): ${mergedMatched.length} trips!`);

    // Let's inspect some of the low confidence ones that passed now
    console.log('\n--- Sample Matched Trips ---');
    for (const m of mergedMatched.slice(0, 30)) {
        const c = m.candidates[0]!;
        const fromName = (fixtures.stations as any)[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const toName = (fixtures.stations as any)[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(0, 16).replace('T', ' ');
        const distKm = (c.route.distance / 1000).toFixed(1);
        const linesStr = c.route.lineIds.map(lid => (fixtures.lines as any)[String(lid)]?.name ?? lid).join(', ');
        console.log(`  [${dt}] ${fromName} -> ${toName} (${distKm}km, speed=${c.speedKmh}km/h, conf=${c.confidence}, hint=${m.segment.hint}) [${linesStr}]`);
    }
}

deepDiagnose().catch(err => console.error('Failed:', err));
