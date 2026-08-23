import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { scoreCorridor } from '../../src/lib/timeline/corridor';
import { metersBetween } from '../../src/lib/timeline/geo';

async function stepByStepMatch() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    const seg = segments.find(s => s.id === 'semanticSegments:30362')!;
    const fromId = '002404'; // Oarai
    const toId = '002804'; // Kashima-Jingu

    const route = await router(fromId, toId);
    console.log('Route:', route ? 'found' : 'null');
    console.log('route.geometry.length:', route?.geometry?.length);

    const corridor = scoreCorridor(seg.trace, route!);
    console.log('corridor:', corridor);

    const first = seg.trace[0];
    const last = seg.trace[seg.trace.length - 1];
    const span = metersBetween([first.lon, first.lat], [last.lon, last.lat]);
    const ground = Math.max(span, seg.reportedMeters ?? 0);

    const TIGHTNESS_SCALE_M = 130;
    const startProximity = Math.max(0, 1 - 147 / 1800);
    const endProximity = Math.max(0, 1 - 688 / 1800);
    const endpointScore = (startProximity + endProximity) / 2;

    const tightness = Number.isFinite(corridor.medianDeviation)
        ? Math.exp(-((corridor.medianDeviation / TIGHTNESS_SCALE_M) ** 2))
        : 0;

    let score = 0.35 * corridor.coverage + 0.25 * tightness + 0.25 * corridor.routeSpan + 0.15 * endpointScore;
    console.log(`confidence score = ${score}`);
    console.log(`minConfidence = 0.30`);
}

stepByStepMatch().catch(err => console.error(err));
