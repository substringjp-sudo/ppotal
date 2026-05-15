"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("firebase/app");
const firestore_1 = require("firebase/firestore");
const firebaseConfig = {
    projectId: 'p-plan',
};
async function testQuery() {
    const app = (0, app_1.initializeApp)(firebaseConfig);
    const db = (0, firestore_1.getFirestore)(app);
    console.log('Testing query on geodata...');
    try {
        const collRef = (0, firestore_1.collection)(db, 'geodata');
        const q = (0, firestore_1.query)(collRef, (0, firestore_1.where)('parentId', '==', '410'), // Korea
        (0, firestore_1.where)('type', 'in', ['region', 'prefecture']));
        const snapshot = await (0, firestore_1.getDocs)(q);
        console.log(`Success! Found ${snapshot.size} documents.`);
    }
    catch (error) {
        console.error('Query failed:', error);
    }
}
testQuery();
