import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { matchSegment, DEFAULT_MATCH_OPTIONS } from '../../src/lib/timeline/match';

async function testMatch30362Log() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    const stationPos = (id: string) => {
        const s = (fixtures.stations as any)[id];
        return s ? { lat: s.lat, lon: s.lon } : null;
    };

    console.log(`Testing matchSegment on 30362...`);
    const res = await matchSegment(seg, index, router, stationPos, DEFAULT_MATCH_OPTIONS);
    console.log(`Rejected because:`, res.rejectedBecause);
    console.log(`Candidates count:`, res.candidates.length);
}

testMatch30362Log().catch(err => console.error(err));
