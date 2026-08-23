import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateKamigoriOkayama() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    console.log(`Total segments: ${segments.length}`);

    // Find stations for Kamigori & Okayama
    // Kamigori: 上郡 (Hyogo/Okayama border)
    // Okayama: 岡山
    let kamigoriStations = Object.values(fixtures.stations).filter(s => s.name.includes('上郡') || s.name.includes('かみごおり'));
    let okayamaStations = Object.values(fixtures.stations).filter(s => s.name.includes('岡山'));

    console.log('Kamigori stations:', kamigoriStations);
    console.log('Okayama stations:', okayamaStations.slice(0, 5));

    // Find any segments where trace touches near Kamigori or Okayama or between them
    // Kamigori lat/lon: ~34.86, 134.35
    // Okayama lat/lon: ~34.66, 133.91
    const relevantSegs = segments.filter(s => {
        return s.trace.some(p => {
            // Check bounding box around Kamigori <-> Okayama
            // lat: 34.5 ~ 35.0, lon: 133.8 ~ 134.5
            return p.lat >= 34.5 && p.lat <= 35.0 && p.lon >= 133.8 && p.lon <= 134.5;
        });
    });

    console.log(`\nFound ${relevantSegs.length} segments in Kamigori <-> Okayama region\n`);

    for (const s of relevantSegs) {
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

        // Test router between nearest stations
        if (startNear[0] && endNear[0]) {
            try {
                const r = await router(startNear[0].id, endNear[0].id);
                if (r) {
                    console.log(`  -> Router: ${startNear[0].name} -> ${endNear[0].name} = ${(r.distance / 1000).toFixed(1)}km, stops=${r.stationIds.length}, lines=${r.lineIds.join(',')}`);
                } else {
                    console.log(`  -> Router: NO ROUTE FOUND between ${startNear[0].name}(${startNear[0].id}) and ${endNear[0].name}(${endNear[0].id})`);
                }
            } catch (err) {
                console.log(`  -> Router error:`, err);
            }
        }
    }
}

investigateKamigoriOkayama().catch(err => console.error('Failed:', err));
