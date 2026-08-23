import fs from 'fs';
import path from 'path';

function inspectRawKeys() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    const rawSegments = json.semanticSegments || [];
    console.log(`Sample segment keys (first 10):`);
    for (let i = 0; i < Math.min(10, rawSegments.length); i++) {
        console.log(`Seg ${i}:`, Object.keys(rawSegments[i]));
        console.log(JSON.stringify(rawSegments[i], null, 2));
    }
}

inspectRawKeys();
