
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const PROJECT_ID = 'p-plan';

async function checkSeoul() {
    if (getApps().length === 0) initializeApp({ projectId: PROJECT_ID });
    const db = getFirestore();
    
    console.log('--- CHECKING FOR "서울" ---');
    const snapshot = await db.collection('search_registry')
        .where('name', '==', '서울')
        .get();
        
    if (snapshot.empty) {
        console.log('❌ "서울" NOT FOUND');
        
        console.log('Checking "Seoul"...');
        const seoulSnap = await db.collection('search_registry')
            .where('name', '==', 'Seoul')
            .get();
        if (!seoulSnap.empty) {
            console.log('✅ "Seoul" FOUND with ID:', seoulSnap.docs[0].data().id);
            const data = seoulSnap.docs[0].data();
            console.log('Data:', JSON.stringify(data, null, 2));
        }
    } else {
        console.log('✅ "서울" FOUND!');
        snapshot.docs.forEach(doc => console.log(doc.id, doc.data().name));
    }
}

checkSeoul();
