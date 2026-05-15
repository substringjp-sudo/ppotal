"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReceivedRequests = exports.getFriendList = exports.getFriendship = exports.deleteFriendship = exports.acceptFriendRequest = exports.sendFriendRequest = void 0;
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const FRIENDSHIPS_COLLECTION = 'friendships';
/**
 * 친구 요청 보내기
 */
const sendFriendRequest = async (initiatorUid, receiverUid) => {
    if (initiatorUid === receiverUid)
        throw new Error("자신에게 친구 요청을 보낼 수 없습니다.");
    try {
        // 이미 관계가 있는지 확인
        const existing = await (0, exports.getFriendship)(initiatorUid, receiverUid);
        if (existing) {
            if (existing.status === 'accepted')
                throw new Error("이미 친구 관계입니다.");
            if (existing.status === 'pending')
                throw new Error("이미 대기 중인 요청이 있습니다.");
            // 거절된 경우 등은 재요청 가능하게 하거나 업데이트 로직 필요
            if (existing.status === 'declined') {
                await (0, firestore_1.updateDoc)((0, firestore_1.doc)(firebase_1.db, FRIENDSHIPS_COLLECTION, existing.id), {
                    status: 'pending',
                    initiatorUid: initiatorUid,
                    receiverUid: receiverUid,
                    updatedAt: new Date().toISOString()
                });
                return;
            }
        }
        const newFriendship = {
            uids: [initiatorUid, receiverUid].sort(),
            initiatorUid,
            receiverUid,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, FRIENDSHIPS_COLLECTION), newFriendship);
    }
    catch (error) {
        console.error("Error sending friend request:", error);
        throw error;
    }
};
exports.sendFriendRequest = sendFriendRequest;
/**
 * 친구 요청 수락
 */
const acceptFriendRequest = async (friendshipId) => {
    try {
        const friendshipRef = (0, firestore_1.doc)(firebase_1.db, FRIENDSHIPS_COLLECTION, friendshipId);
        await (0, firestore_1.updateDoc)(friendshipRef, {
            status: 'accepted',
            updatedAt: new Date().toISOString()
        });
    }
    catch (error) {
        console.error("Error accepting friend request:", error);
        throw error;
    }
};
exports.acceptFriendRequest = acceptFriendRequest;
/**
 * 친구 요청 거절 또는 친구 삭제
 */
const deleteFriendship = async (friendshipId) => {
    try {
        const friendshipRef = (0, firestore_1.doc)(firebase_1.db, FRIENDSHIPS_COLLECTION, friendshipId);
        await (0, firestore_1.deleteDoc)(friendshipRef);
    }
    catch (error) {
        console.error("Error deleting friendship:", error);
        throw error;
    }
};
exports.deleteFriendship = deleteFriendship;
/**
 * 특정 사용자와의 친구 관계 조회
 */
const getFriendship = async (uid1, uid2) => {
    try {
        const friendshipsRef = (0, firestore_1.collection)(firebase_1.db, FRIENDSHIPS_COLLECTION);
        const uids = [uid1, uid2].sort();
        const q = (0, firestore_1.query)(friendshipsRef, (0, firestore_1.where)("uids", "==", uids));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        if (querySnapshot.empty)
            return null;
        const d = querySnapshot.docs[0];
        return { id: d.id, ...d.data() };
    }
    catch (error) {
        console.error("Error getting friendship:", error);
        return null;
    }
};
exports.getFriendship = getFriendship;
/**
 * 내 친구 목록 조회 (수락된 상태)
 */
const getFriendList = async (userId) => {
    try {
        const friendshipsRef = (0, firestore_1.collection)(firebase_1.db, FRIENDSHIPS_COLLECTION);
        const q = (0, firestore_1.query)(friendshipsRef, (0, firestore_1.where)("uids", "array-contains", userId), (0, firestore_1.where)("status", "==", "accepted"));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    catch (error) {
        console.error("Error getting friend list:", error);
        return [];
    }
};
exports.getFriendList = getFriendList;
/**
 * 받은 친구 요청 목록 조회
 */
const getReceivedRequests = async (userId) => {
    try {
        const friendshipsRef = (0, firestore_1.collection)(firebase_1.db, FRIENDSHIPS_COLLECTION);
        const q = (0, firestore_1.query)(friendshipsRef, (0, firestore_1.where)("uids", "array-contains", userId), (0, firestore_1.where)("receiverUid", "==", userId), (0, firestore_1.where)("status", "==", "pending"));
        const querySnapshot = await (0, firestore_1.getDocs)(q);
        return querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }
    catch (error) {
        console.error("Error getting received requests:", error);
        return [];
    }
};
exports.getReceivedRequests = getReceivedRequests;
