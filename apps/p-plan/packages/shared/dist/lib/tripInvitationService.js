"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinTripByToken = exports.getTripByInviteToken = exports.getOrCreateInviteToken = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const userService_1 = require("./userService");
const TRIPS_COLLECTION = 'trips';
/**
 * 여행에 대한 고유 초대 토큰을 생성하거나 반환
 */
const getOrCreateInviteToken = async (tripId) => {
    try {
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, tripId);
        const tripSnap = await (0, firestore_1.getDoc)(tripRef);
        if (!tripSnap.exists())
            throw new Error("Trip not found");
        const data = tripSnap.data();
        if (data.inviteToken)
            return data.inviteToken;
        // 새로운 8자리 랜덤 토큰 생성
        const newToken = Math.random().toString(36).substring(2, 10).toUpperCase();
        await (0, firestore_1.updateDoc)(tripRef, { inviteToken: newToken });
        return newToken;
    }
    catch (error) {
        console.error("Error getting/creating invite token:", error);
        throw error;
    }
};
exports.getOrCreateInviteToken = getOrCreateInviteToken;
/**
 * 초대 토큰으로 여행 정보를 조회
 */
const getTripByInviteToken = async (token) => {
    try {
        const tripsRef = (0, firestore_1.collection)(firebase_1.db, TRIPS_COLLECTION);
        const q = (0, firestore_1.query)(tripsRef, (0, firestore_1.where)("inviteToken", "==", token.toUpperCase()), (0, firestore_1.limit)(1));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (querySnapshot.empty)
            return null;
        const docSnap = querySnapshot.docs[0];
        return { id: docSnap.id, ...docSnap.data() };
    }
    catch (error) {
        console.error("Error getting trip by invite token:", error);
        return null;
    }
};
exports.getTripByInviteToken = getTripByInviteToken;
/**
 * 초대 링크를 통해 여행에 멤버로 가입
 */
const joinTripByToken = async (token, userId) => {
    try {
        const trip = await (0, exports.getTripByInviteToken)(token);
        if (!trip)
            return null;
        // 이미 참여 중인지 확인
        if (trip.participants.some(p => p.id === userId) || trip.userId === userId) {
            return trip.id;
        }
        // 실제 사용자 프로필 정보 가져오기
        const userProfile = await (0, userService_1.getUserProfile)(userId);
        const userName = userProfile?.displayName || "초대된 멤버";
        const userPhotoURL = userProfile?.photoURL || "";
        const tripRef = (0, firestore_1.doc)(firebase_1.db, TRIPS_COLLECTION, trip.id);
        await (0, firestore_1.updateDoc)(tripRef, {
            participants: (0, firestore_1.arrayUnion)({
                id: userId,
                name: userName,
                photoURL: userPhotoURL,
                role: 'group member',
                status: 'accepted'
            })
        });
        return trip.id;
    }
    catch (error) {
        console.error("Error joining trip by token:", error);
        return null;
    }
};
exports.joinTripByToken = joinTripByToken;
