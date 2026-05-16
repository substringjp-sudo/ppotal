const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
    projectId: 'p-plan'
});

const db = getFirestore();

async function check() {
    try {
        const geoCount = await db.collection('geodata').count().get();
        const searchCount = await db.collection('search_registry').count().get();
        console.log('--- Database Status ---');
        console.log('Geodata documents:', geoCount.data().count);
        console.log('SearchRegistry documents:', searchCount.data().count);
    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
