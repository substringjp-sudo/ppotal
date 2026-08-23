import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS } from '../../src/lib/timeline/match';

async function testOaraiKashimaSegment() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    // Test routing between Oarai (002404) and Kashima-Jingu (002804)
    console.log('Testing router directly:');
    const r1 = await router('002404', '002804');
    console.log('Router Oarai(002404) -> Kashima-Jingu(002804):', r1 ? `${(r1.distance / 1000).toFixed(1)}km, stops=${r1.stationIds.length}` : 'NO ROUTE');
    if (r1) {
        console.log(`  Stops (${r1.stationIds.length}): ${r1.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
        console.log(`  Line IDs: ${r1.lineIds.join(', ')}`);
    }

    // Now test 2025-04-08 segments
    const apr8 = segments.filter(s => {
        const d = new Date(s.startTime).toISOString().slice(0, 10);
        return d === '2025-04-08';
    });
    console.log(`\nFound ${apr8.length} segments on 2025-04-08`);

    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const matched = await matchAll(apr8, index, router, stationPos, DEFAULT_MATCH_OPTIONS);
    console.log(`Matched segments count: ${matched.length}`);

    for (const m of matched) {
        const seg = m.segment;
        console.log(`\nSeg ${seg.id} (${new Date(seg.startTime).toISOString().slice(11, 16)}) hint=${seg.hint}, pts=${seg.trace.length}:`);
        if (m.candidates.length === 0) {
            console.log(`  ❌ NO CANDIDATE MATCHED`);
        } else {
            for (const c of m.candidates) {
                const fName = fixtures.stations[c.route.fromStationId]?.name ?? c.route.fromStationId;
                const tName = fixtures.stations[c.route.toStationId]?.name ?? c.route.toStationId;
                console.log(`  ✅ Candidate: ${fName} -> ${tName} (${(c.route.distance / 1000).toFixed(1)}km, conf=${c.confidence.toFixed(3)})`);
            }
        }
    }
}

testOaraiKashimaSegment().catch(err => console.error(err));
