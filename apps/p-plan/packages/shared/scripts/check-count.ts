const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROJECT_ID = 'p-plan';

async function checkCount() {
    if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
    const db = getFirestore();
    const snapshot = await db.collection('geodata').count().get();
    console.log(`Current Firestore 'geodata' count: ${snapshot.data().count}`);
}

checkCount();
