import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { matchAll, mergeAdjacent, DEFAULT_MATCH_OPTIONS, isPointInJapan } from '../../src/lib/timeline/match';

async function testMay14_15Results() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const may1415 = segments.filter(s => {
        const d = new Date(s.startTime).toISOString().slice(0, 10);
        return d === '2024-05-14' || d === '2024-05-15';
    });

    console.log(`May 14-15 segments count after gap filling: ${may1415.length}`);

    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    const matched = await matchAll(may1415, index, router, stationPos, DEFAULT_MATCH_OPTIONS);
    const merged = mergeAdjacent(matched);

    console.log(`\nRecognized Trips on 2024-05-14 and 2024-05-15 (Total ${merged.length}):`);
    for (const m of merged) {
        if (m.candidates.length === 0) continue;
        const c = m.candidates[0]!;
        const fName = fixtures.stations[c.route.fromStationId]?.name ?? c.route.fromStationId;
        const tName = fixtures.stations[c.route.toStationId]?.name ?? c.route.toStationId;
        const dt = new Date(m.segment.startTime).toISOString().slice(0, 16).replace('T', ' ');
        console.log(`  [${dt}] ${fName} -> ${tName} (${(c.route.distance / 1000).toFixed(1)}km, conf=${c.confidence.toFixed(2)}, hint=${m.segment.hint}) [${c.route.stationIds.length} stations]`);
    }
}

testMay14_15Results().catch(err => console.error(err));
