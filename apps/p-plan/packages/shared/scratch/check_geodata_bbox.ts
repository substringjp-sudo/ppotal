import * as admin from 'firebase-admin';

async function checkData() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'p-plan'
        });
    }
    const db = admin.firestore();

    const ids = ['101', '102', '093', '047']; // Japan, Kyrgyzstan, Korea, China
    
    console.log('--- Geodata Check ---');
    for (const id of ids) {
        const doc = await db.collection('geodata').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`ID: ${id} (${data?.name})`);
            console.log(`BBOX: min_lng:${data?.bbox_min_lng}, max_lng:${data?.bbox_max_lng}, min_lat:${data?.bbox_min_lat}, max_lat:${data?.bbox_max_lat}`);
            console.log(`Type: ${data?.type}`);
            console.log('-------------------');
        } else {
            console.log(`ID: ${id} NOT FOUND`);
        }
    }

    // 또한 일본 영해 경계 근처의 도시들도 확인
    console.log('\n--- Cities near Japan Sea Boundary (34.26, 133.39) ---');
    const cities = await db.collection('geodata')
        .where('type', '==', 'city')
        .where('bbox_min_lng', '<=', 133.39)
        .orderBy('bbox_min_lng', 'desc')
        .limit(10)
        .get();
    
    for (const d of cities.docs) {
        const data = d.data();
        if (133.39 <= data.bbox_max_lng && 34.26 >= data.bbox_min_lat && 34.26 <= data.bbox_max_lat) {
            console.log(`City: ${data.name} (${d.id}), PrefectureId: ${data.parentId}`);
        }
    }
}

checkData().catch(console.error);
