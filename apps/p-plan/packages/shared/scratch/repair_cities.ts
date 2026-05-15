import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: 'p-plan'
  });
}

const db = admin.firestore();

async function repairCities() {
  console.log('--- Repairing Corrupted City Data ---');

  // 1. Tadotsu (264121541101) - 현재 히로시마 위치에 있음 -> 카가와 실제 위치로 이동
  const tadotsuId = '264121541101';
  const tadotsuBbox = {
    min_lng: 133.7,
    max_lng: 133.8,
    min_lat: 34.2,
    max_lat: 34.3
  };

  const collections = ['geodata', 'search_registry'];

  for (const coll of collections) {
    const docRef = db.collection(coll).doc(tadotsuId);
    const doc = await docRef.get();
    if (doc.exists) {
      console.log(`Updating BBOX for ${tadotsuId} in ${coll}...`);
      await docRef.set({ bbox: tadotsuBbox }, { merge: true });
    }
  }

  // 2. 혹시 히로시마 타케하라(1541101)의 BBOX가 이상한지 확인 (정상이라면 유지)
  // 타케하라 좌표: 34.2757461, 133.0204935
  const takeharaId = '1541101';
  const takeharaBbox = {
    min_lng: 132.9,
    max_lng: 133.1,
    min_lat: 34.2,
    max_lat: 34.4
  };
  
  for (const coll of collections) {
    const docRef = db.collection(coll).doc(takeharaId);
    const doc = await docRef.get();
    if (doc.exists) {
      console.log(`Ensuring BBOX for Takehara ${takeharaId} in ${coll}...`);
      await docRef.set({ bbox: takeharaBbox }, { merge: true });
    }
  }

  console.log('Done.');
}

repairCities().catch(console.error);
