const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const Database = require('better-sqlite3');
const path = require('path');

/**
 * PPLANER Firestore Seeding - TURBO BATCH MODE
 * 500건씩 묶어 초고속으로 시딩합니다.
 */

const DB_PATH = path.join(__dirname, '../data/geodata.db');
const PROJECT_ID = 'p-plan';
const DATABASE_ID = '(default)';
const BATCH_SIZE = 50;

async function startSeeding() {
    console.log('--- TURBO BATCH SEEDING START ---');
    console.log(`- Project: ${PROJECT_ID}`);
    console.log(`- Database: ${DATABASE_ID}`);
    
    try {
        if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
        const db = getFirestore(DATABASE_ID);
        const sqlite = new Database(DB_PATH, { readonly: true });

        const query = sqlite.prepare(`SELECT * FROM geodata`);
        let count = 0;
        let batch = db.batch();

        for (const row of query.iterate()) {
            const geometrySize = row.geometry ? Buffer.byteLength(row.geometry) : 0;
            
            if (geometrySize > 1048000) { // Safety margin slightly below 1MiB
                console.log(`\n[SKIP] ID: ${row.id} (${row.name}) - Geometry too large (${geometrySize} bytes)`);
                continue;
            }

            const docRef = db.collection('geodata').doc(row.id);
            batch.set(docRef, {
                type: row.type,
                name: row.name,
                parentId: row.parentId,
                bbox_min_lng: row.bbox_min_lng !== null ? Number(row.bbox_min_lng) : null,
                bbox_min_lat: row.bbox_min_lat !== null ? Number(row.bbox_min_lat) : null,
                bbox_max_lng: row.bbox_max_lng !== null ? Number(row.bbox_max_lng) : null,
                bbox_max_lat: row.bbox_max_lat !== null ? Number(row.bbox_max_lat) : null,
                geometry: row.geometry,
                properties: row.properties,
                updatedAt: FieldValue.serverTimestamp()
            });

            count++;

            if (count % BATCH_SIZE === 0) {
                console.log(`[BATCH] Committing up to ${count} records...`);
                await batch.commit();
                batch = db.batch();
            }
        }

        // 마지막 남은 배치 커밋
        if (count % BATCH_SIZE !== 0) {
            console.log(`[BATCH] Committing final ${count % BATCH_SIZE} records...`);
            await batch.commit();
        }

        console.log(`\n--- ALL DATA SYNCED SUCCESSFULLY (${count} records) ---`);

        sqlite.close();

    } catch (error) {
        console.error('\n[FATAL ERROR]', error instanceof Error ? error.message : error);
    }
}

startSeeding();
