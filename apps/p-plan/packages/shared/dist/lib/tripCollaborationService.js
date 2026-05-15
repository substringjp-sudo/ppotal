"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserRecentActivities = exports.getTripActivities = exports.logTripActivity = exports.acceptTripInvite = exports.inviteFriendToTrip = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const notificationService_1 = require("./notificationService");
const TRIPS_COLLECTION = 'trips';
const ACTIVITIES_SUB = 'activities';
/**
 * 여행에 친구 초대
 */
const inviteFriendToTrip = async (tripId, tripTitle, inviterUid, inviterName, inviterPhotoURL, friendUid) => {
    try {
        // 알림 생성
        await (0, notificationService_1.createNotification)({
            type: 'trip_invite',
            targetUid: friendUid,
            senderUid: inviterUid,
            senderName: inviterName,
            senderPhotoURL: inviterPhotoURL,
            title: '여행 초대',
            message: `${inviterName}님이 '${tripTitle}' 여행에 초대하셨습니다.`,
            link: `/edit-trip/${tripId}?invite=true`,
            data: { tripId }
        });
        // 활동 로그 기록
        await (0, exports.logTripActivity)(tripId, {
            userId: inviterUid,
            userName: inviterName,
            userPhotoURL: inviterPhotoURL,
            action: 'invite',
            targetType: 'member',
            message: `${inviterName}님이 새로운 멤버를 초대했습니다.`
        });
    }
    catch (error) {
        console.error("Error inviting friend to trip:", error);
        throw error;
    }
};
exports.inviteFriendToTrip = inviteFriendToTrip;
/**
 * 초대 수락 및 멤버 추가
 */
const acceptTripInvite = async (tripId, userId, userName, userPhotoURL) => {
    try {
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId);
        const newParticipant = {
            id: userId,
            name: userName,
            avatarUrl: userPhotoURL,
            role: 'group member',
            status: 'accepted'
        };
        // members (UID array)와 participants (Object array) 동시 업데이트
        await (0, firestore_1.updateDoc)(tripRef, {
            members: (0, firestore_1.arrayUnion)(userId),
            participants: (0, firestore_1.arrayUnion)(newParticipant),
            updatedAt: new Date().toISOString()
        });
        // 활동 로그
        await (0, exports.logTripActivity)(tripId, {
            userId,
            userName,
            userPhotoURL,
            action: 'join',
            targetType: 'member',
            message: `${userName}님이 여행에 참여했습니다.`
        });
    }
    catch (error) {
        console.error("Error accepting trip invite:", error);
        throw error;
    }
};
exports.acceptTripInvite = acceptTripInvite;
/**
 * 여행 활동 로그 기록
 */
const logTripActivity = async (tripId, activity) => {
    try {
        const activitiesRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, ACTIVITIES_SUB);
        await (0, firestore_1.addDoc)(activitiesRef, {
            ...activity,
            createdAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error logging trip activity:", error);
    }
};
exports.logTripActivity = logTripActivity;
/**
 * 여행 활동 로그 조회
 */
const getTripActivities = async (tripId, limitCount = 20) => {
    try {
        const activitiesRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION, tripId, ACTIVITIES_SUB);
        const q = (0, firestore_1.query)(activitiesRef, (0, firestore_1.orderBy)("createdAt", "desc"), (0, firestore_1.limit)(limitCount));
        const snapshot = await (0, firestore_1.getDocs)(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    catch (error) {
        console.error("Error getting trip activities:", error);
        return [];
    }
};
exports.getTripActivities = getTripActivities;
/**
 * 사용자가 참여 중인 모든 여행의 최근 활동 로그 통합 조회
 */
const getUserRecentActivities = async (trips, limitCount = 5) => {
    try {
        if (!trips || trips.length === 0)
            return [];
        const activitiesPromises = trips.map(t => (0, exports.getTripActivities)(t.id, limitCount));
        const results = await Promise.all(activitiesPromises);
        // 모든 여행의 로그를 하나로 합침
        const allActivities = results.flat();
        // 시간순 정렬 (최신순)
        return allActivities
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limitCount);
    }
    catch (error) {
        console.error("Error getting consolidated user activities:", error);
        return [];
    }
};
exports.getUserRecentActivities = getUserRecentActivities;
