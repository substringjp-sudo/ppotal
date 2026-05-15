// @ts-nocheck
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { calculateTravelStats } from './src/lib/shared/statsCalculator';

// Firebase Admin 초기화 (로컬 환경 변수 GOOGLE_APPLICATION_CREDENTIALS 참조)
if (admin.apps.length === 0) {
    admin.initializeApp({
        projectId: 'substringjp-sudo'
    });
}

const db = getFirestore();

async function runRecalc(uid: string) {
    console.log(`[RECALC] UID: ${uid} 에 대한 분석을 시작합니다...`);
    
    try {
        const [tripsSnap, travelogsSnap, wishlistSnap] = await Promise.all([
            db.collection("trips").where("ownerId", "==", uid).get(),
            db.collection("travelogs").where("ownerId", "==", uid).get(),
            db.collection("wishlist").where("ownerId", "==", uid).get()
        ]);

        console.log(`[DATA] Trips: ${tripsSnap.size}, Travelogs: ${travelogsSnap.size}, Wishlist: ${wishlistSnap.size}`);

        const trips = tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const travelogs = travelogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        const wishlist = wishlistSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        const stats = calculateTravelStats(trips, undefined, wishlist, travelogs);
        
        console.log(`[STATS] 계산 완료: ${JSON.stringify(stats.summary)}`);

        // Firestore 업데이트
        await db.collection("users").doc(uid).update({
            "metadata.travelStats": stats,
            "metadata.travelStatsUpdatedAt": FieldValue.serverTimestamp()
        });

        console.log(`[SUCCESS] 사용자 문서 업데이트 완료!`);
    } catch (error) {
        console.error(`[ERROR] 분석 중 오류 발생:`, error);
    }
}

const targetUid = process.argv[2] || 'eneYuPyCdOTtSzCggJ5aVFb60rB2';
runRecalc(targetUid).then(() => {
    console.log('[FINISH] 작업 종료');
    process.exit(0);
});
