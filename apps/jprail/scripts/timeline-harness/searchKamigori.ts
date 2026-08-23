import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function searchAllKamigoriSegments() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    // Kamigori: lat ~ 34.865, lon ~ 134.354
    const kamigoriCoord = { lat: 34.865, lon: 134.354 };

    const matching = segments.filter(s => {
        return s.trace.some(p => {
            return metersBetween([p.lon, p.lat], [kamigoriCoord.lon, kamigoriCoord.lat]) <= 30000;
        });
    });

    console.log(`Found ${matching.length} segments near Kamigori (+/- 30km)\n`);

    for (const s of matching) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 2500, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 2500, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const durationMin = (s.endTime - s.startTime) / 60000;
        const kmh = durationMin > 0 ? (dist / 1000) / (durationMin / 60) : 0;
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');

        console.log(`-------------------------------------------------------------------`);
        console.log(`[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km, time=${durationMin.toFixed(0)}m, speed=${kmh.toFixed(1)}km/h`);
        console.log(`  Start (${t0.lat.toFixed(4)}, ${t0.lon.toFixed(4)}): ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        console.log(`  End   (${tEnd.lat.toFixed(4)}, ${tEnd.lon.toFixed(4)}): ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);

        for (const a of startNear) {
            for (const b of endNear) {
                if (a.id === b.id) continue;
                const r = await router(a.id, b.id);
                if (r) {
                    console.log(`    Router candidate: ${a.name}(${a.id}) -> ${b.name}(${b.id}) = ${(r.distance / 1000).toFixed(1)}km, stops=${r.stationIds.length}, lines=${r.lineIds.join(',')}`);
                    break;
                } else {
                    console.log(`    Router candidate: NO ROUTE between ${a.name}(${a.id}) and ${b.name}(${b.id})`);
                }
            }
            break;
        }
    }
}

searchAllKamigoriSegments().catch(err => console.error('Failed:', err));
