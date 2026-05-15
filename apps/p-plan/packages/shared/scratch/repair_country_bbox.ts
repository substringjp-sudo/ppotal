import * as admin from 'firebase-admin';

async function repairBbox() {
    if (!admin.apps.length) {
        admin.initializeApp({
            projectId: 'p-plan'
        });
    }
    const db = admin.firestore();

    const repairs = [
        {
            id: '101',
            name: 'Japan',
            bbox: { min_lng: 122.9345, max_lng: 153.9867, min_lat: 20.4227, max_lat: 45.5232 }
        },
        {
            id: '102',
            name: 'Kyrgyzstan',
            bbox: { min_lng: 69.265, max_lng: 80.2223, min_lat: 39.1953, max_lat: 43.265 }
        },
        {
            id: '047',
            name: 'China',
            bbox: { min_lng: 73.4994, max_lng: 134.7755, min_lat: 18.2039, max_lat: 53.5319 }
        },
        {
            id: '093',
            name: 'Korea, South',
            bbox: { min_lng: 124.6384, max_lng: 131.8722, min_lat: 33.1000, max_lat: 38.6122 }
        }
    ];

    console.log('--- Repairing Country BBOX ---');
    for (const r of repairs) {
        // geodata 업데이트
        await db.collection('geodata').doc(r.id).set({
            bbox_min_lng: r.bbox.min_lng,
            bbox_max_lng: r.bbox.max_lng,
            bbox_min_lat: r.bbox.min_lat,
            bbox_max_lat: r.bbox.max_lat
        }, { merge: true });
        console.log(`Updated Geodata: ${r.id} (${r.name})`);

        // search_registry 업데이트
        await db.collection('search_registry').doc(r.id).set({
            bbox: [r.bbox.min_lng, r.bbox.min_lat, r.bbox.max_lng, r.bbox.max_lat]
        }, { merge: true });
        console.log(`Updated Registry: ${r.id} (${r.name})`);
    }
    
    console.log('\nRepair completed successfully.');
}

repairBbox().catch(console.error);
