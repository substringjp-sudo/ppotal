import * as admin from 'firebase-admin';

async function checkSpecificCities() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'p-plan'
        });
    }
    const db = admin.firestore();

    const cityIds = ['264121541101', '242891409093', '173450753047'];

    console.log('--- Checking Corrupted Cities ---');
    for (const id of cityIds) {
        const doc = await db.collection('geodata').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            console.log(`ID: ${id} (${data?.name || 'Unknown'})`);
            console.log(`Type: ${data?.type}`);
            console.log(`BBOX: min_lng:${data?.bbox_min_lng}, max_lng:${data?.bbox_max_lng}, min_lat:${data?.bbox_min_lat}, max_lat:${data?.bbox_max_lat}`);
            console.log('-------------------');
        } else {
            console.log(`ID: ${id} NOT FOUND`);
        }
    }
}

checkSpecificCities().catch(console.error);
