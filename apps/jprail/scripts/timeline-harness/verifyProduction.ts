import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS, isPointInJapan } from '../../src/lib/timeline/match';
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

async function verifyProductionFinal() {
    console.log('=== Verifying Final Production 2-Stage Pipeline on 133MB Real Dataset ===');
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const t0 = Date.now();
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`[1] JSON parsed in ${((Date.now() - t0) / 1000).toFixed(2)}s`);

    const tParse = Date.now();
    const { segments, skipped } = parseTimeline(json);
    console.log(`[2] parseTimeline: ${segments.length} segments in ${((Date.now() - tParse) / 1000).toFixed(2)}s (skipped:`, skipped, ')');

    const tFilter = Date.now();
    const targetSegments = segments.filter(s => {
        if (s.trace.length === 0) return false;
        if (s.hint !== 'rail' && s.hint !== 'unknown') return false;
        const f = s.trace[0];
        const l = s.trace[s.trace.length - 1];
        return isPointInJapan(f.lat, f.lon) || isPointInJapan(l.lat, l.lon);
    });
    console.log(`[3] Target Japan segments (rail/unknown): ${targetSegments.length} in ${((Date.now() - tFilter) / 1000).toFixed(3)}s`);

    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = createCachedRouter(makeLocalRouter(fixtures));
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const tMatch = Date.now();
    const matched = await matchAll(
        targetSegments, index, router, stationPos, DEFAULT_MATCH_OPTIONS,
        (done, total) => {
            if (done % 500 === 0 || done === total) {
                console.log(`Progress: ${done} / ${total} (${((Date.now() - tMatch) / 1000).toFixed(2)}s)`);
            }
        },
        12
    );
    console.log(`[4] matchAll finished in ${((Date.now() - tMatch) / 1000).toFixed(2)}s`);

    const merged = mergeAdjacent(matched);
    const mergedMatched = merged.filter(m => m.candidates.length > 0);

    console.log(`\n======================================================`);
    console.log(`🎉 TOTAL RECOGNIZED RAIL JOURNEYS: ${mergedMatched.length} routes`);
    console.log(`⚡ TOTAL TIME (FROM RAW 133MB FILE): ${((Date.now() - t0) / 1000).toFixed(2)}s`);
    console.log(`======================================================\n`);

    const yearGroups = new Map<string, number>();
    for (const m of mergedMatched) {
        const y = new Date(m.segment.startTime).toISOString().slice(0, 4);
        yearGroups.set(y, (yearGroups.get(y) ?? 0) + 1);
    }
    console.log('Trips per year:', Object.fromEntries(yearGroups.entries()));
}

verifyProductionFinal().catch(err => console.error('Verification failed:', err));
