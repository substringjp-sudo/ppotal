
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'p-plan',
};

async function testQuery() {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  
  console.log('Testing query on geodata...');
  try {
    const collRef = collection(db, 'geodata');
    const q = query(
      collRef,
      where('parentId', '==', '410'), // Korea
      where('type', 'in', ['region', 'prefecture'])
    );
    const snapshot = await getDocs(q);
    console.log(`Success! Found ${snapshot.size} documents.`);
  } catch (error) {
    console.error('Query failed:', error);
  }
}

testQuery();
