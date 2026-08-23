import fs from 'fs';
import path from 'path';

function inspectGap() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const raw = json.semanticSegments || [];

    for (let i = 40035; i <= 40042; i++) {
        console.log(`\n=== Segment ${i} ===`);
        console.log(JSON.stringify(raw[i], null, 2));
    }
}

inspectGap();
