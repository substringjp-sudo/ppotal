import fs from 'fs';
import path from 'path';
import { parseTimeline } from '../../src/lib/timeline/parse';
import { StationIndex } from '../../src/lib/timeline/stationIndex';
import { loadFixtures, makeLocalRouter } from './localRouter';
import { metersBetween } from '../../src/lib/timeline/geo';
import type { StationHit } from '../../src/lib/timeline/types';

function getDiverseNearbyStations(
    index: StationIndex,
    lon: number,
    lat: number,
    radiusMeters: number,
    limit: number,
    fixtures: any
): StationHit[] {
    const rawHits = index.near(lon, lat, radiusMeters, 20);
    if (rawHits.length <= limit) return rawHits;

    // Group hits by railway company or distinct line to prevent tram stops from choking JR stations
    const selected: StationHit[] = [];
    const seenLines = new Set<string>();

    // Pass 1: pick closest station for each distinct line/company
    for (const hit of rawHits) {
        const stMeta = fixtures.stations[hit.id];
        const lines = stMeta?.lines ?? [hit.id];
        const lineKey = lines.join(',');
        if (!seenLines.has(lineKey)) {
            seenLines.add(lineKey);
            selected.push(hit);
            if (selected.length >= limit) break;
        }
    }

    // Pass 2: fill remaining slots by raw distance
    if (selected.length < limit) {
        for (const hit of rawHits) {
            if (!selected.some(s => s.id === hit.id)) {
                selected.push(hit);
                if (selected.length >= limit) break;
            }
        }
    }

    return selected.sort((a, b) => a.meters - b.meters);
}

async function testKamigoriWithDiverseCandidates() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const { segments } = parseTimeline(json);
    const fixtures = loadFixtures();
    const index = StationIndex.fromMaster(fixtures.stations as any);
    const router = makeLocalRouter(fixtures);

    // Test segment 9314 (2019-03-28 06:00: Kamigori -> Okayama)
    const seg = segments.find(s => s.id === 'semanticSegments:9314')!;
    console.log('Target segment:', seg.id, seg.hint);

    const first = seg.trace[0];
    const last = seg.trace[seg.trace.length - 1];

    const fromStations = getDiverseNearbyStations(index, first.lon, first.lat, 2000, 8, fixtures);
    const toStations = getDiverseNearbyStations(index, last.lon, last.lat, 2000, 8, fixtures);

    console.log('From stations (Diverse):', fromStations.map(s => `${s.name}(${s.id}, ${Math.round(s.meters)}m)`));
    console.log('To stations (Diverse):', toStations.map(s => `${s.name}(${s.id}, ${Math.round(s.meters)}m)`));

    for (const a of fromStations) {
        for (const b of toStations) {
            if (a.id === b.id) continue;
            const r = await router(a.id, b.id);
            if (r) {
                console.log(`\n🎉 MATCHED ROUTE: ${a.name} -> ${b.name}`);
                console.log(`   Distance: ${(r.distance / 1000).toFixed(1)}km`);
                console.log(`   Stops (${r.stationIds.length}): ${r.stationIds.map(sid => fixtures.stations[sid]?.name ?? sid).join(' -> ')}`);
                return;
            }
        }
    }
    console.log('Still no route found');
}

testKamigoriWithDiverseCandidates().catch(err => console.error(err));
