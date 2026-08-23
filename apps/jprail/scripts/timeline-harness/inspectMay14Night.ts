import fs from 'fs';
import path from 'path';

function inspectRawMay14Night() {
    const filePath = path.resolve(process.cwd(), '1a0291b503bff4400d61.json');
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const raw = json.semanticSegments || [];

    for (let i = 0; i < raw.length; i++) {
        const s = raw[i];
        const st = s.startTime || '';
        if (st.startsWith('2024-05-14T14:') ||
            st.startsWith('2024-05-14T15:') ||
            st.startsWith('2024-05-14T16:') ||
            st.startsWith('2024-05-14T17:') ||
            st.startsWith('2024-05-14T18:') ||
            st.startsWith('2024-05-14T19:') ||
            st.startsWith('2024-05-14T20:') ||
            st.startsWith('2024-05-14T21:') ||
            st.startsWith('2024-05-14T22:') ||
            st.startsWith('2024-05-14T23:') ||
            st.startsWith('2024-05-15T00:')) {
            console.log(`\n=== Index ${i} [${st} -> ${s.endTime}] ===`);
            console.log(JSON.stringify(s, null, 2));
        }
    }
}

inspectRawMay14Night();
