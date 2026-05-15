import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'jprail'
    });
}

const db = admin.firestore();

export { db };
