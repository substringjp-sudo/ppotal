import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

function checkDist() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    const kashima = (fixtures.stations as any)['002804'];
    console.log('Kashima station pos:', kashima);

    for (let i = 0; i < seg.trace.length; i++) {
        const p = seg.trace[i];
        const d = metersBetween([p.lon, p.lat], [kashima.lon, kashima.lat]);
        console.log(`pt[${i}] -> Kashima-Jingu: ${Math.round(d)}m`);
    }

    const lastPt = seg.trace[seg.trace.length - 1];
    const hits = index.near(lastPt.lon, lastPt.lat, 1800, 10);
    console.log('\nHits from lastPt (1800m):', hits);
}

checkDist();
