import fs from 'fs';
import path from 'path';

function inspectMay15Morning() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const raw = json.semanticSegments || [];

    console.log(`=== 2024-05-15 Morning Segments ===`);
    for (let i = 0; i < raw.length; i++) {
        const s = raw[i];
        const st = s.startTime || '';
        if (st.startsWith('2024-05-15T07:') ||
            st.startsWith('2024-05-15T08:') ||
            st.startsWith('2024-05-15T09:') ||
            st.startsWith('2024-05-15T10:')) {
            console.log(`\n=== Index ${i} [${st} -> ${s.endTime}] ===`);
            console.log(JSON.stringify(s, null, 2));
        }
    }
}

inspectMay15Morning();
