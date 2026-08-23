import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';

async function investigateOaraiKashimaLine() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    console.log('=== Searching Oarai Kashima Line stations in fixtures ===');
    const oaraiStations = Object.values(fixtures.stations).filter(s =>
        s.name.includes('大洗') || s.name.includes('鹿島') || (s.name.includes('水戸') && s.lat > 36.3)
    );
    console.log(`Found ${oaraiStations.length} relevant stations in fixtures:`);
    for (const s of oaraiStations.slice(0, 10)) {
        console.log(`  ${s.name} (${s.id}): [${s.lat.toFixed(4)}, ${s.lon.toFixed(4)}]`);
    }

    // Check router between Mito and Oarai or Kashima
    const mitoSt = oaraiStations.find(s => s.name === '水戸');
    const oaraiSt = oaraiStations.find(s => s.name === '大洗');
    const kashimaSt = oaraiStations.find(s => s.name.includes('鹿島神宮'));

    if (mitoSt && oaraiSt) {
        const r1 = await router(mitoSt.id, oaraiSt.id);
        console.log(`\nRouter Mito(${mitoSt.id}) -> Oarai(${oaraiSt.id}):`, r1 ? `${(r1.distance / 1000).toFixed(1)}km, stops=${r1.stationIds.length}, lines=${r1.lineIds.join(',')}` : 'NO ROUTE');
        if (r1) {
            console.log(`  Stops: ${r1.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
        }
    }
    if (oaraiSt && kashimaSt) {
        const r2 = await router(oaraiSt.id, kashimaSt.id);
        console.log(`\nRouter Oarai(${oaraiSt.id}) -> Kashima-Jingu(${kashimaSt.id}):`, r2 ? `${(r2.distance / 1000).toFixed(1)}km, stops=${r2.stationIds.length}, lines=${r2.lineIds.join(',')}` : 'NO ROUTE');
        if (r2) {
            console.log(`  Stops: ${r2.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
        }
    }

    console.log('\n=== Searching segments in Oarai / Kashima / Mito region in Timeline ===');
    // Region bounding box: lat 35.8 ~ 36.6, lon 140.2 ~ 140.8
    const oaraiSegs = segments.filter(s => {
        return s.trace.some(p => {
            return p.lat >= 35.8 && p.lat <= 36.6 && p.lon >= 140.2 && p.lon <= 140.8;
        });
    });

    console.log(`Found ${oaraiSegs.length} segments in Oarai/Kashima region\n`);
    for (const s of oaraiSegs) {
        const t0 = s.trace[0];
        const tEnd = s.trace[s.trace.length - 1];
        const startNear = index.near(t0.lon, t0.lat, 3000, 3);
        const endNear = index.near(tEnd.lon, tEnd.lat, 3000, 3);
        const dist = metersBetween([t0.lon, t0.lat], [tEnd.lon, tEnd.lat]);
        const dt = new Date(s.startTime).toISOString().slice(0, 16).replace('T', ' ');
        const durMin = (s.endTime - s.startTime) / 60000;
        const kmh = durMin > 0 ? (dist / 1000) / (durMin / 60) : 0;

        // Check if touches Oarai
        const touchesOarai = s.trace.some(p => metersBetween([p.lon, p.lat], [140.563, 36.315]) < 5000);

        console.log(`-------------------------------------------------------------------`);
        console.log(`[${dt}] id=${s.id}, hint=${s.hint}, pts=${s.trace.length}, dist=${(dist / 1000).toFixed(1)}km, dur=${durMin.toFixed(0)}m, speed=${kmh.toFixed(1)}km/h, touchesOarai=${touchesOarai}`);
        console.log(`  Start: ${startNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
        console.log(`  End:   ${endNear.map(x => `${x.name}(${x.id}, ${Math.round(x.meters)}m)`).join(', ')}`);
    }
}

investigateOaraiKashimaLine().catch(err => console.error('Failed:', err));
