import fs from 'fs';
import path from 'path';

function inspectRawAroundRinku() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const raw = json.semanticSegments || [];

    console.log(`Searching raw segments around 2024-05-14 14:00 to 2024-05-15 01:00...`);
    for (let i = 0; i < raw.length; i++) {
        const s = raw[i];
        const st = s.startTime || '';
        if (st.startsWith('2024-05-14') || st.startsWith('2024-05-15')) {
            const keys = Object.keys(s);
            console.log(`\nIndex ${i} [${st} -> ${s.endTime}] Keys: ${keys.join(', ')}`);
            if (s.activity) {
                console.log('  activity:', JSON.stringify(s.activity, null, 2));
            }
            if (s.visit) {
                console.log('  visit:', JSON.stringify(s.visit, null, 2));
            }
            if (s.timelinePath) {
                console.log(`  timelinePath: ${s.timelinePath.length} points`);
                console.log('  first pt:', s.timelinePath[0]);
                console.log('  last pt:', s.timelinePath[s.timelinePath.length - 1]);
            }
        }
    }
}

inspectRawAroundRinku();
