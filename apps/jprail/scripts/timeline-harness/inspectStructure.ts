import fs from 'fs';
import path from 'path';

function inspectTimelineStructure() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const sampleActivitySegments: any[] = [];
    const samplePlaceVisits: any[] = [];
    let transitStopsCount = 0;
    let namedLocationCount = 0;

    // Search for semanticSegments
    const rawSegments = json.semanticSegments || [];
    console.log(`Total raw semanticSegments: ${rawSegments.length}`);

    for (const seg of rawSegments) {
        if (seg.activitySegment) {
            const act = seg.activitySegment;
            if (act.transitPath || (act.activityType && act.activityType.includes('TRAIN'))) {
                if (sampleActivitySegments.length < 5) sampleActivitySegments.push(act);
            }
            if (act.transitPath) transitStopsCount++;
            if (act.startLocation?.name || act.endLocation?.name) namedLocationCount++;
        }
        if (seg.placeVisit) {
            if (samplePlaceVisits.length < 3) samplePlaceVisits.push(seg.placeVisit);
        }
    }

    console.log(`activitySegments with transitPath: ${transitStopsCount}`);
    console.log(`activitySegments with named start/endLocation: ${namedLocationCount}`);

    console.log('\n--- Sample Activity Segment with Train/Transit ---');
    console.log(JSON.stringify(sampleActivitySegments[0], null, 2));

    console.log('\n--- Sample Place Visit ---');
    console.log(JSON.stringify(samplePlaceVisits[0], null, 2));
}

inspectTimelineStructure();
